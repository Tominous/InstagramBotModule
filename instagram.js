/**
 * Starts checking Andi's Instagram account for new posts and send them to the Discord.
 * @param {*} client A client created with 'new Discord.Client()' from the Discord.js library.
 */
function startInstagramChecking (client)
{
	const channelId = '';

	const lastInstagramPostFileName = 'lastInstagramPost.txt';
	const instagramUrl = 'https://www.instagram.com/';
	const instagramPostUrl = 'https://www.instagram.com/p/';

	const fs = require('fs');
	const request = require('request');

	var lastInstagramPost = '';

	fs.readFile(lastInstagramPostFileName, function (err, data)
		{
			lastInstagramPost = data;
			
			setInterval(checkInstagram, 300000); //Check every five minutes.
			checkInstagram();
		}
	);

	function checkInstagram ()
	{
		request(instagramUrl, function (error, response, body)
			{
				if (error)
					console.log(error);
				else
				{
					let startIndex = body.indexOf('window._sharedData = ') + 21;
					let endIndex = body.indexOf('window.__initialDataLoaded(window._sharedData);'); //First unique value after the full JSON.

					let data = body.substr(0, endIndex).substr(startIndex);
					let lastPositionAfterBracket = data.length - 1;

					//We have to go backwards to find the end of the JSON (a closing bracket) because the first unique value is anywhere near behind the JSON.
					while ((data.charAt(lastPositionAfterBracket) != '}') && (lastPositionAfterBracket > 0))
						lastPositionAfterBracket--;

					if (lastPositionAfterBracket <= 0)
						console.log('No data was given back from Instagram or a parsing error.');
					else
					{
						data = data.substr(0, lastPositionAfterBracket + 1);

						data = JSON.parse(data);

						data = data.entry_data.ProfilePage[0].graphql.user.edge_owner_to_timeline_media.edges;

						let postsToSend = []; //Array to hold prepared posts so we can send them in the correct order after going through all new Instagram posts.

						for (i = 0; i < data.length; i++)
						{
							let node = data[i].node;

							if (node.shortcode == lastInstagramPost)
								break;

							let link = instagramPostUrl + node.shortcode;
							let text = '@everyone' + "\r\n\r\n" + node.edge_media_to_caption.edges[0].node.text + "\r\n\r\n" + link;

							postsToSend.push(text);
						}

						for (i = postsToSend.length - 1; i >= 0; i--) //Backwards for the correct order from old to new.
							client.channels.get(channelId).send(postsToSend[i]).catch(() => {});

						//When there was a new post, store the newest post ID on the harddrive.
						if (postsToSend.length > 0)
						{
							lastInstagramPost = data[0].node.shortcode;

							fs.writeFile(lastInstagramPostFileName, lastInstagramPost, () => {});
						}
					}
				}
			}
		);
	}
}
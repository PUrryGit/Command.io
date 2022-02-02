var Discord = require('discord.js');
var http = require('http');
var logger = require('winston');
var auth = require('./auth.json');

// DiscordJS Documentation: https://discord.js.org/#/docs/main/stable/general/welcome

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
const client = new Discord.Client();

var isReady = true;
var trackQueue = [];
var currentConnectedChannel = null;
var channelConnection = null;
var voiceDispatcher = null;
var currentTrack = null;
var currentPlaceInQueue = 0;
var isLoopingSong = false;
var isLoopingQueue = false;
var currentVolume = 0.03;

client.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(client.user.username + ' - (' + client.user.id + ')');
	
	// For reference: https://nodejs.org/en/knowledge/HTTP/clients/how-to-create-a-HTTP-request/
	// https://nodejs.org/api/http.html
});

client.on('message', message => {
	try {
		// The previous command has locked the bot and hasn't finished executing
		if (!isReady)
			return;
		
		// It's good practice to ignore other bots. This also makes your bot ignore itself
		// and not get into a spam loop (we call that "botception").
		if (message.author.bot)
			return;
		
		// Also good practice to ignore any message that does not start with our prefix
		if (!message.content.startsWith('!'))
			return;
		
		// Here we separate our "command" name, and our "arguments" for the command. 
		// e.g. if we have the message "+say Is this the real life?" , we'll get the following:
		// command = say
		// args = ["Is", "this", "the", "real", "life?"]
		const args = message.content.slice(1).trim().split(/ +/g);
		const command = args.shift().toLowerCase();
		logger.info(command)
		
		// CORE BOT FUNCTIONS
		// Join the voice channel of the message sender
		if (command === 'join') {
			isReady = false;
			if (message.member.voice.channel) {
				message.member.voice.channel.join()
				.then(connection => {
					// Keep track of the current channel
					currentConnectedChannel = message.member.voice.channel;
					channelConnection = connection;
					logger.info('Connected!')
					isReady = true;
				})
				.catch(error => {
					logger.info('Failed to connect')
					isReady = true;
				})
			} else {
				message.channel.send('Join a channel first, 4head!');
			}
		}
		
		// Leave the current voice channel and set some defaults
		if (command === 'disconnect' || command === 'leave') {
			isReady = false;
			if (currentConnectedChannel) {
				currentConnectedChannel.leave();
				currentConnectedChannel = null;
				channelConnection = null;
				voiceDispatcher = null;
				currentTrack = null;
				isLooping = false;
			} else {
				message.channel.send('No channel to leave!');
			}
			isReady = true;
		}
		
		// STREAM DISPATCHER FUNCTIONS
		// Pause the StreamDispatcher
		if (command === 'pause') {
			isReady = false;
			if (voiceDispatcher) {
				voiceDispatcher.pause()
			}
			isReady = true;
		}
		
		// Resume the StreamDispatcher
		if (command === 'resume') {
			isReady = false;
			if (voiceDispatcher) {
				voiceDispatcher.resume()
			}
			isReady = true;
		}
		
		// Go to the next track in the queue
		if (command === 'next') {
			isReady = false;
			if (voiceDispatcher) {
				if (trackQueue.length > 1) {
					voiceDispatcher.pause()
					nextInQueue();
				}
			}
			isReady = true;
		}
		
		// Set the volume to given floating point number
		if (command === 'volume') {
			isReady = false;
			if (voiceDispatcher) {
				if (args.length > 0) {
					if (isFloat(parseFloat(args[0]))) {
						currentVolume = parseFloat(args[0]);
						voiceDispatcher.setVolume(currentVolume);
						message.channel.send('Set volume to: ' + (100 * currentVolume) + '%');
					} else {
						message.channel.send('Not a valid float!');
					}
				} else {
					message.channel.send('No volume given!');
				}
			} else {
				message.channel.send('No stream to change volume of!');
			}
			isReady = true
		}
		
		// Set the volume to 10%
		if (command === 'volume10') {
			isReady = false;
			if (voiceDispatcher) {
				currentVolume = 0.10;
				voiceDispatcher.setVolume(currentVolume);
				message.channel.send('Set volume to: 10%');
			} else {
				message.channel.send('No stream to change volume of!');
			}
			isReady = true;
		}
		
		// Set the volume to 20%
		if (command === 'volume20') {
			isReady = false;
			if (voiceDispatcher) {
				currentVolume = 0.20;
				voiceDispatcher.setVolume(currentVolume);
				message.channel.send('Set volume to: 20%');
			} else {
				message.channel.send('No stream to change volume of!');
			}
			isReady = true;
		}
		
		// Set the volume to 30%
		if (command === 'volume30') {
			isReady = false;
			if (voiceDispatcher) {
				currentVolume = 0.30;
				voiceDispatcher.setVolume(currentVolume);
				message.channel.send('Set volume to: 30%');
			} else {
				message.channel.send('No stream to change volume of!');
			}
			isReady = true;
		}
		
		// Set the volume to 40%
		if (command === 'volume40') {
			isReady = false;
			if (voiceDispatcher) {
				currentVolume = 0.40;
				voiceDispatcher.setVolume(currentVolume);
				message.channel.send('Set volume to: 40%');
			} else {
				message.channel.send('No stream to change volume of!');
			}
			isReady = true;
		}
		
		// Set the volume to 50%
		if (command === 'volume50') {
			isReady = false;
			if (voiceDispatcher) {
				currentVolume = 0.50;
				voiceDispatcher.setVolume(currentVolume);
				message.channel.send('Set volume to: 50%');
			} else {
				message.channel.send('No stream to change volume of!');
			}
			isReady = true;
		}
		
		// Loop the currently playing track / End the looping track
		if (command === 'loopsong') {
			isReady = false;
			if (voiceDispatcher && !isLoopingSong) {
				// Remove the queue listener and clear the queue
				trackQueue = [];
				voiceDispatcher.removeListener('finish', nextInQueue);
				// Give the dispatcher a listener that loops
				voiceDispatcher.on('finish', loopSong);
				message.channel.send('Now looping: ' + currentTrack);
				isLoopingSong = true;
			} else if (voiceDispatcher && isLoopingSong) {
				// Remove the listener, so the song will end
				voiceDispatcher.removeListener('finish', loopSong);
				message.channel.send('No longer looping: ' + currentTrack);
				// No need to add back the other listener
				isLoopingSong = false
			}
			isReady = true;
		}
		
		// Loop the currently playing queue / End the looping queue
		if (command === 'loopplaylist') {
			isReady = false;
			if (voiceDispatcher && !isLoopingQueue) {
				// Set the flag to loop the queue
				message.channel.send('Now looping the playlist!');
				isLoopingQueue = true;
			} else if (voiceDispatcher && isLoopingQueue) {
				// Reset the flag to let the queue end
				message.channel.send('No longer looping the playlist!');
				isLoopingQueue = false
			}
			isReady = true;
		}
		
		// Play a given track / add a track to the queue
		// NOTE: Will not play tracks with quotation marks in the middle of the given title.
		//		 To play a track in a SUBFOLDER:
		//
		//		 !play "Sub Folder/track name in files.mp3"
		//
		if (command === 'play') {
			logger.info(args)
			isReady = false;
			if (args.length > 0) {
				let track = args[0];
				// Check if this is a nested filepath with quotations
				if (args[0].search('"') !== -1) {
					// Build the full filepath
					let filePath = '';
					args.forEach(
						(arg) => {
							let quoteIdx = arg.search('"');
							if (quoteIdx == 0) {
								// Remove the first quotation mark
								let fixedArg = arg.substring(quoteIdx + 1) + ' ';
								filePath += fixedArg;
							} else if (quoteIdx !== -1) {
								// Remove the last quotation mark
								let fixedArg = arg.slice(0, -1);
								filePath += fixedArg;
							} else {
								// Add anything inbetween
								filePath += arg + ' ';
							}
						})
						track = filePath;
				}
				playTrack('./' + track, message);
			} else {
				message.channel.send('No track given!');
			}
			isReady = true;
		}
	} catch (ex) {
		logger.info(ex.message)
	}
});

function playTrack(trackTitle, message) {
	if (channelConnection) {
		// Add the new track to the queue
		if (trackQueue.length === 0) {
			// Play the track now
			trackQueue.push(trackTitle);
			currentTrack = trackTitle
			logger.info(currentTrack);
			voiceDispatcher = channelConnection.play(currentTrack)
			voiceDispatcher.setVolume(currentVolume);
			currentPlaceInQueue = 0;
			// Add the queue callback
			voiceDispatcher.on('finish', nextInQueue);
			message.channel.send('Now Playing: ' + currentTrack);
		} else {
			// Add it to the queue to be played later
			trackQueue.push(trackTitle);
			message.channel.send('Added to the queue: ' + trackTitle);
		}
	}
}

function loopSong() {
	voiceDispatcher = channelConnection.play(currentTrack);
	// Reset the volume to 10%
	voiceDispatcher.setVolume(currentVolume);
	// Add the new on finish listener for looping
	voiceDispatcher.on('finish', loopSong);
	logger.info('Playing looped file');
}

function nextInQueue() {
	// Move to the next track in the queue
	currentPlaceInQueue += 1;
		
	// Check if we are looping and at the end of the queue
	if (isLoopingQueue && currentPlaceInQueue == trackQueue.length) {
		// Go to the front of the queue using the original block of code
		currentPlaceInQueue = 0;
		logger.info('Reset queue: ' + currentPlaceInQueue);
	}
		
	if (currentPlaceInQueue != trackQueue.length) {
		logger.info('Current queue position: ' + currentPlaceInQueue);
		nextTrack = trackQueue[currentPlaceInQueue];
		logger.info('Next track: ' + nextTrack);
		voiceDispatcher = channelConnection.play(nextTrack);
		currentTrack = nextTrack
		
		client.channels.fetch(client.user.lastMessageChannelID)
			.then(channel => {
				channel.send('Now Playing: ' + currentTrack);
		})
		
		// Reset the volume to the current volume
		voiceDispatcher.setVolume(currentVolume);
		// Add the new on finish listener to keep playing through the queue
		voiceDispatcher.on('finish', nextInQueue);
		logger.info('Playing next file');
	} else {
		// We aren't looped and hit the end of the queue, so reset the queue so newly added songs get started
		trackQueue = [];
	}
}

function isFloat(n){
    return Number(n) === n && n % 1 !== 0;
}

client.login(auth.token);
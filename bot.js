// Required Setup
// DiscordJS Documentation: https://discord.js.org/#/docs/main/stable/general/welcome
var Discord = require('discord.js');
var http = require('http');
var logger = require('winston');
var auth = require('./auth.json');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';

// Initialize Discord Bot with a new Client object
const client = new Discord.Client();

// For future reference:
// https://nodejs.org/en/knowledge/HTTP/clients/how-to-create-a-HTTP-request/
// https://nodejs.org/api/http.html

// Global Vars
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
/* 
	NOTE: The bot defaults to 3% volume on startup. I find this to be a good volume for the bot, as the volume can be EXTREMELY loud.
	This does not handle the Discord UI's volume for the bot.
	Individual listeners can set the bot to their preferred volume in the UI by right clicking the bot's name in the voice channel.
*/

// Log some info on initialization
client.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(client.user.username + ' - (' + client.user.id + ')');
});

// Our main driver, the on message handler that filters all commands
client.on('message', message => {
	try {
		// The previous command has locked the bot and hasn't finished executing
		if (!isReady)
			return;
		
		// Ignore other bot messages
		if (message.author.bot)
			return;
		
		// Ignore any message without the given prefix for our commands
		if (!message.content.startsWith('!'))
			return;
		
		// We have a valid command, separate out any arguments into individual array elements
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
				message.channel.send('Join a voice channel first, 4head!');
			}
		}
		
		// Leave the current voice channel and reset some defaults
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
			
			// Reset the bot presence
			setBotPresence();
			isReady = true;
		}
		
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
				nextInQueue();
			}
			isReady = true;
		}
		
		// Set the flag for looping the current song, and replace the current on finish listener
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
				voiceDispatcher.on('finish', nextInQueue);
				message.channel.send('No longer looping: ' + currentTrack);
				isLoopingSong = false
			}
			isReady = true;
		}
		
		// Set the flag for looping the current queue
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
		
		/*
			Play a given track / add a track to the queue
			NOTE: Will not play tracks with quotation marks in the middle of the given title.
				  To play a track in a SUBFOLDER:
				  
				  !play "Sub Folder/track name in files.mp3"
		*/
		if (command === 'play') {
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
				// Play it or add it to the queue
				playOrAddTrack('./' + track, message);
			} else {
				message.channel.send('No track given!');
			}
			isReady = true;
		}
		
		// Set the volume to given floating point number
		// WARNING: This audio stream can be EXTREMELY loud. I advise not setting this above 10%, personally.
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
		
		// VOLUME SHORTCUTS
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
	} catch (ex) {
		logger.info(ex.message)
	}
});

/*
	Name: playOrAddTrack
	Description: If nothing is currently playing, plays the given file.
				 Otherwise, add the given file to the queue to be played after.
	Params: 
		trackTitle: string, the fully qualified location of the given track to be played
		message: object, the given message object from Discord
*/
function playOrAddTrack(trackTitle, message) {
	if (channelConnection) {
		// Determine if we are already have a queue
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
			
			// Set the bot activity to just the file name
			let fileName = /[^\\]*$/.exec(currentTrack)[0];
			setBotPresence("PLAYING", fileName);
		} else {
			// Add it to the queue to be played later
			trackQueue.push(trackTitle);
			message.channel.send('Added to the queue: ' + trackTitle);
		}
	}
}

/*
	Name: loopSong
	Description: Replace the current on finish event to loop the current song.
*/
function loopSong() {
	voiceDispatcher = channelConnection.play(currentTrack);
	// Reset the volume
	voiceDispatcher.setVolume(currentVolume);
	// Add the new on finish listener for looping
	voiceDispatcher.on('finish', loopSong);
	logger.info('Playing looped file.');
}

/*
	Name: nextInQueue
	Description: Moves the needle to the next track in queue.
				 If we are looping the queue, this handles resetting to the first track.
				 If we aren't looping the queue, this handles resetting it once the queue reaches the end.
*/
function nextInQueue() {
	// Move to the next track in the queue
	currentPlaceInQueue += 1;
		
	// Check if we are looping and at the end of the queue
	if (isLoopingQueue && currentPlaceInQueue == trackQueue.length) {
		// Go to the front of the queue using the original block of code
		currentPlaceInQueue = 0;
		logger.info('Loop the queue.');
	}
		
	if (currentPlaceInQueue != trackQueue.length) {
		nextTrack = trackQueue[currentPlaceInQueue];
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
		logger.info('Playing next file.');
		
		// Set the bot activity to just the file name
		let fileName = /[^\\]*$/.exec(currentTrack)[0];
		setBotPresence("PLAYING", fileName);
	} else {
		// We aren't looped and hit the end of the queue, so reset the queue so newly added songs get started
		trackQueue = [];
		setBotPresence();
	}
}

/*
	Name: setBotPresence
	Description: Set the bot's visual presence in Discord.
				The two options are:
					Do Not Disturb, PLAYING - fileName
					Available, no activity
	
	Params: 
		activityType: string, default null, the activity type
		fileName: string, default "", the separated file name and file type
*/
function setBotPresence(activityType = null, fileName = "") {
	// Setup activity and status info
	let statusType = fileName ? "dnd" : "online";
	let activityName = fileName ? fileName : "";
	
	client.user.setPresence({
        activity: {
			type: activityType,
            name: activityName
        },
		status: statusType
    });
}

/*
	Name: isFloat
	Description: Determines if a valid float was given.
				 Used for determining custom volumes.
	
	Params: 
		n: Number, the value to test
*/
function isFloat(n){
    return Number(n) === n && n % 1 !== 0;
}

// Start the bot by authorizing it with the token saved in auth
client.login(auth.token);
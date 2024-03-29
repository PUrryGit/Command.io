const { Client, GuildMember, GatewayIntentBits, ApplicationCommandOptionType, Events, ActivityType   } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, getVoiceConnection, NoSubscriberBehavior, AudioPlayerStatus } = require('@discordjs/voice');
const auth = require("./auth.json");

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildVoiceStates,
		GatewayIntentBits.GuildPresences,
		GatewayIntentBits.MessageContent
	]
});

var queue = [];
var currentSong = null;
var replyChannel = null;
let player = null;
let voiceConnection = null;
let volume = 0.10;
let loopSong = false;
let loopList = false;

/*
	Command.io TODO LIST:
		- [DONE - 03/13/24] Upgrade again to DiscordJS 14
		- [DONE - 03/13/24] Fix the bots Presence to show whats currently playing
		- Add ability to give a folder and play all tracks in that folder
		- Add Status command to display flags
		- Add Summon Demon command to summon lesser demons from DND 5e
		- Add Shuffle command to randomly select next song from playlist
		- [DONE - 03/13/24] Add Leave command to send the bot out of the voice channel
*/

client.login(auth.token);

client.once('ready', () => {
 console.log('Ready!');
});

client.on("error", console.error);
client.on("warn", console.warn);

client.on("messageCreate", async (message) => {
	if (message.author.bot || !message.guild) return;
    if (!client.application?.owner) await client.application?.fetch();
	
	if (message.content === "!deploy" && message.author.id === client.application?.owner?.id) {
		await message.guild.commands.set([
			{
                name: "play",
                description: "Plays a given song",
                options: [
                    {
                        name: "query",
                        type: ApplicationCommandOptionType.String,
                        description: "The song you want to play",
                        required: true
                    }
                ]
            },
            {
                name: "queue",
                description: "See the playlist"
            },
			{
                name: "pause",
                description: "Pause the player"
            },
			{
                name: "unpause",
                description: "Unpause the player"
            },
			{
                name: "next",
                description: "Skip to the next song in the playlist"
            },
			{
                name: "loopsong",
                description: "Loop the current playing song"
            },
			{
                name: "looplist",
                description: "Loop the current playlist"
            },
			{
				name: "roll",
				aliases: ["r"],
				description: "Roll a set number of dice",
				options: [
                    {
                        name: "dice",
                        type: ApplicationCommandOptionType.String,
                        description: "The amount and size of dice you want to roll: 1d4",
                        required: true
                    }
                ]
			},
			{
                name: "rd4",
                description: "Roll 1d4 dice"
            },
			{
                name: "rd6",
                description: "Roll 1d6 dice"
            },
			{
                name: "rd8",
                description: "Roll 1d8 dice"
            },
			{
                name: "rd10",
                description: "Roll 1d10 dice"
            },
			{
                name: "rd12",
                description: "Roll 1d12 dice"
            },
			{
                name: "rd20",
                description: "Roll 1d20 dice"
            },
			{
                name: "rd100",
                description: "Roll 1d100 dice"
            }
		]);
		
		await message.reply("Deployed!");
	}
	
	if (message.content === "!join" && message.author.id === client.application?.owner?.id) {
		replyChannel = client.channels.cache.get(message.channelId);
		
		const connection = joinVoiceChannel({
            channelId: message.member.voice.channelId,
            guildId: message.guildId,
            adapterCreator: message.guild.voiceAdapterCreator
        })
		
		player = createAudioPlayer({
			behaviors: {
				noSubscriber: NoSubscriberBehavior.Pause,
			},
		});
		
		player.on(AudioPlayerStatus.Idle, () => {
			playNextSong();
		});
		
		player.on('error', error => {
			console.error(`Error: ${error.message} with resource ${error.resource.metadata.title}`);
		});
		
		connection.subscribe(player);
		voiceConnection = connection;
	}
	
	if (message.content === "!leave" && message.author.id === client.application?.owner?.id) {
		voiceConnection.disconnect();
		
		let connectedVoiceAdapter = client.voice.adapters.get(message.guild.id)
		connectedVoiceAdapter.destroy();
	}
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand() || !interaction.guildId) return;

    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
        return void interaction.reply({ content: "You are not in a voice channel!", ephemeral: true });
    }

    if (interaction.guild.members.me.voice.channelId && interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId) {
        return void interaction.reply({ content: "You are not in my voice channel!", ephemeral: true });
    }
	
	if (interaction.commandName === "play") {
		await interaction.deferReply();
		
		const query = interaction.options.get("query").value;
		
		if (loopSong) {
			loopSong = !loopSong;
		}
		queue.push(query);
		
		if (currentSong === null) {
			currentSong = query;
			
			let resource = createAudioResource(query, { inlineVolume: true });
			resource.volume.setVolume(volume);
			playSong(resource);
		}
		
		return void interaction.followUp({ content: `Added ${query} to the playlist!`, ephemeral: true });
	}
	
	if (interaction.commandName === 'pause') {
		await interaction.deferReply();
		player.pause();
		client.user.setPresence({ activity: null });
		return void interaction.followUp({ content: 'Paused music.', ephemeral: true });
	}
	
	if (interaction.commandName === 'unpause') {
		await interaction.deferReply();
		player.unpause();
		setBotPresence();
		return void interaction.followUp({ content: 'Resuming music.', ephemeral: true });
	}
	
	if (interaction.commandName === 'next') {
		await interaction.deferReply();
		
		playNextSong();
		return void interaction.followUp({ content: 'Moving to next song.', ephemeral: true });
	}
	
	if (interaction.commandName === 'loopsong') {
		await interaction.deferReply();
		
		if (!currentSong) {
			return void interaction.followUp({ content: 'No song playing!', ephemeral: true })
		}
		
		let followUpContent = null;
		loopSong = !loopSong;
		if (loopSong) {
			loopList = false;
			queue = [currentSong];
			
			followUpContent = { content: `Now looping: ${currentSong}`, ephemeral: true }
		} else {
			followUpContent = { content: 'No longer looping current song.', ephemeral: true }
		}
		
		return void interaction.followUp(followUpContent);
	}
	
	if (interaction.commandName === 'looplist') {
		await interaction.deferReply();
		
		let followUpContent = null;
		loopList = !loopList;
		if (loopList) {
			loopSong = false;
			followUpContent = { content: 'Now looping current playlist.', ephemeral: true }
		} else {
			followUpContent = { content: 'No longer looping current playlist.', ephemeral: true }
		}
		
		return void interaction.followUp(followUpContent);
	}
	
	if (interaction.commandName === 'shuffle') {
		await interaction.deferReply();
		
		let followUpMessage = null;
		followUpMessage = 'To be Implemented!'
		
		return void interaction.followUp(followUpMessage);
	}
	
	if (interaction.commandName === 'status') {
		await interaction.deferReply();
		
		let followUpMessage = null;
		followUpMessage = 'To be Implemented Aagin!'
		
		return void interaction.followUp(followUpMessage);
	}
	
	if (interaction.commandName === 'roll' || interaction.commandName === 'r') {
		await interaction.deferReply();
		
		const dice = interaction.options.get("dice").value;
		let followUpMessage = null;
		let argArr = dice.split('d');
		
		followUpMessage = handleRollCommand(argArr)
		
		return void interaction.followUp({ content: followUpMessage, ephemeral: true });
	}
	
	if (interaction.commandName === 'rd4') {
		await interaction.deferReply();
		
		let followUpMessage = null;
		let argArr = ['1', '4'];
		
		followUpMessage = handleRollCommand(argArr)
		
		return void interaction.followUp({ content: followUpMessage, ephemeral: true });
	}
	
	if (interaction.commandName === 'rd6') {
		await interaction.deferReply();
		
		let followUpMessage = null;
		let argArr = ['1', '6'];
		
		followUpMessage = handleRollCommand(argArr)
		
		return void interaction.followUp({ content: followUpMessage, ephemeral: true });
	}
	
	if (interaction.commandName === 'rd8') {
		await interaction.deferReply();
		
		let followUpMessage = null;
		let argArr = ['1', '8'];
		
		followUpMessage = handleRollCommand(argArr)
		
		return void interaction.followUp({ content: followUpMessage, ephemeral: true });
	}
	
	if (interaction.commandName === 'rd10') {
		await interaction.deferReply();
		
		let followUpMessage = null;
		let argArr = ['1', '10'];
		
		followUpMessage = handleRollCommand(argArr)
		
		return void interaction.followUp({ content: followUpMessage, ephemeral: true });
	}
	
	if (interaction.commandName === 'rd12') {
		await interaction.deferReply();
		
		let followUpMessage = null;
		let argArr = ['1', '12'];
		
		followUpMessage = handleRollCommand(argArr)
		
		return void interaction.followUp({ content: followUpMessage, ephemeral: true });
	}
	
	if (interaction.commandName === 'rd20') {
		await interaction.deferReply();
		
		let followUpMessage = null;
		let argArr = ['1', '20'];
		
		followUpMessage = handleRollCommand(argArr)
		
		return void interaction.followUp({ content: followUpMessage, ephemeral: true });
	}
	
	if (interaction.commandName === 'rd100') {
		await interaction.deferReply();
		
		let followUpMessage = null;
		let argArr = ['1', '100'];
		
		followUpMessage = handleRollCommand(argArr)
		
		return void interaction.followUp({ content: followUpMessage, ephemeral: true });
	}
	
	if (interaction.commandName === 'summondemon') {
		await interaction.deferReply();
		
		let followUpMessage = null;
		followUpMessage = 'To be Implemented Aagin!'
		
		return void interaction.followUp(followUpMessage);
	}
});

function handleRollCommand(diceArr) {
	let num = Number(diceArr[0]);
	let die = Number(diceArr[1]);
		
	if (Number.isInteger(num) && Number.isInteger(die)) {
		num = Math.abs(num);
		die = Math.abs(die);
		let tooMany = num > 100;
		let tooLarge = die > 1000;
					
		if (tooMany) {
			followUpMessage = 'Number of dice must be less than 100!';
		}
						
		if (tooLarge) {
			followUpMessage = 'Largest dice allowed is d1000!';
		}
						
		if (!tooMany && !tooLarge) {
			followUpMessage = rollDice(num, die);
		}
	}
	
	return followUpMessage;
}

function setBotPresence() {
	let songNameArr = currentSong.split("/");
	let prettySongName = songNameArr[songNameArr.length - 1];
	
	client.user.setPresence({
		activities: [{ name: prettySongName, type: ActivityType.Playing }],
		status: 'dnd',
	});
}

function playSong(resource) {
	player.play(resource);
	setBotPresence();
	replyChannel.send(`Now playing: ${currentSong}!`);
}

function playNextSong() {
	let nextSong = getNextSong()
	if (nextSong != null) {
		playSong(nextSong);
	}
}

function getNextSong() {
	let indexFn = (element) => element === currentSong;
	let songIdx = queue.findIndex(indexFn);
	let nextSongIdx = ++songIdx;
	
	let resource = null;
	
	if (nextSongIdx < queue.length) {
		currentSong = queue[nextSongIdx];
		
		resource = createAudioResource(currentSong, { inlineVolume: true });
		resource.volume.setVolume(volume);
	} else {
		if (loopList || loopSong) {
			currentSong = queue[0];
			
			resource = createAudioResource(currentSong, { inlineVolume: true });
			resource.volume.setVolume(volume);
		} else {
			currentSong = null;
		}
	}
	
	return resource;
}

/*
	Name: rollDice
	Description: Simulates a number of rolls for a die with a specified number of sides
	Params:
		num: number, number of dice to roll
		die: number, number of sides of the dice
		message: object, the DiscordJS message object
*/
function rollDice(num, die) {
	let total = 0;
	let totalArr = [];
					
	// Roll the dice!
	for (let i = 0; i < num; i++) {
		let numRolled = getRandomIntInclusive(1, die);
		total += numRolled;
		totalArr.push(numRolled);
	}
					
	// Print total rolled and individual rolls
	let rollMsg = '__Rolled :game_die: ' + num + 'd' + die + '__\nTotal: :crossed_swords:[ ' + total + ' ]:crossed_swords:\nDice Rolled: [ ';
	for (let i = 0; i < totalArr.length; i++) {
		if (totalArr[i] === 1) {
			rollMsg += ':small_red_triangle_down: __*' + totalArr[i] + '*__';
		} else if (totalArr[i] === die) {
			rollMsg += ':small_blue_diamond: __*' + totalArr[i] + '*__';
		} else {
			rollMsg += totalArr[i];
		}
						
		if (i !== totalArr.length - 1) {
			rollMsg += ' ,  ';
		} else {
			rollMsg += ' ';
		}
	}
					
	rollMsg += ']';
	return rollMsg;
}

/*
	Name: getRandomIntInclusive
	Description: Found in Mozilla JS docs, gets a random
				 integer between two values while being
				 inclusive at both ends.
	
	Params:
		min: The minimum value to be randomized, inclusive
		max: The maximum value to be randomized, inclusive
*/
function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

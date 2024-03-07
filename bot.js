const { Client, GuildMember, Intents } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior, AudioPlayerStatus } = require('@discordjs/voice');
const auth = require("./auth.json");

const client = new Client({
	intents: [
		Intents.FLAGS.GUILDS,
		Intents.FLAGS.GUILD_MEMBERS,
		Intents.FLAGS.GUILD_MESSAGES,
		Intents.FLAGS.GUILD_VOICE_STATES,
		Intents.FLAGS.GUILD_PRESENCES
	]
});

var queue = [];
var currentSong = null;
var replyChannel = null;
let player = null;
let volume = 0.10;
let loopSong = false;
let loopList = false;

/*
	Command.io TODO LIST:
		- Fix the bots Presence to show whats currently playing
		- Add ability to give a folder and play all tracks in that folder
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
                        type: "STRING",
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
				description: "Roll a set number of dice",
				options: [
                    {
                        name: "dice",
                        type: "STRING",
                        description: "The amount and size of dice you want to roll: 1d4",
                        required: true
                    }
                ]
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
		return void interaction.followUp({ content: 'Paused music.', ephemeral: true });
	}
	
	if (interaction.commandName === 'unpause') {
		await interaction.deferReply();
		player.unpause();
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
	
	if (interaction.commandName === 'roll') {
		await interaction.deferReply();
		
		const dice = interaction.options.get("dice").value;
		let followUpMessage = null;
		let argArr = dice.split('d');
		
		let num = Number(argArr[0]);
		let die = Number(argArr[1]);
		
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
		
		return void interaction.followUp({ content: followUpMessage, ephemeral: true });
	}
});

function playSong(resource) {
	player.play(resource);
		
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

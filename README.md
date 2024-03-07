# Command.io
A simple Discord bot, built using JavaScript and Node.js, to play local music files.

## Commands
### Deploy
`!deploy`

Adds all of the bot's new `/` commands to Discord so they are discoverable by typing `/` like built-in Discord commands.
### Join
`!join`

Tells Command.io bot to join the voice channel you are currently in.
### Play
`/play File.mp3`
`/play Folder\File.mp3`

This command takes in a file path to a file in the root location of bot.js. It will add a given file to the playlist, and start playing it if there is nothing else playing.
### Pause
`/pause`

Pauses the audio stream.
### Unpause
`/Unpause`

Resumes the audio stream.
### Next
`/next`

Moves the needle to the next song in the playlist and begins playing it.
### Loopsong
`/loopsong`

Sets a flag to loop the current song indefinitely.
### Loopplaylist
`/looplist`

Sets a flag to loop the current playlist indefinitely. The playlist can still be added to.
### Roll
`/roll 1d6`
`/r 12d4`
`/roll 100d1000`

Rolls a set number of dice with a given amount of sides. Formated as `!roll {NUM TO ROLL}d{SIDES OF DICE}`, and aliased with `!r`.
There is an upper limitation due to Discord message restrictions: a maximum of 100 dice can be rolled, and the largest die can have 1000 sides.
There are also some shortcuts aliased for specific dice you would typically see in a game of D&D:

`/rd4`
`/rd6`
`/rd8`
`/rd10`
`/rd12`
`/rd20`

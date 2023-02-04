# Command.io
A simple Discord bot, built using JavaScript and Node.js, to play local music files.

## Commands
### Join
`!join`

Tells Command.io bot to join the voice channel you are currently in.
### Leave
`!leave`
`!disconnect`

Tells Command.io to leave the voice channel it is currently in. Also aliased `disconnect` to do the same thing.
### Play
`!play File.mp3`
`!play Folder\File.mp3`
`!play "File With Space.mp3"`
`!play "Folder With Space\File.mp3"`
`!play "Folder"`

This command takes in a file path to a file or folder in the root location of bot.js. It will add a given file to the playlist, and start playing it if there is nothing else playing. If it is given a folder, it will recursively add any files found in any subfolders and itself.

This command will also `!resume` the bot if it is paused and an empty `!play` is called.
### Pause
`!pause`

Pauses the audio stream.
### Resume
`!resume`

Resumes the audio stream.
### Next
`!next`

Moves the needle to the next song in the playlist and begins playing it.
### Loopsong
`!loopsong`

Sets a flag to loop the current song indefinitely.
### Loopplaylist
`!loopplaylist`

Sets a flag to loop the current playlist indefinitely. The playlist can still be added to.
### Status
`!status`

Prints out the current playlist, the current volume, as well as flags for `!loopsong` and `!loopplaylist`.
### Volume
`!volume 0.10`
`!volume 0.01`

Sets the volume to a given percentage, in the form of a floating point number. There are also some quick shortcuts aliased:

`!volume10`
`!volume20`
`!volume30`
`!volume40`
`!volume50`
### Roll
`!roll 1d6`
`!r 12d4`
`!roll 100d1000`

Rolls a set number of dice with a given amount of sides. Formated as `!roll {NUM TO ROLL}d{SIDES OF DICE}`, and aliased with `!r`.
There is an upper limitation due to Discord message restrictions: a maximum of 100 dice can be rolled, and the largest die can have 1000 sides.
There are also some shortcuts aliased for specific dice you would typically see in a game of D&D:

`!rd4`
`!rd6`
`!rd8`
`!rd10`
`!rd12`
`!rd20`

### Summon Demon
`!summondemon`

This handles a specific case I had with my D&D group, but its an interesting command so I included it in the repo. This handles randomly choosing a demon for the Summon Lesser Demon spell in D&D 5e. This command displays the number and name of the demons chosen for the spell. All names are properties of Wizards of the Coast & Hasbro.

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
### Volume
`!volume 0.10`
`!volume 0.01`

Sets the volume to a given percentage, in the form of a floating point number. There are also some quick shortcuts aliased:

`!volume10`
`!volume20`
`!volume30`
`!volume40`
`!volume50`

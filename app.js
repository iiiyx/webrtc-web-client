//require the express dependency
const express = require('express')
//declare the variable that is going to be linked to express
const app = express()
//variable for feature media
let http = require('http').Server(app)
//where the app will be running
const port = process.env.PORT || 3000
//require socket.io library
let io = require('socket.io')(http)
//configure static hosting for the public folder
app.use(express.static('public'))

http.listen(port, () =>
{
    console.log('Listening on', port)
})

io.on('connection', socket => {
    console.log('New user is connected')
    //create a room if doesn't exist or join to it
    socket.on('create or join', room => {
        console.log('create or join to room', room)
        //How many users the room has
        const myRoom = io.sockets.adapter.rooms[room] || {length: 0}
        const numClients = myRoom.length
        console.log('Room:', room, 'has', numClients+1, 'clients')
        //If the room doesn't exist we create it
        if (numClients == 0)
        {
            socket.join(room)
            socket.emit('created', room)
        } else if(numClients == 1)
        {
            socket.join(room)
            socket.emit('joined', room)
        } else {
            socket.emit('full', room)
        }
    })
    socket.on('ready', room => {
        socket.broadcast.to(room).emit('ready')
    })
    socket.on('candidate', event => {
        socket.broadcast.to(event.room).emit('candidate', event)
    })
    socket.on('offer', event => {
        socket.broadcast.to(event.room).emit('offer', event.sdp)
    })
    socket.on('answer', event => {
        socket.broadcast.to(event.room).emit('answer', event.sdp)
    })    
})


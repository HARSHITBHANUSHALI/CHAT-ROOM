import express from 'express'
import { Server} from 'socket.io'

const PORT = process.env.PORT || 3500
const ADMIN = 'Admin'

const app = express();

const expressServer = app.listen(PORT, ()=>{console.log(`Listening ${PORT}`)});

const UsersState = {
    users:[],
    setUsers: function(newUsersArray){
        this.users = newUsersArray
    }
}

const io = new Server(expressServer,{
    cors:{
        origin: process.env.NODE_ENV === 'production' ? false:["http://localhost:5173"]
    }
})

io.on('connection', socket=>{
    console.log(`User ${socket.id} connected`)


    socket.on('joinRoom',({userName, roomName})=>{
        //leave previous room 
        const prevRoom = getUser(socket.id)?.room;

        if(prevRoom){
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message',buildMsg(ADMIN,`${userName} has left the room`))
        }

        const user = activateUser(socket.id,userName,roomName);

        //cannot update previous room users list until after the state update in activate user
        if(prevRoom){
            io.to(prevRoom).emit('userList',{
                users:getUsersInRoom(prevRoom)
            })
        }

        //join room
        socket.join(user.room)

        //To user who joined
        socket.emit('message',buildMsg(ADMIN,`You have joined the ${user.room} chat room`))

        //To everyone else
        socket.broadcast.to(user.room).emit('message',buildMsg(ADMIN,`${user.name} has joined the room`)
        )

        //update user list for room
        io.to(user.room).emit('userList',{
            users:getUsersInRoom(user.room)
        })

        //update rooms list for everyone
        io.emit('roomList',{
            rooms: getAllActiveRooms()
        })
       })
    
       //when user disconnects - to all others
    socket.on('disconnect', ()=>{
        const user = getUser(socket.id);
        userLeavesApp(socket.id)
        
        if(user){
            io.to(user.room).emit('message',buildMsg(ADMIN,`${user.name} has left the room`))
            io.to(user.room).emit('userList',{
                users: getUsersInRoom(user.room)
            })

            io.emit('roomList',{
                rooms:getAllActiveRooms()
            })

            console.log(`User ${socket.id} disconnected`)
        }
    })


    //listening for a message event
    socket.on('message', ({userName,message})=>{
        const room = getUser(socket.id)?.room;
        if(room){
            io.to(room).emit('message',buildMsg(userName,message));
        }
        socket.broadcast.emit('activity',null);
    })
    
    //listen for activity
    socket.on('activity',(name)=>{
        const room = getUser(socket.id)?.room;
        if(room){
            socket.broadcast.to(room).emit('activity',name);
        }  
    })
})

function buildMsg(name,text){
    return{
        name,
        text,
        time: new Intl.DateTimeFormat('default',{
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

function activateUser(id,name,room){
    const user = {id,name,room}
    UsersState.setUsers([...UsersState.users.filter(user => user.id !== id), user])
    return user
}

function userLeavesApp(id){
    UsersState.setUsers(UsersState.users.filter(user => user.id !== id))
}

function getUser(id){
    return UsersState.users.find(user => user.id === id)
}

function getUsersInRoom(room){
    return UsersState.users.filter(user => user.room === room)
}

function getAllActiveRooms(){
    return Array.from(new Set(UsersState.users.map(user => user.room)))
}
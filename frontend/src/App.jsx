import { useEffect, useState } from 'react';
import './App.css';
import io from 'socket.io-client';

function App() {

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [activity, setActivity] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [userName,setUserName] = useState('');
  const [roomName,setRoomName] = useState('');
  const [users,setUsers] = useState([]);
  const [rooms,setRooms] = useState([]);

  useEffect(() => {
    const newSocket = io('http://localhost:3500');
    setSocket(newSocket);

    newSocket.on('message', (data) => {
      const {name,text,time} = data; 
      setMessages((prevMessages) => [...prevMessages, {name,text,time}]);
    });

    newSocket.on('activity', (name) => {
      setActivity(name ? `${name} is typing...` : null);
    });

    newSocket.on('userList',({users})=>{
      setUsers(users);
    })

    newSocket.on('roomList',({rooms})=>{
      setRooms(rooms);
    })

    return () => {
      newSocket.disconnect();
    };
  }, []);

  function sendMessage(e) {
    e.preventDefault();
    if (message && userName && roomName) {
      socket.emit('message', {
        "userName":userName,
        "message":message
      });
      setMessage('');
      setActivity(null);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  }

  function handleTyping(e) {
    setMessage(e.target.value);

    if (socket && userName && roomName) {
      socket.emit('activity', userName);
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }

      setTypingTimeout(setTimeout(() => {
        socket.emit('activity', null);
      }, 3000));
    }
  }

  function handleJoinRooms(e){
     e.preventDefault();
      if(socket && userName && roomName){
        socket.emit('joinRoom',{
          "userName":userName,
          "roomName":roomName
        })
      }
  }

  function listClass(msg){
    if(msg.name === userName) 
      return "post post--left"
    else if(msg.name !== userName && msg.name!=='Admin')
      return "post post--right";
    else if(msg.name !== 'Admin')
      return "post post--left";
    else 
      return "post";
  }

  function randomColourGenerator(){
    let r = Math.random()*255;
    let g = Math.random()*255;
    let b = Math.random()*255;
    return `rgb(${r}, ${g}, ${b})`;
  }

  function messageClass(msg){
    if(msg.name === userName)
      return {backgroundColor:'blue'};
    else
      return {backgroundColor:randomColourGenerator()};
  }

  function messageDisplay(msg,index){
    if(msg.name !== 'Admin'){
      return (
        <li className={`${listClass(msg)}`} key={index}>         
          <div className={`post__header`} style={messageClass(msg)}>
            <span className='post__header--name'>{msg.name}</span>
            <span className='post__header--time'>{msg.time}</span>
          </div>
          <div className='post__text'>
            {msg.text}
          </div>
        </li>
    )}else{
      return(
        <li className={`${listClass(msg)}`} key={index}>         
          <div className={`post__text`}>
            {msg.text}
          </div>
        </li>
      ) 
    }
}

function showUsers(users){
  let usersList ='';
  if(users){
    users.forEach((user,i)=>{
      usersList+= `${user.name}`;
      if(users.length>1 && i!==users.length-1){
        usersList += ',';
      }
    })
    return(
      <>
      <em>Users in {roomName}:</em>
      <span>{usersList}</span>
      </>
    )
  }
}


function showRooms(rooms){
  let roomList ='';
  if(rooms){
    rooms.forEach((room,i)=>{
      roomList+= `${room}`;
      if(rooms.length>1 && i!==rooms.length-1){
        roomList += ',';
      }
    })
    return(
      <>
      <em>Active Rooms:</em>
      <span>{roomList}</span>
      </>
    )
  }
}
  return (
    <div className=''>
      <main>
        <form onSubmit={handleJoinRooms}>
          <input 
            type="text" 
            maxLength="8" 
            placeholder='Your name' 
            size='5' 
            value={userName}
            onChange={(e)=>setUserName(e.target.value)}
            required            
            />

          <input 
            type="text" 
            placeholder='Chat room' 
            size='5' 
            value={roomName}
            onChange={(e)=>setRoomName(e.target.value)}
            required/>
          <button type='submit'>Join</button>
        </form>

        <ul className='chat-display'>
          {messages.length > 0 &&
            messages.map((msg, index) => (
              messageDisplay(msg,index)
          ))}
        </ul>

        <p className='user-list'>
          {showUsers(users)}
        </p>

        <p className='room-list'>
          {showRooms(rooms)}
        </p>

        {activity && <p>{activity}</p>}
        <form className='form-msg' onSubmit={sendMessage}>
          <input
            type="text"
            value={message}
            onChange={handleTyping}
            placeholder="Your message"
            required
          />
          <button type="submit">Send</button>
        </form>
        
      </main>
    </div>
  );
}

export default App;

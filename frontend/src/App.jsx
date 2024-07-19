import { useEffect, useState,useCallback,useRef } from 'react';
import './App.css';
import io from 'socket.io-client';

function App() {

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);
  const [activity, setActivity] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [userColors, setUserColors] = useState(new Map());

  const chatDisplayRef = useRef(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3500');
    setSocket(newSocket);

    newSocket.on('message', (data) => {
      const { name, text, time } = data;
      setMessages((prevMessages) => [...prevMessages, { name, text, time }]);
    });

    newSocket.on('activity', (name) => {
      setActivity(name ? `${name} is typing...` : null);
    });

    newSocket.on('userList', ({ users }) => {
      setUsers(users);
      setUserColors((prevColors) => {
        const newColors = new Map(prevColors);
        users.forEach(user => {
          if (!newColors.has(user.name)) {
            newColors.set(user.name, randomColourGenerator());
          }
        });
        return newColors;
      });
    });

    newSocket.on('roomList', ({ rooms }) => {
      setRooms(rooms);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (chatDisplayRef.current) {
      chatDisplayRef.current.scrollTop = chatDisplayRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback((e) => {
    e.preventDefault();
    if (message && userName && roomName) {
      socket.emit('message', {
        userName,
        message,
      });
      setMessage('');
      setActivity(null);
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        setTypingTimeout(null);
      }
    }
  }, [message, userName, roomName, socket, typingTimeout]);

  const handleTyping = useCallback((e) => {
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
  }, [message, userName, roomName, socket, typingTimeout]);

  const handleJoinRooms = useCallback((e) => {
    e.preventDefault();
    if (socket && userName && roomName) {
      socket.emit('joinRoom', {
        userName,
        roomName,
      });

      // Clear messages state when joining a new room
      setMessages([]);
    }
  }, [userName, roomName, socket]);

  function randomColourGenerator() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  function messageDisplay(msg, index) {
    const color = userColors.get(msg.name) || 'gray'; // Default to gray if no color is assigned
    return (
      <li className={`post ${msg.name === userName ? 'post--left' : msg.name === 'Admin' ? 'post--admin' : 'post--right'}`} key={index}>
        <div className={`post__header`} style={{ backgroundColor: color }}>
          <span className='post__header--name'>{msg.name}</span>
          <span className='post__header--time'>{msg.time}</span>
        </div>
        <div className='post__text'>
          {msg.text}
        </div>
      </li>
    );
  }

  function showUsers(users) {
    const usersList = users.map(user => user.name).join(', ');
    return (
      <>
        <em>Users in {roomName}:</em>
        <span>{usersList}</span>
      </>
    );
  }

  function showRooms(rooms) {
    const roomList = rooms.join(', ');
    return (
      <>
        <em>Active Rooms:</em>
        <span>{roomList}</span>
      </>
    );
  }

  return (
    <div className='chatPage'>
      <main>
        <form onSubmit={handleJoinRooms}>
          <input
            type="text"
            maxLength="8"
            placeholder='Your name'
            size='5'
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder='Chat room'
            size='5'
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
          <button type='submit'>Join</button>
        </form>

        <ul className='chat-display' ref={chatDisplayRef}>
          {messages.map((msg, index) => messageDisplay(msg, index))}
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
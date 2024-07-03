import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css'; // Import your CSS styles
import SpotifyWebApi from 'spotify-web-api-js';
import send from '../src/images/icons8-send-50.png'

const App = () => {
  const [messages, setMessages] = useState([]);
  const [todos, setTodos] = useState([]);
  const [showTodos, setShowTodos] = useState(false);
  const chatContainerRef = useRef(null);
  const robotEyesRef = useRef([null, null]); // Ref for robot's eyes
  const [notes, setNotes] = useState([]);
  const reminderIntervals = useRef([]);
  const [spotifyToken, setSpotifyToken] = useState(null);


  useEffect(() => {
    fetchTodos();
    initSpotify();
  }, []);

  const spotifyApi = new SpotifyWebApi();

  const initSpotify = async () => {
    // Fetch Spotify access token
    const token = await fetchSpotifyToken();
    setSpotifyToken(token);

    // Set access token for Spotify Web API library
    spotifyApi.setAccessToken(token);
  };

  const fetchSpotifyToken = async () => {
    try {
      // Replace 'your-auth-endpoint' with your actual backend endpoint URL
      const response = await axios.get('http://localhost:5000/auth/spotify/token');
      return response.data.access_token; // Assuming your endpoint returns an access token
    } catch (error) {
      console.error('Error fetching Spotify token:', error);
      // Handle error fetching token (e.g., redirect to login, show error message)
      // Throw an error or return a default/fallback token as needed
      throw new Error('Failed to fetch Spotify access token');
    }
  };


  
  const fetchTodos = async () => {
    try {
      const response = await axios.get('http://localhost:5000/todos');
      setTodos(response.data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };


  const handleSendMessage = async (e) => {
    e.preventDefault();
    const newMessage = e.target.message.value;
    if (newMessage.trim() !== '') {
      const userMessage = { text: newMessage, sender: 'user' };
      setMessages([...messages, userMessage]);

      try {
        const response = await axios.post('http://localhost:5000/send-message', {
          message: newMessage
        });

        const botMessage = { text: response.data.message, sender: 'assistant' };
        setMessages(prevMessages => [...prevMessages, botMessage]);

        if (response.data.message.startsWith('Opening')) {
          const siteUrl = response.data.message.substring(8).trim();
          window.open(siteUrl, '_blank');
        }

        if (response.data.message.startsWith('Reminder set:')) {
          const reminderMessage = response.data.message.substring(14).trim();
          setReminder(reminderMessage);
        }

        if (response.data.message === 'All reminders stopped.') {
          stopAllReminders();
        }

        if (response.data.message === 'Fetching your to-do list...') {
          setShowTodos(true);
        }

        if (response.data.message.startsWith('Adding to your to-do list:')) {
          const task = response.data.message.substring(25).trim();
          addTodoTask(task);
        }

        if (response.data.message.startsWith('Removing item from your to-do list with ID:')) {
          const taskId = response.data.message.substring(42).trim();
          removeTodoTask(taskId);
        }


        if (response.data.message.startsWith('Play a song by')) {
          const [command, songInfo] = response.data.message.split('Play a song by ');
          const [song, artist] = songInfo.split(' by ');
          playSongByArtist(song.trim(), artist.trim());
        }
      
      } catch (error) {
        console.error('Error sending message:', error);
      }

      e.target.message.value = '';
    }
  };

  const setReminder = (reminderMessage) => {
    if (reminderMessage.includes('every')) {
      const [task, interval] = reminderMessage.split(' every ');
      const intervalMinutes = parseInt(interval, 10);

      if (!isNaN(intervalMinutes)) {
        const intervalId = setInterval(() => {
          alert(`Reminder: ${task}`);
        }, intervalMinutes * 60 * 1000);
        reminderIntervals.current.push(intervalId);
      }
    } else {
      const [task, time] = reminderMessage.split(' at ');
      const now = new Date();
      const reminderTime = new Date(now.toDateString() + ' ' + time);

      if (reminderTime < now) {
        reminderTime.setDate(reminderTime.getDate() + 1);
      }

      const timeout = reminderTime - now;

      setTimeout(() => {
        alert(`Reminder: ${task}`);
      }, timeout);
    }
  };


  
  const stopAllReminders = () => {
    reminderIntervals.current.forEach(intervalId => clearInterval(intervalId));
    reminderIntervals.current = [];
  };

  const hideToDoList = () => {
    setShowTodos(false)
  }

  const addTodoTask = async (task) => {
    try {
      const response = await axios.post('http://localhost:5000/todos', { task });
      setTodos([...todos, response.data]);
    } catch (error) {
      console.error('Error adding todo:', error);
    }
  };

  const removeTodoTask = async (taskId) => {
    try {
      await axios.delete(`http://localhost:5000/todos/${taskId}`);
      setTodos(todos.filter(todo => todo.id !== parseInt(taskId, 10)));
    } catch (error) {
      console.error('Error removing todo:', error);
    }
  };

  const toggleTodoCompletion = async (taskId) => {
    const todo = todos.find(todo => todo.id === taskId);
    if (todo) {
      try {
        const updatedTodo = { ...todo, completed: !todo.completed };
        await axios.put(`http://localhost:5000/todos/${taskId}`, updatedTodo);
        setTodos(todos.map(todo => (todo.id === taskId ? updatedTodo : todo)));
      } catch (error) {
        console.error('Error updating todo:', error);
      }
    }
  };

  const playSongByArtist = async (songName, artist) => {
    try {
      const response = await spotifyApi.searchTracks(`track:${songName} artist:${artist}`);
  
      if (response.tracks.items.length > 0) {
        const track = response.tracks.items[0];
        window.open(track.external_urls.spotify, '_blank'); // Open Spotify track in a new tab
      } else {
        console.error(`No tracks found for song: ${songName} by artist: ${artist}`);
      }
    } catch (error) {
      console.error('Error playing song:', error);
    }
  };

  useEffect(() => {
    // Scroll chat to bottom whenever messages change
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

 


  // Function to update robot's eyes position
  const updateRobotEyes = (e) => {
    const mouseX = e.pageX;
    const mouseY = e.pageY;
    const eye1 = robotEyesRef.current[0];
    const eye2 = robotEyesRef.current[1];

    if (eye1 && eye2) {
      const eyeSize = 12; // Adjust based on eye size
      const eyeCenterX = eye1.getBoundingClientRect().left + eyeSize / 2;
      const eyeCenterY = eye1.getBoundingClientRect().top + eyeSize / 2;

      const deltaX1 = mouseX - eyeCenterX;
      const deltaY1 = mouseY - eyeCenterY;
      const distance1 = Math.sqrt(deltaX1 * deltaX1 + deltaY1 * deltaY1);

      const deltaX2 = mouseX - (eye2.getBoundingClientRect().left + eyeSize / 2);
      const deltaY2 = mouseY - (eye2.getBoundingClientRect().top + eyeSize / 2);
      const distance2 = Math.sqrt(deltaX2 * deltaX2 + deltaY2 * deltaY2);

      const maxEyeMove = 3; // Adjust eye movement sensitivity

      eye1.style.transform = `translate(${deltaX1 / distance1 * maxEyeMove}px, ${deltaY1 / distance1 * maxEyeMove}px)`;
      eye2.style.transform = `translate(${deltaX2 / distance2 * maxEyeMove}px, ${deltaY2 / distance2 * maxEyeMove}px)`;
    }
  };

  
  useEffect(() => {
    // Add mousemove event listener to update robot's eyes position
    document.addEventListener('mousemove', updateRobotEyes);

    return () => {
      // Clean up event listener on component unmount
      document.removeEventListener('mousemove', updateRobotEyes);
    };
  }, []);

  return (
    <div className="App">
    <div className="chat-container">
      <header className="chat-header">
        <h4>Amute AI</h4>
      </header>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            {message.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="message-form">
        <input type="text" name="message" className="message-input" placeholder="compose your message..." />
        <button type="submit" className="send-button"><img src={send}/></button>
      </form>
      {showTodos && (
  <div className="todo-list">
    <h2>Your To-Do List</h2>
    <button onClick={hideToDoList} style={{marginBottom: '20px'}}>Hide</button>
    <ul>
      {todos.map(todo => (
        <li key={todo.id} className={todo.completed ? 'completed' : ''}>
          <span onClick={() => toggleTodoCompletion(todo.id)}>{todo.task}</span>
          <button onClick={() => removeTodoTask(todo.id)}>Remove</button>
        </li>
      ))}
    </ul>
  </div>
)}
    </div>
  </div>
  );
};

export default App;



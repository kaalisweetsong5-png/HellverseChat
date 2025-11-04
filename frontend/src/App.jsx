import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./App.css";

function App() {
  const [socket, setSocket] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showServerConfig, setShowServerConfig] = useState(false);
  
  // Server config
  const defaultServerUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const [serverUrl, setServerUrl] = useState(localStorage.getItem("serverUrl") || defaultServerUrl);
  
  // Auth form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  
  // Chat states
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [currentRoom, setCurrentRoom] = useState("main");
  const [rooms, setRooms] = useState(["main", "general", "random"]);
  const [newRoomName, setNewRoomName] = useState("");
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const connectSocket = (token) => {
    const newSocket = io(serverUrl, {
      auth: { token }
    });

    newSocket.on("connect", () => {
      console.log("Connected to server");
      setIsAuthenticated(true);
    });

    newSocket.on("message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on("presence", ({ user, status }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (status === "online") {
          newSet.add(user);
        } else {
          newSet.delete(user);
        }
        return newSet;
      });
    });

    newSocket.on("typing", ({ user, typing }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (typing) {
          newSet.add(user);
        } else {
          newSet.delete(user);
        }
        return newSet;
      });
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error.message);
      setAuthError("Authentication failed. Please login again.");
      setIsAuthenticated(false);
      localStorage.removeItem("token");
    });

    setSocket(newSocket);
    return newSocket;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      connectSocket(token);
    }

    return () => socket?.disconnect();
  }, []);

  const handleAuth = async (isSignup) => {
    setAuthError("");
    
    const endpoint = isSignup ? "/signup" : "/login";
    const body = isSignup 
      ? { username, password, display: displayName || username }
      : { username, password };

    try {
      const response = await fetch(`${serverUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error === "missing" ? "Please fill all fields" : 
                       error === "user exists" ? "Username already taken" : 
                       error === "invalid" ? "Invalid credentials" : error);
      }

      const data = await response.json();
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      
      setUser(data);
      connectSocket(data.token);
      
      // Reset form
      setUsername("");
      setPassword("");
      setDisplayName("");
      
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleLogout = () => {
    socket?.disconnect();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
    setMessages([]);
    setOnlineUsers(new Set());
    setTypingUsers(new Set());
  };

  const sendMessage = () => {
    if (!message.trim() || !socket) return;
    
    socket.emit("message", { 
      text: message.trim(),
      room: currentRoom 
    });
    setMessage("");
    
    // Stop typing indicator
    socket.emit("typing", { room: currentRoom, typing: false });
  };

  const handleTyping = (text) => {
    setMessage(text);
    
    if (!socket) return;
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing indicator
    socket.emit("typing", { room: currentRoom, typing: true });
    
    // Stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing", { room: currentRoom, typing: false });
    }, 1000);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const joinRoom = (roomName) => {
    if (roomName !== currentRoom) {
      setCurrentRoom(roomName);
      setMessages([]); // Clear messages when switching rooms
      if (socket) {
        socket.emit("join_room", { room: roomName });
      }
    }
  };

  const createRoom = () => {
    if (newRoomName.trim() && !rooms.includes(newRoomName.trim())) {
      const roomName = newRoomName.trim();
      setRooms(prev => [...prev, roomName]);
      joinRoom(roomName);
      setNewRoomName("");
    }
  };

  const saveServerUrl = () => {
    localStorage.setItem("serverUrl", serverUrl);
    setShowServerConfig(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1 className="app-title">🔥 {import.meta.env.VITE_APP_NAME || "HellverseChat"}</h1>
          <p className="app-subtitle">F-Chat Style Real-time Chat</p>
          
          <div className="server-config-toggle">
            <button 
              className="config-btn"
              onClick={() => setShowServerConfig(!showServerConfig)}
            >
              ⚙️ Server Config
            </button>
            <span className="server-url">Connected to: {serverUrl}</span>
          </div>
          
          {showServerConfig && (
            <div className="server-config">
              <input
                type="text"
                placeholder="Server URL (e.g., http://192.168.1.100:4000)"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="auth-input"
              />
              <button onClick={saveServerUrl} className="config-save-btn">
                Save Server
              </button>
            </div>
          )}
          
          <div className="auth-tabs">
            <button 
              className={showLogin ? "tab active" : "tab"}
              onClick={() => setShowLogin(true)}
            >
              Login
            </button>
            <button 
              className={showLogin ? "tab" : "tab active"}
              onClick={() => setShowLogin(false)}
            >
              Sign Up
            </button>
          </div>
          
          <div className="auth-form">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="auth-input"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="auth-input"
            />
            {!showLogin && (
              <input
                type="text"
                placeholder="Display Name (optional)"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="auth-input"
              />
            )}
            
            {authError && <div className="error">{authError}</div>}
            
            <button 
              className="auth-button"
              onClick={() => handleAuth(!showLogin)}
            >
              {showLogin ? "Login" : "Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2 className="chat-title">🔥 {import.meta.env.VITE_APP_NAME || "HellverseChat"}</h2>
        <div className="user-info">
          <span className="welcome">Welcome, <strong>{user.display}</strong></span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>
      
      <div className="chat-main">
        <div className="chat-sidebar">
          <div className="rooms-section">
            <h3>Channels</h3>
            <ul className="room-list">
              {rooms.map(room => (
                <li 
                  key={room} 
                  className={`room-item ${currentRoom === room ? 'active' : ''}`}
                  onClick={() => joinRoom(room)}
                >
                  # {room}
                </li>
              ))}
            </ul>
            
            <div className="create-room">
              <input
                type="text"
                placeholder="New channel name..."
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                className="room-input"
              />
              <button onClick={createRoom} className="create-room-btn">+</button>
            </div>
          </div>
          
          <div className="online-users">
            <h4>Online Users ({onlineUsers.size})</h4>
            <ul className="user-list">
              {Array.from(onlineUsers).map(username => (
                <li key={username} className="online-user">
                  <span className="status-dot"></span>
                  {username}
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="chat-content">
          <div className="messages-container">
            {messages.map((msg) => (
              <div key={msg.id} className="message">
                <span className="message-time">{formatTime(msg.ts)}</span>
                <span className="message-user">{msg.display}:</span>
                <span className="message-text">{msg.text}</span>
              </div>
            ))}
            
            {typingUsers.size > 0 && (
              <div className="typing-indicator">
                {Array.from(typingUsers).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <div className="message-input-container">
            <input
              type="text"
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={`Message #${currentRoom}...`}
              className="message-input"
              disabled={!socket}
            />
            <button 
              onClick={sendMessage} 
              className="send-button"
              disabled={!message.trim() || !socket}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

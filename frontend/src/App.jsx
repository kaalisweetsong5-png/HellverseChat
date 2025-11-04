import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import "./App.css";

function App() {
  const [socket, setSocket] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  
  // Server config
  const defaultServerUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const [serverUrl, setServerUrl] = useState(localStorage.getItem("serverUrl") || defaultServerUrl);
  
  // Auth form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  
  // Character profile states
  const [character, setCharacter] = useState({
    name: "",
    avatar: "",
    species: "Human",
    gender: "Unspecified", 
    age: "Adult",
    description: "",
    preferences: "",
    status: "Looking for RP"
  });
  
  // Chat states
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Map()); // Now stores user profiles
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [currentRoom, setCurrentRoom] = useState("main");
  const [rooms, setRooms] = useState(["main", "general", "adult", "fantasy", "sci-fi"]);
  const [newRoomName, setNewRoomName] = useState("");
  const [messageType, setMessageType] = useState("normal"); // normal, emote, ooc
  
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

    newSocket.on("presence", ({ user, status, character }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        if (status === "online") {
          newMap.set(user, { character: character || null });
        } else {
          newMap.delete(user);
        }
        return newMap;
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
      ? { 
          username, 
          password, 
          display: displayName || username,
          character: {
            ...character,
            name: character.name || displayName || username
          }
        }
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
      if (data.character) {
        setCharacter(data.character);
      }
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
    setOnlineUsers(new Map());
    setTypingUsers(new Set());
    setShowProfile(false);
    setViewingProfile(null);
  };

  const sendMessage = () => {
    if (!message.trim() || !socket) return;
    
    socket.emit("message", { 
      text: message.trim(),
      room: currentRoom,
      messageType: messageType
    });
    setMessage("");
    
    // Stop typing indicator
    socket.emit("typing", { room: currentRoom, typing: false });
  };

  const updateProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${serverUrl}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          display: user.display,
          character: character
        })
      });

      if (response.ok) {
        const updatedData = await response.json();
        setUser(updatedData);
        localStorage.setItem("user", JSON.stringify(updatedData));
        setShowProfile(false);
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  const viewUserProfile = async (username) => {
    try {
      const response = await fetch(`${serverUrl}/profile/${username}`);
      if (response.ok) {
        const profileData = await response.json();
        setViewingProfile(profileData);
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
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
              <>
                <input
                  type="text"
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="auth-input"
                />
                
                <div className="character-section">
                  <h4>Create Your Character</h4>
                  <input
                    type="text"
                    placeholder="Character Name"
                    value={character.name}
                    onChange={(e) => setCharacter({...character, name: e.target.value})}
                    className="auth-input"
                  />
                  
                  <div className="form-row">
                    <select 
                      value={character.species} 
                      onChange={(e) => setCharacter({...character, species: e.target.value})}
                      className="auth-select"
                    >
                      <option value="Human">Human</option>
                      <option value="Elf">Elf</option>
                      <option value="Dwarf">Dwarf</option>
                      <option value="Orc">Orc</option>
                      <option value="Dragon">Dragon</option>
                      <option value="Wolf">Wolf</option>
                      <option value="Fox">Fox</option>
                      <option value="Cat">Cat</option>
                      <option value="Other">Other</option>
                    </select>
                    
                    <select 
                      value={character.gender} 
                      onChange={(e) => setCharacter({...character, gender: e.target.value})}
                      className="auth-select"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Herm">Herm</option>
                      <option value="Cuntboy">Cuntboy</option>
                      <option value="Shemale">Shemale</option>
                      <option value="Transgender">Transgender</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  
                  <textarea
                    placeholder="Character Description"
                    value={character.description}
                    onChange={(e) => setCharacter({...character, description: e.target.value})}
                    className="auth-textarea"
                    rows="3"
                  />
                </div>
              </>
            )}
            
            {authError && <div className="error">{authError}</div>}
            
            <button 
              className="auth-button"
              onClick={() => handleAuth(!showLogin)}
            >
              {showLogin ? "Login" : "Create Character & Join"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profile Modal Component
  const ProfileModal = ({ profile, onClose, isOwnProfile = false }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isOwnProfile ? "Edit Profile" : `${profile?.character?.name || profile?.display}'s Profile`}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        {isOwnProfile ? (
          <div className="profile-edit">
            <input
              type="text"
              placeholder="Character Name"
              value={character.name}
              onChange={(e) => setCharacter({...character, name: e.target.value})}
              className="profile-input"
            />
            
            <div className="form-row">
              <select 
                value={character.species} 
                onChange={(e) => setCharacter({...character, species: e.target.value})}
                className="profile-select"
              >
                <option value="Human">Human</option>
                <option value="Elf">Elf</option>
                <option value="Dwarf">Dwarf</option>
                <option value="Dragon">Dragon</option>
                <option value="Wolf">Wolf</option>
                <option value="Fox">Fox</option>
                <option value="Cat">Cat</option>
                <option value="Other">Other</option>
              </select>
              
              <select 
                value={character.gender} 
                onChange={(e) => setCharacter({...character, gender: e.target.value})}
                className="profile-select"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Herm">Herm</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <textarea
              placeholder="Character Description"
              value={character.description}
              onChange={(e) => setCharacter({...character, description: e.target.value})}
              className="profile-textarea"
              rows="4"
            />
            
            <select 
              value={character.status} 
              onChange={(e) => setCharacter({...character, status: e.target.value})}
              className="profile-select"
            >
              <option value="Looking for RP">Looking for RP</option>
              <option value="Busy">Busy</option>
              <option value="Away">Away</option>
              <option value="Do Not Disturb">Do Not Disturb</option>
              <option value="Online">Online</option>
            </select>
            
            <button className="profile-save-btn" onClick={updateProfile}>
              Save Profile
            </button>
          </div>
        ) : (
          <div className="profile-view">
            <div className="character-info">
              <h4>{profile?.character?.name}</h4>
              <div className="character-details">
                <span className="detail-label">Species:</span> {profile?.character?.species}<br />
                <span className="detail-label">Gender:</span> {profile?.character?.gender}<br />
                <span className="detail-label">Status:</span> {profile?.character?.status}
              </div>
              {profile?.character?.description && (
                <div className="character-description">
                  <span className="detail-label">Description:</span>
                  <p>{profile?.character?.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="chat-container fullscreen">
      <div className="chat-header">
        <div className="header-left">
          <h2 className="chat-title">🔥 HellverseChat</h2>
          <span className="room-indicator"># {currentRoom}</span>
        </div>
        <div className="header-right">
          <span className="character-name">{character?.name || user.display}</span>
          <button className="profile-btn" onClick={() => setShowProfile(true)}>
            Profile
          </button>
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
                placeholder="New channel..."
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createRoom()}
                className="room-input"
              />
              <button onClick={createRoom} className="create-room-btn">+</button>
            </div>
          </div>
          
          <div className="online-users">
            <h4>Online ({onlineUsers.size})</h4>
            <ul className="user-list">
              {Array.from(onlineUsers).map(([username, userData]) => (
                <li 
                  key={username} 
                  className="online-user"
                  onClick={() => viewUserProfile(username)}
                >
                  <span className="status-dot"></span>
                  <div className="user-info">
                    <div className="user-name">{userData.character?.name || username}</div>
                    <div className="user-status">{userData.character?.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        <div className="chat-content">
          <div className="messages-container">
            {messages.map((msg) => (
              <div key={msg.id} className={`message ${msg.messageType || 'normal'}`}>
                <div className="message-header">
                  <span 
                    className="message-user" 
                    onClick={() => viewUserProfile(msg.user)}
                  >
                    {msg.character?.name || msg.display}
                  </span>
                  <span className="message-time">{formatTime(msg.ts)}</span>
                </div>
                <div className="message-content">
                  <span className="message-text">{msg.text}</span>
                </div>
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
            <select 
              value={messageType} 
              onChange={(e) => setMessageType(e.target.value)}
              className="message-type-select"
            >
              <option value="normal">Say</option>
              <option value="emote">Emote</option>
              <option value="ooc">OOC</option>
            </select>
            
            <input
              type="text"
              value={message}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={
                messageType === "emote" ? "Describe your action..." :
                messageType === "ooc" ? "Out of character message..." :
                `Message #${currentRoom}...`
              }
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
      
      {showProfile && (
        <ProfileModal 
          profile={{ character, display: user.display }} 
          onClose={() => setShowProfile(false)} 
          isOwnProfile={true}
        />
      )}
      
      {viewingProfile && (
        <ProfileModal 
          profile={viewingProfile} 
          onClose={() => setViewingProfile(null)} 
          isOwnProfile={false}
        />
      )}
    </div>
  );
}

export default App;

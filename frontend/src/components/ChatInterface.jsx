import { useState, useEffect, useRef } from "react";
import { ChromePicker } from 'react-color';
import io from "socket.io-client";
import "./ChatInterface.css";

function ChatInterface({ user, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [banTarget, setBanTarget] = useState("");
  
  // Server config - use relative URLs in production, localhost in development
  const defaultServerUrl = import.meta.env.VITE_API_URL || 
    (import.meta.env.PROD ? "" : "http://localhost:4000");
  const [serverUrl] = useState(localStorage.getItem("serverUrl") || defaultServerUrl);
  
  // Enhanced character profile states
  const [character, setCharacter] = useState({
    name: "",
    avatar: "",
    species: "Human",
    gender: "Unspecified", 
    age: "Adult",
    description: "",
    preferences: "",
    status: "Looking for RP",
    nameColor: "#ff6b6b",
    textColor: "#ffffff",
    backgroundColor: "#2c2c54",
    ...user.character
  });
  
  const [showColorPickers, setShowColorPickers] = useState({
    nameColor: false,
    textColor: false,
    backgroundColor: false
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
  const [adminChannelName, setAdminChannelName] = useState("");
  
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
    });

    newSocket.on("message", (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on("presence", ({ user: username, status, character: userChar, isAdmin }) => {
      setOnlineUsers(prev => {
        const newMap = new Map(prev);
        if (status === "online") {
          newMap.set(username, { character: userChar || null, isAdmin: isAdmin || false });
        } else {
          newMap.delete(username);
        }
        return newMap;
      });
    });

    newSocket.on("channels_list", ({ channels }) => {
      setRooms(channels);
    });

    newSocket.on("channel_created", ({ name, creator }) => {
      setRooms(prev => [...prev, name]);
      setMessages(prev => [...prev, {
        id: Date.now(),
        user: "system",
        display: "System",
        character: { name: "System" },
        text: `Channel #${name} created by ${creator}`,
        messageType: "system",
        ts: new Date().toISOString()
      }]);
    });

    newSocket.on("channel_deleted", ({ name, deleter }) => {
      setRooms(prev => prev.filter(room => room !== name));
      if (currentRoom === name) {
        setCurrentRoom("main");
      }
      setMessages(prev => [...prev, {
        id: Date.now(),
        user: "system", 
        display: "System",
        character: { name: "System" },
        text: `Channel #${name} deleted by ${deleter}`,
        messageType: "system",
        ts: new Date().toISOString()
      }]);
    });

    newSocket.on("user_banned", ({ username, bannedBy }) => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        user: "system",
        display: "System", 
        character: { name: "System" },
        text: `${username} was banned by ${bannedBy}`,
        messageType: "system",
        ts: new Date().toISOString()
      }]);
    });

    newSocket.on("banned", ({ reason }) => {
      alert(`You have been banned: ${reason}`);
      onLogout();
    });

    newSocket.on("typing", ({ user: typingUser, typing }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (typing) {
          newSet.add(typingUser);
        } else {
          newSet.delete(typingUser);
        }
        return newSet;
      });
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error.message);
      onLogout();
    });

    setSocket(newSocket);
    return newSocket;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && user) {
      connectSocket(token);
    }

    return () => socket?.disconnect();
  }, [user]);

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
        localStorage.setItem("user", JSON.stringify(updatedData));
        setShowProfile(false);
        
        // Reconnect socket to update character info
        const token = localStorage.getItem("token");
        socket?.disconnect();
        connectSocket(token);
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

  // Admin functions
  const banUser = (username) => {
    if (!user?.isAdmin || !socket) return;
    socket.emit("admin_ban", { targetUser: username });
    setBanTarget("");
    setShowBanDialog(false);
  };

  const createAdminChannel = () => {
    if (!user?.isAdmin || !socket || !adminChannelName.trim()) return;
    socket.emit("admin_create_channel", { name: adminChannelName.trim() });
    setAdminChannelName("");
  };

  const deleteChannel = (channelName) => {
    if (!user?.isAdmin || !socket || channelName === "main") return;
    if (confirm(`Are you sure you want to delete #${channelName}?`)) {
      socket.emit("admin_delete_channel", { name: channelName });
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

  const toggleColorPicker = (colorType) => {
    setShowColorPickers(prev => ({
      ...prev,
      [colorType]: !prev[colorType]
    }));
  };

  const updateCharacterColor = (colorType, color) => {
    setCharacter(prev => ({
      ...prev,
      [colorType]: color.hex
    }));
  };

  // Admin Panel Component
  const AdminPanel = ({ onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>👑 Admin Panel</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="admin-sections">
          <div className="admin-section">
            <h4>Channel Management</h4>
            <div className="admin-form">
              <input
                type="text"
                placeholder="New channel name..."
                value={adminChannelName}
                onChange={(e) => setAdminChannelName(e.target.value)}
                className="admin-input"
                onKeyDown={(e) => e.key === "Enter" && createAdminChannel()}
              />
              <button onClick={createAdminChannel} className="admin-btn create">
                Create Channel
              </button>
            </div>
            
            <div className="channel-list">
              <h5>Current Channels:</h5>
              {rooms.map(room => (
                <div key={room} className="channel-item">
                  <span>#{room}</span>
                  {room !== "main" && (
                    <button 
                      onClick={() => deleteChannel(room)}
                      className="admin-btn delete-small"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="admin-section">
            <h4>User Moderation</h4>
            <div className="admin-form">
              <input
                type="text"
                placeholder="Username to ban..."
                value={banTarget}
                onChange={(e) => setBanTarget(e.target.value)}
                className="admin-input"
                onKeyDown={(e) => e.key === "Enter" && banUser(banTarget)}
              />
              <button 
                onClick={() => banUser(banTarget)} 
                className="admin-btn ban"
              >
                Ban User
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Enhanced Profile Modal Component  
  const ProfileModal = ({ profile, onClose, isOwnProfile = false }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isOwnProfile ? "🎭 Edit Character Profile" : `👁️ ${profile?.character?.name || profile?.display}'s Profile`}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        {isOwnProfile ? (
          <div className="profile-edit">
            {/* Basic Character Info */}
            <div className="profile-section">
              <h4>Character Information</h4>
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
                  <option value="Demon">Demon</option>
                  <option value="Angel">Angel</option>
                  <option value="Vampire">Vampire</option>
                  <option value="Werewolf">Werewolf</option>
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
                  <option value="Cuntboy">Cuntboy</option>
                  <option value="Shemale">Shemale</option>
                  <option value="Transgender">Transgender</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Unspecified">Unspecified</option>
                </select>
              </div>

              <select 
                value={character.age} 
                onChange={(e) => setCharacter({...character, age: e.target.value})}
                className="profile-select"
              >
                <option value="Adult">Adult</option>
                <option value="Young Adult">Young Adult</option>
                <option value="Middle-aged">Middle-aged</option>
                <option value="Elderly">Elderly</option>
                <option value="Immortal">Immortal</option>
                <option value="Ancient">Ancient</option>
              </select>
              
              <textarea
                placeholder="Character Description"
                value={character.description}
                onChange={(e) => setCharacter({...character, description: e.target.value})}
                className="profile-textarea"
                rows="4"
              />

              <textarea
                placeholder="Roleplay Preferences"
                value={character.preferences}
                onChange={(e) => setCharacter({...character, preferences: e.target.value})}
                className="profile-textarea"
                rows="3"
              />
              
              <select 
                value={character.status} 
                onChange={(e) => setCharacter({...character, status: e.target.value})}
                className="profile-select"
              >
                <option value="Looking for RP">Looking for RP</option>
                <option value="Open for Chat">Open for Chat</option>
                <option value="Busy">Busy</option>
                <option value="Away">Away</option>
                <option value="Do Not Disturb">Do Not Disturb</option>
              </select>
            </div>

            {/* Color Customization */}
            <div className="profile-section color-customization">
              <h4>🎨 Color Customization</h4>
              
              {/* Name Color */}
              <div className="color-picker-group">
                <label>Character Name Color</label>
                <div className="color-input-group">
                  <button
                    type="button"
                    className="color-preview"
                    style={{ backgroundColor: character.nameColor }}
                    onClick={() => toggleColorPicker('nameColor')}
                  >
                    {character.nameColor}
                  </button>
                  <input
                    type="text"
                    value={character.nameColor}
                    onChange={(e) => setCharacter({...character, nameColor: e.target.value})}
                    className="color-hex-input"
                    placeholder="#ff6b6b"
                  />
                </div>
                {showColorPickers.nameColor && (
                  <div className="color-picker-popup">
                    <div 
                      className="color-picker-overlay"
                      onClick={() => toggleColorPicker('nameColor')}
                    />
                    <ChromePicker
                      color={character.nameColor}
                      onChange={(color) => updateCharacterColor('nameColor', color)}
                    />
                  </div>
                )}
              </div>

              {/* Text Color */}
              <div className="color-picker-group">
                <label>Text Color</label>
                <div className="color-input-group">
                  <button
                    type="button"
                    className="color-preview"
                    style={{ backgroundColor: character.textColor }}
                    onClick={() => toggleColorPicker('textColor')}
                  >
                    {character.textColor}
                  </button>
                  <input
                    type="text"
                    value={character.textColor}
                    onChange={(e) => setCharacter({...character, textColor: e.target.value})}
                    className="color-hex-input"
                    placeholder="#ffffff"
                  />
                </div>
                {showColorPickers.textColor && (
                  <div className="color-picker-popup">
                    <div 
                      className="color-picker-overlay"
                      onClick={() => toggleColorPicker('textColor')}
                    />
                    <ChromePicker
                      color={character.textColor}
                      onChange={(color) => updateCharacterColor('textColor', color)}
                    />
                  </div>
                )}
              </div>

              {/* Background Color */}
              <div className="color-picker-group">
                <label>Background Color</label>
                <div className="color-input-group">
                  <button
                    type="button"
                    className="color-preview"
                    style={{ backgroundColor: character.backgroundColor }}
                    onClick={() => toggleColorPicker('backgroundColor')}
                  >
                    {character.backgroundColor}
                  </button>
                  <input
                    type="text"
                    value={character.backgroundColor}
                    onChange={(e) => setCharacter({...character, backgroundColor: e.target.value})}
                    className="color-hex-input"
                    placeholder="#2c2c54"
                  />
                </div>
                {showColorPickers.backgroundColor && (
                  <div className="color-picker-popup">
                    <div 
                      className="color-picker-overlay"
                      onClick={() => toggleColorPicker('backgroundColor')}
                    />
                    <ChromePicker
                      color={character.backgroundColor}
                      onChange={(color) => updateCharacterColor('backgroundColor', color)}
                    />
                  </div>
                )}
              </div>

              {/* Color Preview */}
              <div className="color-preview-section">
                <h5>Preview:</h5>
                <div 
                  className="character-preview"
                  style={{ backgroundColor: character.backgroundColor }}
                >
                  <span 
                    className="preview-name"
                    style={{ color: character.nameColor }}
                  >
                    {character.name || user.display}
                  </span>
                  <p style={{ color: character.textColor }}>
                    This is how your character will appear in chat!
                  </p>
                </div>
              </div>
            </div>
            
            <button className="profile-save-btn" onClick={updateProfile}>
              💾 Save Character Profile
            </button>
          </div>
        ) : (
          <div className="profile-view">
            <div className="character-info" style={{ backgroundColor: profile?.character?.backgroundColor || '#2c2c54' }}>
              <h4 style={{ color: profile?.character?.nameColor || '#ff6b6b' }}>
                {profile?.character?.name}
              </h4>
              <div className="character-details" style={{ color: profile?.character?.textColor || '#ffffff' }}>
                <div className="detail-row">
                  <span className="detail-label">Species:</span> {profile?.character?.species}
                </div>
                <div className="detail-row">
                  <span className="detail-label">Gender:</span> {profile?.character?.gender}
                </div>
                <div className="detail-row">
                  <span className="detail-label">Age:</span> {profile?.character?.age}
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span> {profile?.character?.status}
                </div>
              </div>
              {profile?.character?.description && (
                <div className="character-description" style={{ color: profile?.character?.textColor || '#ffffff' }}>
                  <span className="detail-label">Description:</span>
                  <p>{profile?.character?.description}</p>
                </div>
              )}
              {profile?.character?.preferences && (
                <div className="character-preferences" style={{ color: profile?.character?.textColor || '#ffffff' }}>
                  <span className="detail-label">RP Preferences:</span>
                  <p>{profile?.character?.preferences}</p>
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
          <span 
            className="character-name"
            style={{ color: character?.nameColor || '#ff6b6b' }}
          >
            {user?.isAdmin && <span className="crown">👑 </span>}
            {character?.name || user.display}
          </span>
          <button className="profile-btn" onClick={() => setShowProfile(true)}>
            🎭 Profile
          </button>
          {user?.isAdmin && (
            <button className="admin-btn-header" onClick={() => setShowAdminPanel(true)}>
              👑 Admin
            </button>
          )}
          <button className="logout-btn" onClick={onLogout}>Logout</button>
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
                  onContextMenu={(e) => {
                    if (user?.isAdmin && username !== user.username) {
                      e.preventDefault();
                      setBanTarget(username);
                      setShowBanDialog(true);
                    }
                  }}
                  title={user?.isAdmin && username !== user.username ? "Right-click to ban" : ""}
                >
                  <span className="status-dot"></span>
                  <div className="user-info">
                    <div 
                      className="user-name"
                      style={{ color: userData.character?.nameColor || '#ff6b6b' }}
                    >
                      {userData.isAdmin && <span className="crown">👑 </span>}
                      {userData.character?.name || username}
                    </div>
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
                    onClick={() => msg.user !== "system" && viewUserProfile(msg.user)}
                    style={{ color: msg.character?.nameColor || '#ff6b6b' }}
                  >
                    {msg.isAdmin && <span className="crown">👑 </span>}
                    {msg.character?.name || msg.display}
                  </span>
                  <span className="message-time">{formatTime(msg.ts)}</span>
                </div>
                <div className="message-content">
                  <span 
                    className={`message-text ${msg.messageType === 'emote' ? 'emote-text' : ''} ${msg.messageType === 'ooc' ? 'ooc-text' : ''}`}
                    style={{ color: msg.character?.textColor || '#ffffff' }}
                  >
                    {msg.messageType === 'emote' && '*'}
                    {msg.messageType === 'ooc' && '(( '}
                    {msg.text}
                    {msg.messageType === 'ooc' && ' ))'}
                    {msg.messageType === 'emote' && '*'}
                  </span>
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
      
      {showAdminPanel && user?.isAdmin && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
      
      {showBanDialog && (
        <div className="modal-overlay" onClick={() => setShowBanDialog(false)}>
          <div className="modal-content ban-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Ban User</h3>
              <button className="modal-close" onClick={() => setShowBanDialog(false)}>×</button>
            </div>
            <div className="ban-content">
              <p>Are you sure you want to ban <strong>{banTarget}</strong>?</p>
              <p>This action will immediately disconnect them and prevent them from rejoining.</p>
              <div className="ban-actions">
                <button 
                  onClick={() => setShowBanDialog(false)} 
                  className="admin-btn cancel"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => banUser(banTarget)} 
                  className="admin-btn ban"
                >
                  Ban User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatInterface;
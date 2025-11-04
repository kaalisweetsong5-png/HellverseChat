import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = ({ user, onLogout, onCharacterSelect }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('characters'); // Default to characters tab
  const [characters, setCharacters] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingCharacter, setCreatingCharacter] = useState(false);
  const [activeCreationTab, setActiveCreationTab] = useState('basic');

  // Server config - consistent with AuthPage
  const getServerUrl = () => {
    if (!import.meta.env.PROD) {
      return "http://localhost:4000";
    }
    return import.meta.env.VITE_API_URL || "https://www.hellversechat.com";
  };
  
  const serverUrl = localStorage.getItem("serverUrl") || getServerUrl();
  const [newCharacter, setNewCharacter] = useState({
    // Basic Details
    name: '',
    species: 'Human',
    gender: 'Unspecified',
    orientation: 'Straight',
    age: 'Adult',
    
    // Description & Profile
    description: '',
    personality: '',
    history: '',
    preferences: '',
    
    // Images
    avatar: '',
    images: [],
    
    // Settings
    status: 'Looking for RP',
    nameColor: '#ff6b6b',
    textColor: '#ffffff',
    backgroundColor: '#2c2c54',
    
    // Profile Info
    domSub: 'Switch',
    position: 'Versatile',
    species: 'Human',
    bodyType: 'Average',
    height: '',
    weight: '',
    
    // Contact & Settings
    contactMethods: {
      telegram: '',
      discord: '',
      notes: ''
    }
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Fetch user's characters
      const token = localStorage.getItem('token');
      const response = await fetch(`${serverUrl}/api/characters`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters || []);
      }
      
      // Mock online users data (replace with real API later)
      setOnlineUsers([
        { name: 'DemonicPrincess', status: 'Looking for RP', lastSeen: '1m ago' },
        { name: 'HellboundAlpha', status: 'In character', lastSeen: '5m ago' },
        { name: 'ShadowMage', status: 'Online', lastSeen: '7m ago' },
        { name: 'CrystalMorningstar', status: 'Away', lastSeen: '15m ago' },
      ]);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      setLoading(false);
    }
  };

  const handleCreateCharacter = () => {
    setShowCreateModal(true);
  };

  const createCharacter = async () => {
    if (!newCharacter.name.trim()) {
      alert('Please enter a character name');
      return;
    }

    setCreatingCharacter(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${serverUrl}/api/characters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newCharacter)
      });

      if (response.ok) {
        const character = await response.json();
        setCharacters([...characters, character]);
        setShowCreateModal(false);
        setNewCharacter({
          name: '',
          species: 'Human',
          gender: 'Unspecified',
          age: 'Adult',
          description: '',
          preferences: '',
          status: 'Looking for RP',
          nameColor: '#ff6b6b',
          textColor: '#ffffff',
          backgroundColor: '#2c2c54'
        });
        alert('Character created successfully!');
      } else {
        const error = await response.text();
        alert(`Failed to create character: ${error}`);
      }
    } catch (error) {
      console.error('Error creating character:', error);
      alert('Failed to create character. Please try again.');
    }
    setCreatingCharacter(false);
  };

  const handleViewProfile = (character) => {
    navigate(`/character/${character.name}`);
  };

  const handleEnterChat = (character) => {
    onCharacterSelect(character);
    navigate('/chat');
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner-large"></div>
        <p>Loading your hellish domain...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header with brand and logout */}
      <header className="dashboard-header">
        <div className="header-brand">
          <h1>🔥 HellverseChat</h1>
          <span className="header-subtitle">Supernatural Roleplaying Community</span>
        </div>
        <div className="header-user">
          <span className="welcome-text">Welcome, <strong>{user.username}</strong>!</span>
          <button className="logout-btn" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Left Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-section">
            <h3>📋 Quick Navigation</h3>
            <ul className="sidebar-menu">
              <li>
                <button 
                  className={`sidebar-nav-btn ${activeTab === 'chat' ? 'active' : ''}`}
                  onClick={() => setActiveTab('chat')}
                >
                  � Chat
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-nav-btn ${activeTab === 'characters' ? 'active' : ''}`}
                  onClick={() => setActiveTab('characters')}
                >
                  👥 Characters
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-nav-btn ${activeTab === 'groups' ? 'active' : ''}`}
                  onClick={() => setActiveTab('groups')}
                >
                  � Groups
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
                  onClick={() => setActiveTab('account')}
                >
                  ⚙️ Account
                </button>
              </li>
              <li>
                <button 
                  className={`sidebar-nav-btn ${activeTab === 'help' ? 'active' : ''}`}
                  onClick={() => setActiveTab('help')}
                >
                  📚 Help & Info
                </button>
              </li>
            </ul>
          </div>

          <div className="sidebar-section">
            <h3>👤 Your Characters</h3>
            <div className="character-quick-list">
              {characters.length > 0 ? (
                characters.slice(0, 5).map((character, index) => (
                  <div key={index} className="quick-character">
                    <div className="character-avatar">
                      {character.avatar ? (
                        <img src={character.avatar} alt={character.name} />
                      ) : (
                        <div className="avatar-placeholder">
                          {character.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="character-info">
                      <span className="character-name">{character.name}</span>
                      <span className="character-status">Offline</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="no-characters">No characters yet</p>
              )}
              <button className="create-character-btn" onClick={handleCreateCharacter}>
                ➕ Create Character
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="dashboard-main">
          {activeTab === 'news' && (
            <div className="news-feed">
              <h2>🌟 What makes us special?</h2>
              <div className="feature-grid">
                <div className="feature-card">
                  <h3>🎨 Rich character creation with custom colors</h3>
                  <p>Create detailed characters with custom profiles, avatars, and extensive customization options.</p>
                </div>
                <div className="feature-card">
                  <h3>💬 Real-time roleplay chat rooms</h3>
                  <p>Engage in immersive roleplay with other users in dedicated chat environments.</p>
                </div>
                <div className="feature-card">
                  <h3>📝 Private messaging system</h3>
                  <p>Connect with other roleplayers through secure private conversations.</p>
                </div>
                <div className="feature-card">
                  <h3>⭐ Reputation and status system</h3>
                  <p>Build your reputation in the community through quality roleplay and interactions.</p>
                </div>
                <div className="feature-card">
                  <h3>🎭 Custom profile themes</h3>
                  <p>Personalize your character profiles with custom themes and styling options.</p>
                </div>
                <div className="feature-card">
                  <h3>🔒 Safe, moderated environment</h3>
                  <p>Enjoy roleplay in a secure, well-moderated community with active staff.</p>
                </div>
                <div className="feature-card">
                  <h3>📱 Mobile-friendly design</h3>
                  <p>Access HellverseChat from any device with our responsive design.</p>
                </div>
              </div>

              <div className="recent-activity">
                <h3>🔥 Recent Activity</h3>
                <div className="activity-feed">
                  <div className="activity-item">
                    <span className="activity-user">DemonicPrincess</span> joined <em>The Abyss</em>
                    <span className="activity-time">2m ago</span>
                  </div>
                  <div className="activity-item">
                    <span className="activity-user">HellboundAlpha</span> created new character
                    <span className="activity-time">5m ago</span>
                  </div>
                  <div className="activity-item">
                    <span className="activity-user">ShadowMage</span> started roleplaying in <em>Dark Forest</em>
                    <span className="activity-time">7m ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'characters' && (
            <div className="characters-tab">
              <div className="tab-header">
                <h2>👥 Characters</h2>
                <button className="create-btn" onClick={handleCreateCharacter}>
                  ➕ Create New Character
                </button>
              </div>
              
              <div className="characters-grid">
                {characters.length > 0 ? (
                  characters.map((character, index) => (
                    <div key={index} className="character-card">
                      <div className="character-avatar-large">
                        {character.avatar ? (
                          <img src={character.avatar} alt={character.name} />
                        ) : (
                          <div className="avatar-placeholder-large">
                            {character.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="character-details">
                        <h3>{character.name}</h3>
                        <p>{character.species || 'Unknown Species'}</p>
                        <p>{character.gender || 'Unspecified'}</p>
                        <div className="character-actions">
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleViewProfile(character)}
                          >
                            📋 View Profile
                          </button>
                          <button 
                            className="btn btn-success"
                            onClick={() => handleEnterChat(character)}
                          >
                            💬 Enter Chat
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-characters-card">
                    <h3>No Characters Yet</h3>
                    <p>Create your first character to start roleplaying in the HellverseChat community!</p>
                    <button className="btn btn-primary" onClick={handleCreateCharacter}>
                      🎭 Create Your First Character
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="chat-tab">
              <h2>💬 Enter the Chat</h2>
              <p>Choose a character to represent yourself in the chat:</p>
              
              <div className="chat-character-selection">
                {characters.length > 0 ? (
                  characters.map((character, index) => (
                    <div key={index} className="chat-character-option">
                      <div className="character-info">
                        <div className="character-avatar">
                          {character.avatar ? (
                            <img src={character.avatar} alt={character.name} />
                          ) : (
                            <div className="avatar-placeholder">
                              {character.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <span>{character.name}</span>
                      </div>
                      <button 
                        className="btn btn-success"
                        onClick={() => handleEnterChat(character)}
                      >
                        Enter Chat as {character.name}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="no-characters-message">
                    <p>You need to create a character before entering the chat.</p>
                    <button className="btn btn-primary" onClick={handleCreateCharacter}>
                      Create Character
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Right Sidebar - Online Users */}
        <aside className="dashboard-right-sidebar">
          <div className="online-users">
            <h3>🟢 Friends Browsing the Site</h3>
            <div className="users-list">
              {onlineUsers.map((user, index) => (
                <div key={index} className="online-user">
                  <div className="user-avatar">
                    <div className="avatar-placeholder">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="user-info">
                    <span className="user-name">{user.name}</span>
                    <span className="user-status">{user.status}</span>
                    <span className="user-time">Last seen {user.lastSeen}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* F-List Style Character Creation Modal */}
      {showCreateModal && (
        <div className="character-creator-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="character-creator" onClick={(e) => e.stopPropagation()}>
            <div className="creator-header">
              <div className="creator-title">
                <h2>Create a new character</h2>
                <p className="creator-note">
                  <strong>Note:</strong> Any information entered on this page is to be about your character. 
                  For example, age and species refer to the character, not the human behind it. You can create 9 more characters.
                </p>
              </div>
              <button 
                className="creator-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Left Sidebar Navigation */}
            <div className="creator-content">
              <aside className="creator-sidebar">
                <div className="creator-nav">
                  <h3>Quick jump</h3>
                  <ul>
                    <li>
                      <button 
                        className={`nav-item ${activeCreationTab === 'basic' ? 'active' : ''}`}
                        onClick={() => setActiveCreationTab('basic')}
                      >
                        📝 Basic details
                      </button>
                    </li>
                    <li>
                      <button 
                        className={`nav-item ${activeCreationTab === 'description' ? 'active' : ''}`}
                        onClick={() => setActiveCreationTab('description')}
                      >
                        📄 Description
                      </button>
                    </li>
                    <li>
                      <button 
                        className={`nav-item ${activeCreationTab === 'images' ? 'active' : ''}`}
                        onClick={() => setActiveCreationTab('images')}
                      >
                        🖼️ Images (Limit: 50)
                      </button>
                    </li>
                    <li>
                      <button 
                        className={`nav-item ${activeCreationTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveCreationTab('settings')}
                      >
                        ⚙️ Settings
                      </button>
                    </li>
                    <li>
                      <button 
                        className={`nav-item ${activeCreationTab === 'profile-info' ? 'active' : ''}`}
                        onClick={() => setActiveCreationTab('profile-info')}
                      >
                        👤 Profile info
                      </button>
                    </li>
                  </ul>
                </div>
              </aside>

              {/* Main Content Area */}
              <main className="creator-main">
                {activeCreationTab === 'basic' && (
                  <div className="creator-section">
                    <h3>📝 Basic Details</h3>
                    
                    <div className="form-group">
                      <label htmlFor="char-name">Name</label>
                      <input
                        id="char-name"
                        type="text"
                        value={newCharacter.name}
                        onChange={(e) => setNewCharacter({...newCharacter, name: e.target.value})}
                        placeholder="You will get to fill out detailed character info in the next step!"
                        maxLength="50"
                        className="creator-input"
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Species</label>
                        <select 
                          value={newCharacter.species}
                          onChange={(e) => setNewCharacter({...newCharacter, species: e.target.value})}
                          className="creator-select"
                        >
                          <option value="Human">Human</option>
                          <option value="Anthro">Anthro</option>
                          <option value="Elf">Elf</option>
                          <option value="Orc">Orc</option>
                          <option value="Dragon">Dragon</option>
                          <option value="Demon">Demon</option>
                          <option value="Angel">Angel</option>
                          <option value="Vampire">Vampire</option>
                          <option value="Werewolf">Werewolf</option>
                          <option value="Feral">Feral</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Gender</label>
                        <select 
                          value={newCharacter.gender}
                          onChange={(e) => setNewCharacter({...newCharacter, gender: e.target.value})}
                          className="creator-select"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Herm">Herm</option>
                          <option value="Cuntboy">Cuntboy</option>
                          <option value="Shemale">Shemale</option>
                          <option value="Transgender">Transgender</option>
                          <option value="Non-binary">Non-binary</option>
                          <option value="Unspecified">None of your business</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Orientation</label>
                        <select 
                          value={newCharacter.orientation}
                          onChange={(e) => setNewCharacter({...newCharacter, orientation: e.target.value})}
                          className="creator-select"
                        >
                          <option value="Straight">Straight</option>
                          <option value="Gay">Gay</option>
                          <option value="Bisexual">Bisexual</option>
                          <option value="Pansexual">Pansexual</option>
                          <option value="Asexual">Asexual</option>
                          <option value="Uncertain">Uncertain</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Age</label>
                        <select 
                          value={newCharacter.age}
                          onChange={(e) => setNewCharacter({...newCharacter, age: e.target.value})}
                          className="creator-select"
                        >
                          <option value="Adult">Adult</option>
                          <option value="Young Adult">Young Adult</option>
                          <option value="Middle-aged">Middle-aged</option>
                          <option value="Elderly">Elderly</option>
                          <option value="Immortal">Immortal</option>
                          <option value="Ancient">Ancient</option>
                        </select>
                      </div>
                    </div>

                    <div className="create-action">
                      <button 
                        className="btn-create-character"
                        onClick={createCharacter}
                        disabled={creatingCharacter || !newCharacter.name.trim()}
                      >
                        {creatingCharacter ? '⏳ Creating character...' : '🎭 Create character and edit!'}
                      </button>
                    </div>
                  </div>
                )}

                {activeCreationTab === 'description' && (
                  <div className="creator-section">
                    <h3>📄 Description</h3>
                    <div className="bbcode-editor">
                      <div className="bbcode-toolbar">
                        <button type="button" title="Bold">B</button>
                        <button type="button" title="Italic">I</button>
                        <button type="button" title="Underline">U</button>
                        <button type="button" title="Color">🎨</button>
                        <button type="button" title="URL">🔗</button>
                        <button type="button" title="Image">🖼️</button>
                      </div>
                      <textarea
                        value={newCharacter.description}
                        onChange={(e) => setNewCharacter({...newCharacter, description: e.target.value})}
                        placeholder="[center][color=purple][b][i][u]Can we..... *Yawn* Get this over with so I can go back to bed?*[/i][/u][/b][/color]"
                        className="bbcode-textarea"
                        rows="15"
                      />
                    </div>
                  </div>
                )}

                {activeCreationTab === 'images' && (
                  <div className="creator-section">
                    <h3>🖼️ Images (Limit: 50)</h3>
                    
                    <div className="avatar-section">
                      <h4>Avatar (100x100):</h4>
                      <div className="avatar-upload">
                        <input type="file" accept="image/*" />
                        <button type="button" className="btn-remove">Remove avatar</button>
                        <label>
                          <input type="checkbox" />
                          Delete this avatar
                        </label>
                        <p>It may take several hours before a newly uploaded avatar becomes visible to all users, including you. If the edit page shows the correct avatar, it was uploaded successfully.</p>
                      </div>
                    </div>

                    <div className="image-gallery">
                      <h4>Character Images:</h4>
                      <p>Upload additional character images here...</p>
                      <input type="file" accept="image/*" multiple />
                    </div>
                  </div>
                )}



                {activeCreationTab === 'settings' && (
                  <div className="creator-section">
                    <h3>⚙️ Settings</h3>
                    
                    <div className="settings-group">
                      <h4>Status & Availability</h4>
                      <div className="form-group">
                        <label>Status</label>
                        <select 
                          value={newCharacter.status}
                          onChange={(e) => setNewCharacter({...newCharacter, status: e.target.value})}
                          className="creator-select"
                        >
                          <option value="Looking for RP">Looking for RP</option>
                          <option value="Open for Chat">Open for Chat</option>
                          <option value="Busy">Busy</option>
                          <option value="Away">Away</option>
                          <option value="Do Not Disturb">Do Not Disturb</option>
                        </select>
                      </div>
                    </div>

                    <div className="settings-group">
                      <h4>🎨 Color Customization</h4>
                      <div className="color-grid">
                        <div className="color-setting">
                          <label>Name Color</label>
                          <input
                            type="color"
                            value={newCharacter.nameColor}
                            onChange={(e) => setNewCharacter({...newCharacter, nameColor: e.target.value})}
                          />
                          <span>{newCharacter.nameColor}</span>
                        </div>
                        <div className="color-setting">
                          <label>Text Color</label>
                          <input
                            type="color"
                            value={newCharacter.textColor}
                            onChange={(e) => setNewCharacter({...newCharacter, textColor: e.target.value})}
                          />
                          <span>{newCharacter.textColor}</span>
                        </div>
                        <div className="color-setting">
                          <label>Background Color</label>
                          <input
                            type="color"
                            value={newCharacter.backgroundColor}
                            onChange={(e) => setNewCharacter({...newCharacter, backgroundColor: e.target.value})}
                          />
                          <span>{newCharacter.backgroundColor}</span>
                        </div>
                      </div>
                      
                      <div className="color-preview">
                        <h5>Preview:</h5>
                        <div 
                          className="preview-box"
                          style={{ backgroundColor: newCharacter.backgroundColor }}
                        >
                          <span 
                            className="preview-name"
                            style={{ color: newCharacter.nameColor }}
                          >
                            {newCharacter.name || 'Character Name'}
                          </span>
                          <p style={{ color: newCharacter.textColor }}>
                            This is how your character will appear in chat!
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeCreationTab === 'profile-info' && (
                  <div className="creator-section">
                    <h3>👤 Profile Info</h3>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label>Dom/Sub Role</label>
                        <select 
                          value={newCharacter.domSub}
                          onChange={(e) => setNewCharacter({...newCharacter, domSub: e.target.value})}
                          className="creator-select"
                        >
                          <option value="Switch">Switch</option>
                          <option value="Dominant">Dominant</option>
                          <option value="Submissive">Submissive</option>
                          <option value="Always Dominant">Always Dominant</option>
                          <option value="Always Submissive">Always Submissive</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Position</label>
                        <select 
                          value={newCharacter.position}
                          onChange={(e) => setNewCharacter({...newCharacter, position: e.target.value})}
                          className="creator-select"
                        >
                          <option value="Versatile">Versatile</option>
                          <option value="Top">Top</option>
                          <option value="Bottom">Bottom</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Body Type</label>
                        <select 
                          value={newCharacter.bodyType}
                          onChange={(e) => setNewCharacter({...newCharacter, bodyType: e.target.value})}
                          className="creator-select"
                        >
                          <option value="Slim">Slim</option>
                          <option value="Average">Average</option>
                          <option value="Chubby">Chubby</option>
                          <option value="Curvy">Curvy</option>
                          <option value="Muscular">Muscular</option>
                          <option value="Heavyset">Heavyset</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Height</label>
                        <input
                          type="text"
                          value={newCharacter.height}
                          onChange={(e) => setNewCharacter({...newCharacter, height: e.target.value})}
                          placeholder="e.g., 5'8&quot; or 173cm"
                          className="creator-input"
                        />
                      </div>
                    </div>
                  </div>
                )}


              </main>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
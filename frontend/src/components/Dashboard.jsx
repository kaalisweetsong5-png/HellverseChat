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
  const [newCharacter, setNewCharacter] = useState({
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

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Fetch user's characters
      const token = localStorage.getItem('token');
      const response = await fetch('/api/characters', {
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
      const response = await fetch('/api/characters', {
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
      {/* Top Navigation Bar */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h1>🔥 HellverseChat</h1>
          <span className="nav-subtitle">Supernatural Roleplaying Community</span>
        </div>
        <div className="nav-links">
          <button 
            className={`nav-link ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            💬 Chat
          </button>
          <button 
            className={`nav-link ${activeTab === 'characters' ? 'active' : ''}`}
            onClick={() => setActiveTab('characters')}
          >
            👥 Characters
          </button>
          <button 
            className={`nav-link ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            📝 Groups
          </button>
          <button 
            className={`nav-link ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            ⚙️ Account
          </button>
          <button 
            className={`nav-link ${activeTab === 'help' ? 'active' : ''}`}
            onClick={() => setActiveTab('help')}
          >
            📚 Help & Info
          </button>
        </div>
        <div className="nav-user">
          <span className="welcome-text">Welcome, <strong>{user.username}</strong>!</span>
          <button className="logout-btn" onClick={onLogout}>
            🚪 Logout
          </button>
        </div>
      </nav>

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

      {/* Character Creation Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎭 Create New Character</h2>
              <button 
                className="modal-close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Character Name *</label>
                <input
                  type="text"
                  value={newCharacter.name}
                  onChange={(e) => setNewCharacter({...newCharacter, name: e.target.value})}
                  placeholder="Enter character name"
                  maxLength="50"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Species</label>
                  <select 
                    value={newCharacter.species}
                    onChange={(e) => setNewCharacter({...newCharacter, species: e.target.value})}
                  >
                    <option value="Human">Human</option>
                    <option value="Elf">Elf</option>
                    <option value="Dwarf">Dwarf</option>
                    <option value="Orc">Orc</option>
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
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select 
                    value={newCharacter.gender}
                    onChange={(e) => setNewCharacter({...newCharacter, gender: e.target.value})}
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
              </div>

              <div className="form-group">
                <label>Age Category</label>
                <select 
                  value={newCharacter.age}
                  onChange={(e) => setNewCharacter({...newCharacter, age: e.target.value})}
                >
                  <option value="Adult">Adult</option>
                  <option value="Young Adult">Young Adult</option>
                  <option value="Middle-aged">Middle-aged</option>
                  <option value="Elderly">Elderly</option>
                  <option value="Immortal">Immortal</option>
                  <option value="Ancient">Ancient</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newCharacter.description}
                  onChange={(e) => setNewCharacter({...newCharacter, description: e.target.value})}
                  placeholder="Describe your character's appearance and personality..."
                  rows="4"
                />
              </div>

              <div className="form-group">
                <label>RP Preferences</label>
                <textarea
                  value={newCharacter.preferences}
                  onChange={(e) => setNewCharacter({...newCharacter, preferences: e.target.value})}
                  placeholder="What kind of roleplay are you interested in?"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select 
                  value={newCharacter.status}
                  onChange={(e) => setNewCharacter({...newCharacter, status: e.target.value})}
                >
                  <option value="Looking for RP">Looking for RP</option>
                  <option value="Open for Chat">Open for Chat</option>
                  <option value="Busy">Busy</option>
                  <option value="Away">Away</option>
                  <option value="Do Not Disturb">Do Not Disturb</option>
                </select>
              </div>

              <div className="color-customization">
                <h4>🎨 Color Customization</h4>
                <div className="color-inputs">
                  <div className="color-input-group">
                    <label>Name Color</label>
                    <input
                      type="color"
                      value={newCharacter.nameColor}
                      onChange={(e) => setNewCharacter({...newCharacter, nameColor: e.target.value})}
                    />
                    <span>{newCharacter.nameColor}</span>
                  </div>
                  <div className="color-input-group">
                    <label>Text Color</label>
                    <input
                      type="color"
                      value={newCharacter.textColor}
                      onChange={(e) => setNewCharacter({...newCharacter, textColor: e.target.value})}
                    />
                    <span>{newCharacter.textColor}</span>
                  </div>
                  <div className="color-input-group">
                    <label>Background Color</label>
                    <input
                      type="color"
                      value={newCharacter.backgroundColor}
                      onChange={(e) => setNewCharacter({...newCharacter, backgroundColor: e.target.value})}
                    />
                    <span>{newCharacter.backgroundColor}</span>
                  </div>
                </div>
                
                <div className="character-preview">
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
                      This is how your character will appear!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={createCharacter}
                disabled={creatingCharacter || !newCharacter.name.trim()}
              >
                {creatingCharacter ? 'Creating...' : 'Create Character'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
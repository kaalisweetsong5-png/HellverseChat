import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const Dashboard = ({ user, onLogout, onCharacterSelect }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('characters'); // Default to characters tab
  const [characters, setCharacters] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);

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
    navigate('/character/create');
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
            <h3>📋 Quick Jump</h3>
            <ul className="sidebar-menu">
              <li><a href="#bookmarks">📑 Bookmarks</a></li>
              <li><a href="#tracked">🔍 Tracked Threads</a></li>
              <li><a href="#staff">👑 Staff</a></li>
              <li><a href="#roleplay-ads">📢 Roleplay Ads</a></li>
              <li><a href="#subscribestar">⭐ SubscribeStar</a></li>
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
    </div>
  );
};

export default Dashboard;
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChromePicker } from 'react-color';
import "./AuthPage.css";

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isSignup = location.pathname === '/signup';
  
  // Server config - ensure we use the correct domain
  const getDefaultServerUrl = () => {
    if (!import.meta.env.PROD) {
      return "http://localhost:4000";
    }
    
    // In production, always use relative URLs but ensure we're on the right domain
    const currentHost = window.location.host;
    if (currentHost === 'hellversechat.com') {
      // Redirect to www version since that's where Railway points
      const newUrl = window.location.href.replace('hellversechat.com', 'www.hellversechat.com');
      window.location.replace(newUrl);
      return "";
    }
    
    return import.meta.env.VITE_API_URL || "";
  };
  
  const defaultServerUrl = getDefaultServerUrl();
  const [serverUrl, setServerUrl] = useState(localStorage.getItem("serverUrl") || defaultServerUrl);
  
  // Debug logging
  console.log('🔧 Environment:', {
    VITE_API_URL: import.meta.env.VITE_API_URL,
    PROD: import.meta.env.PROD,
    currentHost: window.location.host,
    defaultServerUrl,
    serverUrl,
    fullUrl: `${serverUrl}/signup`
  });
  const [showServerConfig, setShowServerConfig] = useState(false);
  
  // Auth form states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
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
    backgroundColor: "#2c2c54"
  });
  
  const [showColorPickers, setShowColorPickers] = useState({
    nameColor: false,
    textColor: false,
    backgroundColor: false
  });

  const handleAuth = async () => {
    setAuthError("");
    setIsLoading(true);
    
    if (!username.trim() || !password.trim()) {
      setAuthError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }
    
    if (isSignup && !displayName.trim()) {
      setAuthError("Please enter a display name");
      setIsLoading(false);
      return;
    }
    
    const endpoint = isSignup ? "/signup" : "/login";
    const body = isSignup 
      ? { 
          username: username.trim(), 
          password, 
          display: displayName.trim() || username.trim(),
          character: {
            ...character,
            name: character.name.trim() || displayName.trim() || username.trim()
          }
        }
      : { username: username.trim(), password };

    try {
      const fullUrl = `${serverUrl}${endpoint}`;
      console.log('🚀 Making request to:', fullUrl);
      console.log('📦 Request body:', JSON.stringify(body, null, 2));
      
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Response error:', error);
        throw new Error(error === "missing" ? "Please fill all fields" : 
                       error === "user exists" ? "Username already taken" : 
                       error === "invalid" ? "Invalid credentials" : error);
      }

      const data = await response.json();
      console.log('✅ Success response:', data);
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      
      // Navigate to chat
      navigate('/chat');
      
    } catch (error) {
      console.error('💥 Fetch error:', error);
      console.error('💥 Error type:', error.constructor.name);
      console.error('💥 Error message:', error.message);
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveServerUrl = () => {
    localStorage.setItem("serverUrl", serverUrl);
    setShowServerConfig(false);
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

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="floating-shapes">
          <div className="shape shape1"></div>
          <div className="shape shape2"></div>
          <div className="shape shape3"></div>
        </div>
      </div>

      <div className="auth-container">
        <div className="auth-card">
          {/* Header */}
          <div className="auth-header">
            <button 
              className="back-btn"
              onClick={() => navigate('/')}
            >
              ← Back to Home
            </button>
            <h1 className="auth-title">
              🔥 {isSignup ? 'Create Character' : 'Welcome Back'}
            </h1>
            <p className="auth-subtitle">
              {isSignup 
                ? 'Join the HellverseChat community' 
                : 'Login to continue your adventure'
              }
            </p>
          </div>

          {/* Server Configuration */}
          <div className="server-config-section">
            <button 
              className="server-config-toggle"
              onClick={() => setShowServerConfig(!showServerConfig)}
            >
              ⚙️ Server: {serverUrl || 'Default'}
            </button>
            
            {showServerConfig && (
              <div className="server-config-panel">
                <input
                  type="text"
                  placeholder="Server URL (e.g., http://192.168.1.100:4000)"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="server-input"
                />
                <button onClick={saveServerUrl} className="server-save-btn">
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Auth Toggle */}
          <div className="auth-mode-toggle">
            <button 
              className={!isSignup ? "mode-btn active" : "mode-btn"}
              onClick={() => navigate('/login')}
            >
              Login
            </button>
            <button 
              className={isSignup ? "mode-btn active" : "mode-btn"}
              onClick={() => navigate('/signup')}
            >
              Create Account
            </button>
          </div>
          
          {/* Auth Form */}
          <form className="auth-form" onSubmit={(e) => { e.preventDefault(); handleAuth(); }}>
            {/* Basic Auth Fields */}
            <div className="form-section">
              <h3>Account Information</h3>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                required
              />
              {isSignup && (
                <input
                  type="text"
                  placeholder="Display Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="auth-input"
                  required
                />
              )}
            </div>
            
            {/* Character Creation for Signup */}
            {isSignup && (
              <div className="form-section character-section">
                <h3>Character Creation</h3>
                
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
                    <option value="Demon">Demon</option>
                    <option value="Angel">Angel</option>
                    <option value="Vampire">Vampire</option>
                    <option value="Werewolf">Werewolf</option>
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
                    <option value="Unspecified">Unspecified</option>
                  </select>
                </div>

                <select 
                  value={character.age} 
                  onChange={(e) => setCharacter({...character, age: e.target.value})}
                  className="auth-select"
                >
                  <option value="Adult">Adult</option>
                  <option value="Young Adult">Young Adult</option>
                  <option value="Middle-aged">Middle-aged</option>
                  <option value="Elderly">Elderly</option>
                  <option value="Immortal">Immortal</option>
                  <option value="Ancient">Ancient</option>
                </select>
                
                <textarea
                  placeholder="Character Description (What does your character look like? What's their personality?)"
                  value={character.description}
                  onChange={(e) => setCharacter({...character, description: e.target.value})}
                  className="auth-textarea"
                  rows="4"
                />

                <textarea
                  placeholder="Roleplay Preferences (What kind of roleplay are you interested in?)"
                  value={character.preferences}
                  onChange={(e) => setCharacter({...character, preferences: e.target.value})}
                  className="auth-textarea"
                  rows="3"
                />

                <select 
                  value={character.status} 
                  onChange={(e) => setCharacter({...character, status: e.target.value})}
                  className="auth-select"
                >
                  <option value="Looking for RP">Looking for RP</option>
                  <option value="Open for Chat">Open for Chat</option>
                  <option value="Busy">Busy</option>
                  <option value="Away">Away</option>
                  <option value="Do Not Disturb">Do Not Disturb</option>
                </select>

                {/* Color Customization */}
                <div className="color-section">
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
                        {character.name || displayName || username || 'Character Name'}
                      </span>
                      <p style={{ color: character.textColor }}>
                        This is how your character will appear in chat!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {authError && <div className="auth-error">{authError}</div>}
            
            <button 
              type="submit"
              className={`auth-submit-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading-spinner"></span>
                  {isSignup ? 'Creating Character...' : 'Logging in...'}
                </>
              ) : (
                isSignup ? '🎭 Create Character & Join' : '🚀 Enter HellverseChat'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
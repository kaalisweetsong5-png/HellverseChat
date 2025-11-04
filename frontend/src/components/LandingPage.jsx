import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const [showFeatures, setShowFeatures] = useState(false);

  return (
    <div className="landing-container">
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="floating-orb orb1"></div>
        <div className="floating-orb orb2"></div>
        <div className="floating-orb orb3"></div>
      </div>

      {/* Main Content */}
      <div className="landing-content">
        <div className="hero-section">
          <div className="logo-container">
            <h1 className="app-logo">
              <span className="flame">🔥</span>
              <span className="title-text">HellverseChat</span>
              <span className="flame">🔥</span>
            </h1>
            <p className="app-tagline">WELCOME TO HELL MOTHERFUCKA!!!!</p>
          </div>

          <div className="feature-highlights">
            <div className="feature-card">
              <span className="feature-icon">🎭</span>
              <h3>Create Rich Characters</h3>
              <p>Detailed profiles with custom colors and descriptions</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">💬</span>
              <h3>Real-time Chat</h3>
              <p>F-Chat style roleplay with emotes and OOC messaging</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🌈</span>
              <h3>Full Customization</h3>
              <p>Hex color support for personalized appearance</p>
            </div>
          </div>

          <div className="cta-section">
            <button 
              className="cta-button primary"
              onClick={() => navigate('/signup')}
            >
              Create Character & Join
            </button>
            <button 
              className="cta-button secondary"
              onClick={() => navigate('/login')}
            >
              Login
            </button>
          </div>

          <div className="feature-toggle">
            <button 
              className="toggle-btn"
              onClick={() => setShowFeatures(!showFeatures)}
            >
              {showFeatures ? '🔼 Hide Features' : '🔽 Show More Features'}
            </button>
          </div>

          {showFeatures && (
            <div className="expanded-features">
              <div className="features-grid">
                <div className="feature-detail">
                  <h4>🎨 Character Customization</h4>
                  <ul>
                    <li>Custom hex colors for names and text</li>
                    <li>Detailed character descriptions</li>
                    <li>Species and gender selection</li>
                    <li>Status and preference settings</li>
                  </ul>
                </div>
                <div className="feature-detail">
                  <h4>💫 Advanced Roleplay</h4>
                  <ul>
                    <li>Multiple chat rooms and channels</li>
                    <li>Emote and OOC message types</li>
                    <li>Real-time typing indicators</li>
                    <li>User presence and status</li>
                  </ul>
                </div>
                <div className="feature-detail">
                  <h4>👑 Admin Features</h4>
                  <ul>
                    <li>Channel creation and management</li>
                    <li>User moderation tools</li>
                    <li>Admin crown indicators</li>
                    <li>Banning and user controls</li>
                  </ul>
                </div>
                <div className="feature-detail">
                  <h4>🚀 Modern Experience</h4>
                  <ul>
                    <li>Responsive design for all devices</li>
                    <li>Real-time Socket.IO connectivity</li>
                    <li>Secure JWT authentication</li>
                    <li>F-Chat inspired interface</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="footer-section">
          <p className="footer-text">
            Inspired by F-Chat • Built with modern web technologies
          </p>
          <div className="social-links">
            <span className="tech-badge">⚛️ React</span>
            <span className="tech-badge">📡 Socket.IO</span>
            <span className="tech-badge">🎨 Custom CSS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
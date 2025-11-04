import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();
  const [news, setNews] = useState([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [signupData, setSignupData] = useState({
    username: '', email: '', password: '', confirmPassword: '', timezone: 'GMT'
  });

  useEffect(() => {
    // Fetch news updates
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/news');
        if (response.ok) {
          const newsData = await response.json();
          setNews(newsData.slice(0, 3)); // Show latest 3 news items
        }
      } catch (error) {
        console.log('No news available yet');
      }
    };

    fetchNews();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    // Add your login logic here - for now just redirect to login page
    navigate('/login');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    // Add your signup logic here - for now just redirect to signup page
    navigate('/signup');
  };

  return (
    <div className="flist-style-page">
      {/* Header Navigation */}
      <header className="site-header">
        <div className="header-container">
          <div className="logo-section">
            <div className="site-logo">🔥</div>
            <div className="site-info">
              <h1 className="site-title">HellverseChat</h1>
              <span className="site-tagline">Supernatural Roleplaying Community!</span>
            </div>
          </div>
          
          <nav className="header-nav">
            <div className="login-section">
              <input 
                type="text" 
                placeholder="Username"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                className="nav-input"
              />
              <input 
                type="password" 
                placeholder="Password"
                value={loginData.password}
                onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                className="nav-input"
              />
              <button className="nav-btn login-btn" onClick={() => navigate('/login')}>
                Login
              </button>
            </div>
            <div className="nav-links">
              <Link to="/chat" className="nav-link">� Chat</Link>
              <a href="#browse" className="nav-link">👥 Browse</a>
              <a href="#help" className="nav-link">❓ Help</a>
              <button 
                className="nav-btn create-btn"
                onClick={() => navigate('/signup')}
              >
                🆕 Create account
              </button>
            </div>
          </nav>
        </div>
      </header>

      <div className="main-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-container">
            <div className="hero-text">
              <h2 className="hero-title">HellverseChat: Supernatural Roleplaying Community!</h2>
              <p className="hero-description">
                We offer immersive character-based roleplay in our chat rooms, private messaging, 
                and detailed character profiles for the supernatural and fantasy community. Join thousands 
                of creative writers and roleplayers in our dark fantasy universe.
              </p>
              
              {/* News Updates */}
              {news.length > 0 && (
                <div className="news-section">
                  <h3>📢 Latest Updates</h3>
                  <div className="news-list">
                    {news.map((item, index) => (
                      <div key={index} className="news-item">
                        <div className="news-header">
                          <span className="news-date">{new Date(item.createdAt).toLocaleDateString()}</span>
                          <h4 className="news-title">{item.title}</h4>
                        </div>
                        <p className="news-content">{item.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="community-stats">
                <div className="stat-item">
                  <span className="stat-number">1,000+</span>
                  <span className="stat-label">Active Characters</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">50+</span>
                  <span className="stat-label">Chat Rooms</span>
                </div>
                <div className="stat-item">
                  <span className="stat-number">24/7</span>
                  <span className="stat-label">Active Community</span>
                </div>
              </div>
            </div>
            
            <div className="hero-character">
              <div className="character-showcase">
                <div className="character-frame">
                  <div className="character-avatar">👹</div>
                  <div className="character-info">
                    <div className="character-name" style={{color: '#ff6b6b'}}>Welcome, Soul!</div>
                    <div className="character-species">Infernal Being</div>
                    <div className="character-status">🔥 Online</div>
                  </div>
                </div>
                <div className="join-banner">
                  <span className="banner-text">JOIN THE DARKNESS!</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Create Account Section */}
        <section className="signup-section">
          <div className="signup-container">
            <div className="signup-form-container">
              <h3 className="form-title">Create account</h3>
              <p className="age-notice">You must be over the age of 18 to create an account, and you may not share your account with anyone!</p>
              <p className="terms-notice">By creating an account, you agree to the Terms of Service.</p>
              <p className="required-notice">* = required</p>
              
              <form className="signup-form" onSubmit={handleSignup}>
                <div className="form-row">
                  <div className="form-group">
                    <label>* Username</label>
                    <input 
                      type="text" 
                      value={signupData.username}
                      onChange={(e) => setSignupData({...signupData, username: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    type="email" 
                    value={signupData.email}
                    onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                  />
                  <small>Registration requires you sign up with a valid email address. You will be asked to click a link in your registration email once registration is complete.</small>
                </div>
                
                <div className="form-group">
                  <label>Confirm</label>
                  <input type="email" placeholder="Confirm email address" />
                </div>
                
                <div className="password-strength">
                  <span>Strength: </span>
                  <span className="strength-bad">0 (Bad)</span>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>* Password</label>
                    <input 
                      type="password" 
                      value={signupData.password}
                      onChange={(e) => setSignupData({...signupData, password: e.target.value})}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>* Confirm</label>
                    <input 
                      type="password" 
                      value={signupData.confirmPassword}
                      onChange={(e) => setSignupData({...signupData, confirmPassword: e.target.value})}
                      required 
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Timezone</label>
                  <select 
                    value={signupData.timezone}
                    onChange={(e) => setSignupData({...signupData, timezone: e.target.value})}
                  >
                    <option value="GMT">GMT</option>
                    <option value="EST">EST</option>
                    <option value="PST">PST</option>
                    <option value="CST">CST</option>
                  </select>
                  <small>Your timezone's needed to display times properly.</small>
                </div>
                
                <div className="captcha-section">
                  <div className="captcha-placeholder">
                    [CAPTCHA would go here]
                  </div>
                </div>
                
                <button type="submit" className="create-account-btn">
                  Create account!
                </button>
              </form>
            </div>
            
            <div className="features-sidebar">
              <h4>🌟 What makes us special?</h4>
              <ul className="feature-list">
                <li>🎭 Rich character creation with custom colors</li>
                <li>💬 Real-time roleplay chat rooms</li>
                <li>👥 Private messaging system</li>
                <li>🏆 Reputation and status system</li>
                <li>🎨 Custom profile themes</li>
                <li>🔒 Safe, moderated environment</li>
                <li>📱 Mobile-friendly design</li>
              </ul>
              
              <div className="community-preview">
                <h5>� Recent Activity</h5>
                <div className="activity-item">
                  <span style={{color: '#8A2BE2'}}>DemonicPrincess</span> joined <em>The Abyss</em>
                </div>
                <div className="activity-item">
                  <span style={{color: '#FF4500'}}>HellhoundAlpha</span> created new character
                </div>
                <div className="activity-item">
                  <span style={{color: '#00CED1'}}>ShadowMage</span> started roleplay in <em>Dark Forest</em>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-content">
          <p>&copy; 2025 HellverseChat - Supernatural Roleplaying Community | Inspired by the best of online RP</p>
          <div className="footer-links">
            <a href="#terms">Terms of Service</a> |
            <a href="#privacy">Privacy Policy</a> |
            <a href="#contact">Contact</a> |
            <a href="#help">Help</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
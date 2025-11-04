import { useState, useEffect } from 'react';
import './MaintenancePage.css';

const MaintenancePage = ({ maintenanceInfo }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatETA = (eta) => {
    if (!eta) return null;
    const etaDate = new Date(eta);
    if (isNaN(etaDate.getTime())) return eta; // Return as-is if not a valid date
    
    const now = new Date();
    const diff = etaDate - now;
    
    if (diff <= 0) return "Maintenance should be completed soon";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `Estimated completion: ${hours}h ${minutes}m`;
    } else {
      return `Estimated completion: ${minutes} minutes`;
    }
  };

  return (
    <div className="maintenance-page">
      <div className="maintenance-background">
        <div className="floating-shapes">
          <div className="shape shape1"></div>
          <div className="shape shape2"></div>
          <div className="shape shape3"></div>
          <div className="shape shape4"></div>
        </div>
      </div>

      <div className="maintenance-container">
        <div className="maintenance-content">
          {/* Logo/Icon */}
          <div className="maintenance-icon">
            <div className="gear-container">
              <div className="gear gear1">⚙️</div>
              <div className="gear gear2">🔧</div>
            </div>
          </div>

          {/* Main Message */}
          <h1 className="maintenance-title">
            🔥 HellverseChat is Under Maintenance
          </h1>
          
          <div className="maintenance-message">
            <p>{maintenanceInfo?.message || 'We are currently performing scheduled maintenance to improve your experience.'}</p>
          </div>

          {/* ETA Display */}
          {maintenanceInfo?.eta && (
            <div className="maintenance-eta">
              <div className="eta-box">
                <span className="eta-label">⏰ Expected Return:</span>
                <span className="eta-time">{formatETA(maintenanceInfo.eta)}</span>
              </div>
            </div>
          )}

          {/* Status Updates */}
          <div className="maintenance-status">
            <h3>🔄 What we're working on:</h3>
            <ul className="status-list">
              <li>🛠️ Server optimizations</li>
              <li>🔒 Security enhancements</li>
              <li>✨ New features and improvements</li>
              <li>🐛 Bug fixes and stability improvements</li>
            </ul>
          </div>

          {/* Contact/Social */}
          <div className="maintenance-contact">
            <p>Stay updated on our progress:</p>
            <div className="social-links">
              <button className="social-btn discord">
                💬 Discord
              </button>
              <button className="social-btn twitter">
                🐦 Twitter
              </button>
              <button className="social-btn refresh" onClick={() => window.location.reload()}>
                🔄 Refresh Page
              </button>
            </div>
          </div>

          {/* Live Clock */}
          <div className="maintenance-footer">
            <div className="live-time">
              Current Time: {currentTime.toLocaleString()}
            </div>
            <div className="maintenance-id">
              Maintenance ID: {maintenanceInfo?.timestamp ? new Date(maintenanceInfo.timestamp).toISOString().slice(0, 10) : 'MAINT-001'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
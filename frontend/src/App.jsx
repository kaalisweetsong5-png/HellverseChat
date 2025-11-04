import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import ChatInterface from "./components/ChatInterface";
import MaintenancePage from "./components/MaintenancePage";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceInfo, setMaintenanceInfo] = useState(null);

  // Check maintenance mode
  const checkMaintenanceMode = async () => {
    try {
      // Get server URL (consistent with AuthPage approach)
      const getServerUrl = () => {
        if (!import.meta.env.PROD) {
          return "http://localhost:4000";
        }
        return import.meta.env.VITE_API_URL || "https://www.hellversechat.com";
      };
      
      const serverUrl = localStorage.getItem("serverUrl") || getServerUrl();
      const apiUrl = serverUrl ? `${serverUrl}/api/maintenance` : '/api/maintenance';
      
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        setMaintenanceMode(data.maintenanceMode);
        setMaintenanceInfo(data);
      } else {
        console.warn('Could not check maintenance status');
      }
    } catch (error) {
      console.warn('Maintenance check failed:', error);
    }
  };

  useEffect(() => {
    // Check maintenance mode first
    checkMaintenanceMode();
    // Check for existing authentication
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    const storedCharacter = localStorage.getItem("selectedCharacter");
    
    console.log('🔐 Auth Check:', {
      hasToken: !!token,
      hasStoredUser: !!storedUser,
      hasStoredCharacter: !!storedCharacter,
      tokenLength: token?.length,
      storedUserPreview: storedUser?.substring(0, 50) + '...'
    });
    
    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('✅ Parsed user data:', userData);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Restore selected character if available
        if (storedCharacter) {
          try {
            const characterData = JSON.parse(storedCharacter);
            setSelectedCharacter(characterData);
            console.log('👤 Restored character:', characterData.name);
          } catch (charError) {
            console.error("❌ Error parsing stored character:", charError);
            localStorage.removeItem("selectedCharacter");
          }
        }
        
        console.log('🎯 Setting authenticated to true');
      } catch (error) {
        console.error("❌ Error parsing stored user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedCharacter");
      }
    } else {
      console.log('❌ No valid auth data found');
    }
    
    setIsLoading(false);
    
    // Set up periodic maintenance check (every 30 seconds)
    const maintenanceInterval = setInterval(() => {
      checkMaintenanceMode();
    }, 30000);
    
    return () => clearInterval(maintenanceInterval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedCharacter");
    setIsAuthenticated(false);
    setUser(null);
    setSelectedCharacter(null);
    navigate("/");
  };

  const handleCharacterSelect = (character) => {
    setSelectedCharacter(character);
    localStorage.setItem("selectedCharacter", JSON.stringify(character));
    navigate("/chat");
  };

  if (isLoading) {
    console.log('⏳ App is loading...');
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h2>🔥 HellverseChat</h2>
          <div className="loading-spinner-large"></div>
        </div>
      </div>
    );
  }

  console.log('🚦 App render:', {
    isAuthenticated,
    user: user?.username || 'none',
    currentPath: window.location.pathname,
    maintenanceMode
  });

  // Show maintenance page if maintenance mode is active
  if (maintenanceMode) {
    return <MaintenancePage maintenanceInfo={maintenanceInfo} />;
  }

  return (
    <div className="app">
      <Routes>
        {/* Landing Page */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <>
                {console.log('🔄 Redirecting to /dashboard from /')}
                <Navigate to="/dashboard" replace />
              </>
            ) : (
              <>
                {console.log('🏠 Showing landing page')}
                <LandingPage />
              </>
            )
          } 
        />
        
        {/* Authentication Routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
          } 
        />
        <Route 
          path="/signup" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
          } 
        />
        
        {/* Dashboard */}
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? (
              <>
                {console.log('🏠 Loading dashboard for:', user?.username)}
                <Dashboard 
                  user={user}
                  onCharacterSelect={handleCharacterSelect}
                  onLogout={handleLogout}
                />
              </>
            ) : (
              <>
                {console.log('🚫 Not authenticated, redirecting to home from /dashboard')}
                <Navigate to="/" replace />
              </>
            )
          } 
        />

        {/* Keep legacy route for backward compatibility */}
        <Route 
          path="/characters" 
          element={<Navigate to="/dashboard" replace />} 
        />
        
        {/* Chat Interface */}
        <Route 
          path="/chat" 
          element={
            isAuthenticated && selectedCharacter ? (
              <>
                {console.log('💬 Loading chat interface for character:', selectedCharacter?.name)}
                <ChatInterface 
                  user={user}
                  character={selectedCharacter}
                  onLogout={handleLogout}
                />
              </>
            ) : isAuthenticated ? (
              <>
                {console.log('🎭 No character selected, redirecting to dashboard')}
                <Navigate to="/dashboard" replace />
              </>
            ) : (
              <>
                {console.log('🚫 Not authenticated, redirecting to home from /chat')}
                <Navigate to="/" replace />
              </>
            )
          } 
        />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
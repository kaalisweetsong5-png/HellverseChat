import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import ChatInterface from "./components/ChatInterface";
import "./App.css";

function App() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ensure we're on the correct domain in production
  useEffect(() => {
    if (import.meta.env.PROD && window.location.host === 'hellversechat.com') {
      const newUrl = window.location.href.replace('hellversechat.com', 'www.hellversechat.com');
      window.location.replace(newUrl);
      return;
    }
  }, []);

  useEffect(() => {
    // Check for existing authentication
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    
    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsAuthenticated(false);
    setUser(null);
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h2>🔥 HellverseChat</h2>
          <div className="loading-spinner-large"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        {/* Landing Page */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? <Navigate to="/chat" replace /> : <LandingPage />
          } 
        />
        
        {/* Authentication Routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/chat" replace /> : <AuthPage />
          } 
        />
        <Route 
          path="/signup" 
          element={
            isAuthenticated ? <Navigate to="/chat" replace /> : <AuthPage />
          } 
        />
        
        {/* Chat Interface */}
        <Route 
          path="/chat" 
          element={
            isAuthenticated ? (
              <ChatInterface 
                user={user}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/" replace />
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
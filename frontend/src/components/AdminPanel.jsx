import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

const AdminPanel = ({ user, onClose }) => {
  const [activeTab, setActiveTab] = useState('news');
  const [news, setNews] = useState([]);
  const [newsForm, setNewsForm] = useState({ title: '', content: '' });
  const [editingNews, setEditingNews] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get server URL based on environment
  const getServerUrl = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hellversechat_server_url');
      if (stored) return stored;
    }
    
    // Auto-detect based on current location
    if (typeof window !== 'undefined') {
      const { protocol, hostname } = window.location;
      
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:4000';
      } else if (hostname.includes('railway.app') || hostname.includes('hellversechat.com')) {
        return `${protocol}//${hostname}`;
      }
    }
    
    return 'http://localhost:4000';
  };

  const serverUrl = getServerUrl();

  useEffect(() => {
    if (activeTab === 'news') {
      fetchNews();
    }
  }, [activeTab]);

  const fetchNews = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/news`);
      if (response.ok) {
        const newsData = await response.json();
        setNews(newsData);
      }
    } catch (error) {
      console.error('Error fetching news:', error);
    }
  };

  const handleNewsSubmit = async (e) => {
    e.preventDefault();
    if (!newsForm.title.trim() || !newsForm.content.trim()) return;

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const url = editingNews 
        ? `${serverUrl}/api/news/${editingNews.id}`
        : `${serverUrl}/api/news`;
      
      const method = editingNews ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newsForm)
      });

      if (response.ok) {
        setNewsForm({ title: '', content: '' });
        setEditingNews(null);
        fetchNews();
      } else {
        alert('Failed to save news article');
      }
    } catch (error) {
      console.error('Error saving news:', error);
      alert('Error saving news article');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNews = async (id) => {
    if (!confirm('Are you sure you want to delete this news article?')) return;

    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${serverUrl}/api/news/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchNews();
      } else {
        alert('Failed to delete news article');
      }
    } catch (error) {
      console.error('Error deleting news:', error);
      alert('Error deleting news article');
    }
  };

  const handleEditNews = (article) => {
    setEditingNews(article);
    setNewsForm({ title: article.title, content: article.content });
  };

  const cancelEdit = () => {
    setEditingNews(null);
    setNewsForm({ title: '', content: '' });
  };

  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2>👑 Admin Panel</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="admin-tabs">
          <button 
            className={activeTab === 'news' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('news')}
          >
            📢 News Management
          </button>
          <button 
            className={activeTab === 'users' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('users')}
          >
            👥 User Management
          </button>
          <button 
            className={activeTab === 'channels' ? 'tab active' : 'tab'}
            onClick={() => setActiveTab('channels')}
          >
            💬 Channel Management
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'news' && (
            <div className="news-management">
              <div className="news-form-section">
                <h3>{editingNews ? '✏️ Edit News Article' : '📝 Create News Article'}</h3>
                <form onSubmit={handleNewsSubmit} className="news-form">
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={newsForm.title}
                      onChange={(e) => setNewsForm({...newsForm, title: e.target.value})}
                      placeholder="Enter news title..."
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Content</label>
                    <textarea
                      value={newsForm.content}
                      onChange={(e) => setNewsForm({...newsForm, content: e.target.value})}
                      placeholder="Enter news content..."
                      rows="6"
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" disabled={loading} className="btn-primary">
                      {loading ? 'Saving...' : (editingNews ? 'Update Article' : 'Create Article')}
                    </button>
                    {editingNews && (
                      <button type="button" onClick={cancelEdit} className="btn-secondary">
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="news-list-section">
                <h3>📰 Published Articles</h3>
                <div className="news-list">
                  {news.length === 0 ? (
                    <p className="no-news">No news articles yet. Create the first one!</p>
                  ) : (
                    news.map((article) => (
                      <div key={article.id} className="news-item-admin">
                        <div className="news-header">
                          <h4>{article.title}</h4>
                          <div className="news-actions">
                            <button 
                              onClick={() => handleEditNews(article)}
                              className="btn-edit"
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteNews(article.id)}
                              className="btn-delete"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </div>
                        <div className="news-meta">
                          By {article.author} • {new Date(article.createdAt).toLocaleDateString()}
                          {article.updatedAt !== article.createdAt && (
                            <span className="updated"> • Updated {new Date(article.updatedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                        <div className="news-content-preview">
                          {article.content.length > 200 
                            ? article.content.substring(0, 200) + '...'
                            : article.content
                          }
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="user-management">
              <h3>👥 User Management</h3>
              <p>User management features will be added here (ban/unban users, view user list, etc.)</p>
            </div>
          )}

          {activeTab === 'channels' && (
            <div className="channel-management">
              <h3>💬 Channel Management</h3>
              <p>Channel management features will be added here (create/delete channels, moderate channels, etc.)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
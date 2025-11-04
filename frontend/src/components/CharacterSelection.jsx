import React, { useState, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import './CharacterSelection.css';

const CharacterSelection = ({ user, onCharacterSelect, onLogout }) => {
  const [characters, setCharacters] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [characterForm, setCharacterForm] = useState({
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
  const [showColorPickers, setShowColorPickers] = useState({
    nameColor: false,
    textColor: false,
    backgroundColor: false
  });

  // Get server URL
  const getServerUrl = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hellversechat_server_url');
      if (stored) return stored;
    }
    
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
    fetchCharacters();
  }, []);

  const fetchCharacters = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${serverUrl}/api/characters`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCharacters(data.characters);
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    }
  };

  const handleCreateCharacter = async (e) => {
    e.preventDefault();
    if (!characterForm.name.trim()) return;

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const url = editingCharacter 
        ? `${serverUrl}/api/characters/${editingCharacter.id}`
        : `${serverUrl}/api/characters`;
      
      const method = editingCharacter ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(characterForm)
      });

      if (response.ok) {
        resetForm();
        fetchCharacters();
      } else {
        const errorText = await response.text();
        alert(`Failed to ${editingCharacter ? 'update' : 'create'} character: ${errorText}`);
      }
    } catch (error) {
      console.error('Error with character:', error);
      alert('Error saving character');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCharacter = async (characterId) => {
    if (!confirm('Are you sure you want to delete this character? This cannot be undone.')) return;

    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`${serverUrl}/api/characters/${characterId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        fetchCharacters();
      } else {
        alert('Failed to delete character');
      }
    } catch (error) {
      console.error('Error deleting character:', error);
      alert('Error deleting character');
    }
  };

  const handleEditCharacter = (character) => {
    setEditingCharacter(character);
    setCharacterForm({
      name: character.name,
      species: character.species,
      gender: character.gender,
      age: character.age,
      description: character.description,
      preferences: character.preferences,
      status: character.status,
      nameColor: character.nameColor,
      textColor: character.textColor,
      backgroundColor: character.backgroundColor
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setCharacterForm({
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
    setEditingCharacter(null);
    setShowCreateForm(false);
    setShowColorPickers({
      nameColor: false,
      textColor: false,
      backgroundColor: false
    });
  };

  const handleColorChange = (colorType, color) => {
    setCharacterForm(prev => ({
      ...prev,
      [colorType]: color.hex
    }));
  };

  const toggleColorPicker = (colorType) => {
    setShowColorPickers(prev => ({
      ...prev,
      [colorType]: !prev[colorType]
    }));
  };

  return (
    <div className="character-selection-page">
      {/* Header */}
      <div className="char-select-header">
        <div className="header-content">
          <div className="logo-section">
            <span className="site-logo">🔥</span>
            <h1 className="site-title">HellverseChat</h1>
          </div>
          <div className="user-info">
            <span>Welcome, {user.username}</span>
            <button onClick={onLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </div>

      <div className="character-selection-container">
        <div className="selection-header">
          <h2>Select a Character</h2>
          <p>Choose a character to enter the chat, or create a new one. You can have up to 150 characters.</p>
          <div className="character-count">
            Characters: {characters.length} / 150
          </div>
        </div>

        {/* Character Grid */}
        <div className="characters-grid">
          {characters.map((character) => (
            <div key={character.id} className="character-card">
              <div 
                className="character-preview"
                style={{
                  backgroundColor: character.backgroundColor,
                  color: character.textColor
                }}
              >
                <div className="character-avatar">
                  {character.avatar || '👤'}
                </div>
                <div 
                  className="character-name"
                  style={{ color: character.nameColor }}
                >
                  {character.name}
                </div>
                <div className="character-details">
                  <div className="character-species">{character.species}</div>
                  <div className="character-status">{character.status}</div>
                </div>
              </div>
              
              <div className="character-actions">
                <button 
                  className="select-btn"
                  onClick={() => onCharacterSelect(character)}
                >
                  Enter Chat
                </button>
                <button 
                  className="edit-btn"
                  onClick={() => handleEditCharacter(character)}
                >
                  Edit
                </button>
                <button 
                  className="delete-btn"
                  onClick={() => handleDeleteCharacter(character.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {/* Create New Character Card */}
          {characters.length < 150 && (
            <div className="character-card create-new">
              <div className="create-character-content">
                <div className="create-icon">➕</div>
                <h3>Create New Character</h3>
                <button 
                  className="create-btn"
                  onClick={() => setShowCreateForm(true)}
                >
                  Create Character
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Character Creation/Edit Form */}
        {showCreateForm && (
          <div className="form-overlay">
            <div className="character-form">
              <div className="form-header">
                <h3>{editingCharacter ? '✏️ Edit Character' : '🎭 Create New Character'}</h3>
                <button className="close-form" onClick={resetForm}>×</button>
              </div>

              <form onSubmit={handleCreateCharacter}>
                <div className="form-section">
                  <h4>Basic Information</h4>
                  <div className="form-group">
                    <label>Character Name *</label>
                    <input
                      type="text"
                      value={characterForm.name}
                      onChange={(e) => setCharacterForm({...characterForm, name: e.target.value})}
                      placeholder="Enter character name..."
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Species</label>
                      <select
                        value={characterForm.species}
                        onChange={(e) => setCharacterForm({...characterForm, species: e.target.value})}
                      >
                        <option value="Human">Human</option>
                        <option value="Demon">Demon</option>
                        <option value="Angel">Angel</option>
                        <option value="Dragon">Dragon</option>
                        <option value="Vampire">Vampire</option>
                        <option value="Werewolf">Werewolf</option>
                        <option value="Fae">Fae</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select
                        value={characterForm.gender}
                        onChange={(e) => setCharacterForm({...characterForm, gender: e.target.value})}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Genderfluid">Genderfluid</option>
                        <option value="Unspecified">Unspecified</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Age</label>
                      <select
                        value={characterForm.age}
                        onChange={(e) => setCharacterForm({...characterForm, age: e.target.value})}
                      >
                        <option value="Young Adult">Young Adult</option>
                        <option value="Adult">Adult</option>
                        <option value="Middle-aged">Middle-aged</option>
                        <option value="Elder">Elder</option>
                        <option value="Immortal">Immortal</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Description & Preferences</h4>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      value={characterForm.description}
                      onChange={(e) => setCharacterForm({...characterForm, description: e.target.value})}
                      placeholder="Describe your character's appearance, personality, background..."
                      rows="4"
                    />
                  </div>
                  <div className="form-group">
                    <label>RP Preferences</label>
                    <textarea
                      value={characterForm.preferences}
                      onChange={(e) => setCharacterForm({...characterForm, preferences: e.target.value})}
                      placeholder="What kind of roleplay are you looking for?"
                      rows="3"
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={characterForm.status}
                      onChange={(e) => setCharacterForm({...characterForm, status: e.target.value})}
                    >
                      <option value="Looking for RP">Looking for RP</option>
                      <option value="Available">Available</option>
                      <option value="Busy">Busy</option>
                      <option value="Do Not Disturb">Do Not Disturb</option>
                      <option value="Away">Away</option>
                    </select>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Appearance Customization</h4>
                  <div className="color-controls">
                    <div className="color-group">
                      <label>Name Color</label>
                      <div className="color-picker-control">
                        <div 
                          className="color-preview"
                          style={{ backgroundColor: characterForm.nameColor }}
                          onClick={() => toggleColorPicker('nameColor')}
                        />
                        <span>{characterForm.nameColor}</span>
                        {showColorPickers.nameColor && (
                          <div className="color-picker-popup">
                            <ChromePicker
                              color={characterForm.nameColor}
                              onChange={(color) => handleColorChange('nameColor', color)}
                            />
                            <button 
                              type="button"
                              onClick={() => toggleColorPicker('nameColor')}
                              className="close-picker"
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="color-group">
                      <label>Text Color</label>
                      <div className="color-picker-control">
                        <div 
                          className="color-preview"
                          style={{ backgroundColor: characterForm.textColor }}
                          onClick={() => toggleColorPicker('textColor')}
                        />
                        <span>{characterForm.textColor}</span>
                        {showColorPickers.textColor && (
                          <div className="color-picker-popup">
                            <ChromePicker
                              color={characterForm.textColor}
                              onChange={(color) => handleColorChange('textColor', color)}
                            />
                            <button 
                              type="button"
                              onClick={() => toggleColorPicker('textColor')}
                              className="close-picker"
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="color-group">
                      <label>Background Color</label>
                      <div className="color-picker-control">
                        <div 
                          className="color-preview"
                          style={{ backgroundColor: characterForm.backgroundColor }}
                          onClick={() => toggleColorPicker('backgroundColor')}
                        />
                        <span>{characterForm.backgroundColor}</span>
                        {showColorPickers.backgroundColor && (
                          <div className="color-picker-popup">
                            <ChromePicker
                              color={characterForm.backgroundColor}
                              onChange={(color) => handleColorChange('backgroundColor', color)}
                            />
                            <button 
                              type="button"
                              onClick={() => toggleColorPicker('backgroundColor')}
                              className="close-picker"
                            >
                              Close
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" disabled={loading} className="save-btn">
                    {loading ? 'Saving...' : (editingCharacter ? 'Update Character' : 'Create Character')}
                  </button>
                  <button type="button" onClick={resetForm} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterSelection;
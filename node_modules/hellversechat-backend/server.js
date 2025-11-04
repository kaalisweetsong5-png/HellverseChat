import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Load environment variables
dotenv.config();

// Force production mode if deployed (detect Railway/cloud environment)
const isProduction = process.env.NODE_ENV === 'production' 
  || process.env.RAILWAY_ENVIRONMENT 
  || process.env.PORT 
  || process.argv.includes('--production');

// Override NODE_ENV if we detect cloud deployment
if (isProduction && process.env.NODE_ENV !== 'production') {
  process.env.NODE_ENV = 'production';
  console.log('🚀 Detected cloud deployment, forcing production mode');
}

console.log('🌍 Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  isProduction,
  PORT: process.env.PORT,
  RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT
});

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const CORS_ORIGIN = isProduction 
  ? (origin, callback) => {
      // Allow same origin requests (when frontend and backend are on same domain)
      if (!origin) return callback(null, true);
      // Allow Railway domains and custom domains
      if (origin.includes('railway.app') || origin.includes('hellversechat.com')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    }
  : "http://localhost:5173";

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const users = new Map(); // username -> { passwordHash, email, isAdmin, characters: Map(characterId -> character) }
const characters = new Map(); // characterId -> { id, name, ownerId, ... }
const socketsByCharacter = new Map(); // characterId -> socketId
const bannedUsers = new Set();
const channels = new Set(["main", "general", "adult", "fantasy", "sci-fi"]);
const newsArticles = new Map(); // In-memory news storage (use database in production)

// Admin configuration - add your username here
const ADMIN_USERS = new Set([
  process.env.ADMIN_USERNAME || "admin", // Set via environment variable
  "HellchatAdmin", // Default admin - change this to your username
]);

// Helper functions
const isAdmin = (username) => ADMIN_USERS.has(username);
const isBanned = (username) => bannedUsers.has(username);

const app = express();
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));
app.use(express.json());

// Serve static files from frontend build
const frontendPath = path.join(__dirname, '../frontend/dist');
console.log('🔍 Checking frontend path:', frontendPath);
console.log('🔍 Production mode:', isProduction);

// Always try to serve frontend if it exists (production or development with built frontend)
try {
  if (fs.existsSync(frontendPath)) {
    console.log('✅ Frontend dist found, serving static files');
    app.use(express.static(frontendPath));
    console.log('🎯 Frontend serving configured successfully');
  } else {
    console.log('⚠️  Frontend dist not found at:', frontendPath);
    
    // Fallback API response
    app.get('/', (req, res) => {
      res.json({ 
        message: 'HellverseChat API Server', 
        status: 'running',
        environment: process.env.NODE_ENV,
        isProduction,
        note: 'Frontend not built. Expected at: ' + frontendPath,
        frontendExists: fs.existsSync(frontendPath)
      });
    });
  }
} catch (error) {
  console.log('❌ Error checking frontend:', error.message);
  app.get('/', (req, res) => {
    res.json({ 
      message: 'HellverseChat API Server', 
      status: 'running',
      environment: process.env.NODE_ENV,
      isProduction,
      error: 'Frontend check failed: ' + error.message
    });
  });
}

// Health check endpoint for Railway/Docker
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/signup", async (req, res) => {
  const { username, password, email } = req.body;
  if (!username || !password) return res.status(400).send("missing");
  if (users.has(username)) return res.status(409).send("user exists");
  if (isBanned(username)) return res.status(403).send("banned");
  
  const hash = await bcrypt.hash(password, 10);
  const userData = { 
    passwordHash: hash, 
    email: email || '',
    isAdmin: isAdmin(username),
    characters: new Map(), // Store character IDs -> character data
    createdAt: new Date().toISOString()
  };
  users.set(username, userData);
  
  const token = jwt.sign({ username }, SECRET);
  res.json({ 
    token, 
    username, 
    email: userData.email,
    isAdmin: userData.isAdmin,
    characterCount: 0
  });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const u = users.get(username);
  if (!u) return res.status(401).send("invalid");
  if (isBanned(username)) return res.status(403).send("banned");
  
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).send("invalid");
  
  // Update admin status in case it changed
  u.isAdmin = isAdmin(username);
  
  const token = jwt.sign({ username }, SECRET);
  res.json({ 
    token, 
    username, 
    email: u.email,
    isAdmin: u.isAdmin,
    characterCount: u.characters.size,
    characters: Array.from(u.characters.values())
  });
});

// Character management endpoints
app.get("/api/characters", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const user = users.get(payload.username);
    if (!user) return res.status(404).send("user not found");
    
    res.json({ 
      characters: Array.from(user.characters.values()),
      characterCount: user.characters.size,
      maxCharacters: 150
    });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.post("/api/characters", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const user = users.get(payload.username);
    if (!user) return res.status(404).send("user not found");
    
    if (user.characters.size >= 150) {
      return res.status(400).send("character limit reached");
    }
    
    const { name, species, gender, age, description, preferences, status, nameColor, textColor, backgroundColor } = req.body;
    if (!name?.trim()) return res.status(400).send("character name required");
    
    const characterId = `${payload.username}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const character = {
      id: characterId,
      name: name.trim(),
      ownerId: payload.username,
      species: species || 'Human',
      gender: gender || 'Unspecified',
      age: age || 'Adult',
      description: description || '',
      preferences: preferences || '',
      status: status || 'Looking for RP',
      nameColor: nameColor || '#ff6b6b',
      textColor: textColor || '#ffffff',
      backgroundColor: backgroundColor || '#2c2c54',
      avatar: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    user.characters.set(characterId, character);
    characters.set(characterId, character);
    
    res.json(character);
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.put("/api/characters/:id", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const user = users.get(payload.username);
    if (!user) return res.status(404).send("user not found");
    
    const { id } = req.params;
    const character = user.characters.get(id);
    if (!character) return res.status(404).send("character not found");
    
    const { name, species, gender, age, description, preferences, status, nameColor, textColor, backgroundColor } = req.body;
    
    if (name !== undefined) character.name = name.trim() || character.name;
    if (species !== undefined) character.species = species;
    if (gender !== undefined) character.gender = gender;
    if (age !== undefined) character.age = age;
    if (description !== undefined) character.description = description;
    if (preferences !== undefined) character.preferences = preferences;
    if (status !== undefined) character.status = status;
    if (nameColor !== undefined) character.nameColor = nameColor;
    if (textColor !== undefined) character.textColor = textColor;
    if (backgroundColor !== undefined) character.backgroundColor = backgroundColor;
    
    character.updatedAt = new Date().toISOString();
    
    user.characters.set(id, character);
    characters.set(id, character);
    
    res.json(character);
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.delete("/api/characters/:id", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const user = users.get(payload.username);
    if (!user) return res.status(404).send("user not found");
    
    const { id } = req.params;
    const character = user.characters.get(id);
    if (!character) return res.status(404).send("character not found");
    
    user.characters.delete(id);
    characters.delete(id);
    
    res.json({ success: true, message: "Character deleted" });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.get("/api/characters/:id", (req, res) => {
  const { id } = req.params;
  const character = characters.get(id);
  if (!character) return res.status(404).send("character not found");
  
  // Return public character info (no private data)
  res.json({
    id: character.id,
    name: character.name,
    species: character.species,
    gender: character.gender,
    age: character.age,
    description: character.description,
    status: character.status,
    nameColor: character.nameColor,
    textColor: character.textColor,
    backgroundColor: character.backgroundColor,
    avatar: character.avatar
  });
});

// Admin endpoints
app.post("/admin/ban", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { username } = req.body;
    if (!username) return res.status(400).send("username required");
    if (isAdmin(username)) return res.status(403).send("cannot ban admin");
    
    bannedUsers.add(username);
    
    // Disconnect banned user if online
    const socketId = socketsByUser.get(username);
    if (socketId) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("banned", { reason: "You have been banned by an administrator" });
        socket.disconnect(true);
      }
    }
    
    res.json({ success: true, message: `User ${username} has been banned` });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.post("/admin/unban", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { username } = req.body;
    if (!username) return res.status(400).send("username required");
    
    bannedUsers.delete(username);
    res.json({ success: true, message: `User ${username} has been unbanned` });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.post("/admin/channel", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { name } = req.body;
    if (!name) return res.status(400).send("channel name required");
    
    channels.add(name.toLowerCase());
    io.emit("channel_created", { name: name.toLowerCase(), creator: payload.username });
    res.json({ success: true, message: `Channel #${name} created` });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.delete("/admin/channel/:name", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { name } = req.params;
    if (name === "main") return res.status(400).send("cannot delete main channel");
    
    channels.delete(name);
    io.emit("channel_deleted", { name, deleter: payload.username });
    res.json({ success: true, message: `Channel #${name} deleted` });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.get("/channels", (req, res) => {
  res.json({ channels: Array.from(channels) });
});

// News endpoints
app.get("/api/news", (req, res) => {
  const news = Array.from(newsArticles.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(news);
});

app.post("/api/news", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).send("title and content required");
    
    const newsId = Date.now().toString();
    const article = {
      id: newsId,
      title,
      content,
      author: adminUser.display || payload.username,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    newsArticles.set(newsId, article);
    
    // Broadcast new news to all connected users
    io.emit("news_update", { type: "created", article });
    
    res.json(article);
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.put("/api/news/:id", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { id } = req.params;
    const { title, content } = req.body;
    const article = newsArticles.get(id);
    
    if (!article) return res.status(404).send("news article not found");
    
    if (title) article.title = title;
    if (content) article.content = content;
    article.updatedAt = new Date().toISOString();
    
    newsArticles.set(id, article);
    
    // Broadcast news update to all connected users
    io.emit("news_update", { type: "updated", article });
    
    res.json(article);
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

app.delete("/api/news/:id", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const adminUser = users.get(payload.username);
    if (!adminUser?.isAdmin) return res.status(403).send("admin required");
    
    const { id } = req.params;
    const article = newsArticles.get(id);
    
    if (!article) return res.status(404).send("news article not found");
    
    newsArticles.delete(id);
    
    // Broadcast news deletion to all connected users
    io.emit("news_update", { type: "deleted", articleId: id });
    
    res.json({ success: true, message: "News article deleted" });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
});

// Catch-all handler for production: serve React app for any non-API routes
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    const frontendPath = path.join(__dirname, '../frontend/dist/index.html');
    res.sendFile(frontendPath);
  });
}

const server = http.createServer(app);
const io = new SocketIOServer(server, { 
  cors: { 
    origin: CORS_ORIGIN,
    credentials: true
  } 
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  const characterId = socket.handshake.auth?.characterId;
  if (!token) return next(new Error("auth required"));
  if (!characterId) return next(new Error("character selection required"));
  
  try {
    const payload = jwt.verify(token, SECRET);
    const character = characters.get(characterId);
    
    if (!character || character.ownerId !== payload.username) {
      return next(new Error("invalid character"));
    }
    
    socket.data.username = payload.username;
    socket.data.characterId = characterId;
    socket.data.character = character;
    return next();
  } catch (e) {
    return next(new Error("invalid token"));
  }
});

io.on("connection", (socket) => {
  const username = socket.data.username;
  const characterId = socket.data.characterId;
  const character = socket.data.character;
  const userData = users.get(username);
  
  if (isBanned(username)) {
    socket.emit("banned", { reason: "You are banned from this server" });
    socket.disconnect(true);
    return;
  }
  
  socketsByCharacter.set(characterId, socket.id);

  io.emit("presence", { 
    characterId,
    character: character,
    username: username,
    status: "online",
    isAdmin: userData?.isAdmin || false 
  });

  socket.join("main");

  // Send current channel list to new user
  socket.emit("channels_list", { channels: Array.from(channels) });

  socket.on("message", (payload) => {
    if (isBanned(username)) {
      socket.emit("banned", { reason: "You are banned from this server" });
      socket.disconnect(true);
      return;
    }
    
    const msg = {
      id: Date.now(),
      characterId: characterId,
      character: character,
      username: username,
      isAdmin: userData?.isAdmin || false,
      text: payload.text,
      messageType: payload.messageType || 'normal', // normal, emote, ooc
      ts: new Date().toISOString(),
    };
    io.to(payload.room || "main").emit("message", msg);
  });

  // Admin actions via socket
  socket.on("admin_ban", (payload) => {
    if (!userData?.isAdmin) return;
    
    const { targetUser } = payload;
    if (isAdmin(targetUser)) return; // Cannot ban other admins
    
    bannedUsers.add(targetUser);
    
    // Disconnect all characters of banned user
    const targetUserData = users.get(targetUser);
    if (targetUserData) {
      for (const [charId, char] of targetUserData.characters) {
        const targetSocketId = socketsByCharacter.get(charId);
        if (targetSocketId) {
          const targetSocket = io.sockets.sockets.get(targetSocketId);
          if (targetSocket) {
            targetSocket.emit("banned", { reason: `You have been banned by ${character.name}` });
            targetSocket.disconnect(true);
          }
        }
      }
    }
    
    io.emit("user_banned", { 
      username: targetUser, 
      bannedBy: character.name 
    });
  });

  socket.on("admin_create_channel", (payload) => {
    if (!userData?.isAdmin) return;
    
    const { name } = payload;
    if (!name) return;
    
    const channelName = name.toLowerCase().trim();
    channels.add(channelName);
    io.emit("channel_created", { 
      name: channelName, 
      creator: character.name 
    });
  });

  socket.on("admin_delete_channel", (payload) => {
    if (!userData?.isAdmin) return;
    
    const { name } = payload;
    if (!name || name === "main") return; // Cannot delete main channel
    
    channels.delete(name);
    io.emit("channel_deleted", { 
      name, 
      deleter: character.name 
    });
  });

  socket.on("typing", ({ room, typing }) => {
    socket.to(room || "main").emit("typing", { 
      characterId,
      character,
      typing 
    });
  });

  socket.on("join_room", ({ room }) => {
    // Leave all rooms except the socket's own room
    Array.from(socket.rooms).forEach(r => {
      if (r !== socket.id) {
        socket.leave(r);
      }
    });
    
    // Join the new room
    socket.join(room);
    console.log(`${character.name} (${username}) joined room: ${room}`);
  });

  socket.on("disconnect", () => {
    socketsByCharacter.delete(characterId);
    io.emit("presence", { 
      characterId,
      character,
      username,
      status: "offline",
      isAdmin: userData?.isAdmin || false 
    });
  });
});

// SPA fallback route - MUST be after all API routes
if (fs.existsSync(path.join(__dirname, '../frontend/dist'))) {
  app.get('*', (req, res) => {
    // Only serve SPA for non-API routes
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/health') && !req.path.startsWith('/signup') && !req.path.startsWith('/login') && !req.path.startsWith('/profile')) {
      console.log('📄 Serving index.html for route:', req.path);
      res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    } else {
      // Let API routes handle themselves or return 404
      res.status(404).json({ error: 'API endpoint not found' });
    }
  });
}

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on all interfaces at port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://[your-ip]:${PORT}`);
});

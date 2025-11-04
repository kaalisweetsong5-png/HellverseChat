import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load environment variables
dotenv.config();

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
const CORS_ORIGIN = process.env.NODE_ENV === 'production' 
  ? ["https://hellversechat.com", "https://www.hellversechat.com"] 
  : "http://localhost:5173";

// ES module dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const users = new Map();
const socketsByUser = new Map();
const bannedUsers = new Set();
const channels = new Set(["main", "general", "adult", "fantasy", "sci-fi"]);

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

// Serve static files from frontend build (production only)
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  console.log('Serving static files from:', frontendPath);
  app.use(express.static(frontendPath));
}

// Health check endpoint for Railway/Docker
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/signup", async (req, res) => {
  const { username, password, display, character } = req.body;
  if (!username || !password) return res.status(400).send("missing");
  if (users.has(username)) return res.status(409).send("user exists");
  if (isBanned(username)) return res.status(403).send("banned");
  
  const hash = await bcrypt.hash(password, 10);
  const userData = { 
    passwordHash: hash, 
    display: display || username,
    isAdmin: isAdmin(username),
    character: character || {
      name: display || username,
      avatar: '',
      species: 'Human',
      gender: 'Unspecified',
      age: 'Adult',
      description: '',
      preferences: '',
      status: 'Looking for RP'
    }
  };
  users.set(username, userData);
  
  const token = jwt.sign({ username }, SECRET);
  res.json({ 
    token, 
    username, 
    display: userData.display, 
    character: userData.character,
    isAdmin: userData.isAdmin 
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
    display: u.display, 
    character: u.character,
    isAdmin: u.isAdmin 
  });
});

// Character profile endpoints
app.get("/profile/:username", (req, res) => {
  const { username } = req.params;
  const user = users.get(username);
  if (!user) return res.status(404).send("user not found");
  res.json({ username, display: user.display, character: user.character });
});

app.put("/profile", (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).send("auth required");
  
  try {
    const payload = jwt.verify(token, SECRET);
    const user = users.get(payload.username);
    if (!user) return res.status(404).send("user not found");
    
    const { display, character } = req.body;
    if (display) user.display = display;
    if (character) user.character = { ...user.character, ...character };
    
    res.json({ 
      username: payload.username, 
      display: user.display, 
      character: user.character,
      isAdmin: user.isAdmin 
    });
  } catch (e) {
    return res.status(401).send("invalid token");
  }
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
  if (!token) return next(new Error("auth required"));
  try {
    const payload = jwt.verify(token, SECRET);
    socket.data.username = payload.username;
    return next();
  } catch (e) {
    return next(new Error("invalid token"));
  }
});

io.on("connection", (socket) => {
  const user = socket.data.username;
  const userData = users.get(user);
  
  if (isBanned(user)) {
    socket.emit("banned", { reason: "You are banned from this server" });
    socket.disconnect(true);
    return;
  }
  
  socketsByUser.set(user, socket.id);

  io.emit("presence", { 
    user, 
    status: "online", 
    character: userData?.character,
    isAdmin: userData?.isAdmin || false 
  });

  socket.join("main");

  // Send current channel list to new user
  socket.emit("channels_list", { channels: Array.from(channels) });

  socket.on("message", (payload) => {
    const userProfile = users.get(user);
    if (isBanned(user)) {
      socket.emit("banned", { reason: "You are banned from this server" });
      socket.disconnect(true);
      return;
    }
    
    const msg = {
      id: Date.now(),
      user,
      display: userProfile?.display || user,
      character: userProfile?.character || null,
      isAdmin: userProfile?.isAdmin || false,
      text: payload.text,
      messageType: payload.messageType || 'normal', // normal, emote, ooc
      ts: new Date().toISOString(),
    };
    io.to(payload.room || "main").emit("message", msg);
  });

  // Admin actions via socket
  socket.on("admin_ban", (payload) => {
    const adminUser = users.get(user);
    if (!adminUser?.isAdmin) return;
    
    const { targetUser } = payload;
    if (isAdmin(targetUser)) return; // Cannot ban other admins
    
    bannedUsers.add(targetUser);
    
    // Disconnect banned user
    const targetSocketId = socketsByUser.get(targetUser);
    if (targetSocketId) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit("banned", { reason: `You have been banned by ${adminUser.character?.name || user}` });
        targetSocket.disconnect(true);
      }
    }
    
    io.emit("user_banned", { 
      username: targetUser, 
      bannedBy: adminUser.character?.name || user 
    });
  });

  socket.on("admin_create_channel", (payload) => {
    const adminUser = users.get(user);
    if (!adminUser?.isAdmin) return;
    
    const { name } = payload;
    if (!name) return;
    
    const channelName = name.toLowerCase().trim();
    channels.add(channelName);
    io.emit("channel_created", { 
      name: channelName, 
      creator: adminUser.character?.name || user 
    });
  });

  socket.on("admin_delete_channel", (payload) => {
    const adminUser = users.get(user);
    if (!adminUser?.isAdmin) return;
    
    const { name } = payload;
    if (!name || name === "main") return; // Cannot delete main channel
    
    channels.delete(name);
    io.emit("channel_deleted", { 
      name, 
      deleter: adminUser.character?.name || user 
    });
  });

  socket.on("typing", ({ room, typing }) => {
    socket.to(room || "main").emit("typing", { user, typing });
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
    console.log(`${user} joined room: ${room}`);
  });

  socket.on("disconnect", () => {
    socketsByUser.delete(user);
    const userData = users.get(user);
    io.emit("presence", { 
      user, 
      status: "offline",
      character: userData?.character,
      isAdmin: userData?.isAdmin || false 
    });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on all interfaces at port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://[your-ip]:${PORT}`);
});

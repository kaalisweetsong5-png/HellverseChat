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
  const hash = await bcrypt.hash(password, 10);
  users.set(username, { 
    passwordHash: hash, 
    display: display || username,
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
  });
  const token = jwt.sign({ username }, SECRET);
  res.json({ token, username, display: display || username, character: users.get(username).character });
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const u = users.get(username);
  if (!u) return res.status(401).send("invalid");
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).send("invalid");
  const token = jwt.sign({ username }, SECRET);
  res.json({ token, username, display: u.display, character: u.character });
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
    
    res.json({ username: payload.username, display: user.display, character: user.character });
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
  socketsByUser.set(user, socket.id);

  io.emit("presence", { user, status: "online" });

  socket.join("main");

  socket.on("message", (payload) => {
    const userProfile = users.get(user);
    const msg = {
      id: Date.now(),
      user,
      display: userProfile?.display || user,
      character: userProfile?.character || null,
      text: payload.text,
      messageType: payload.messageType || 'normal', // normal, emote, ooc
      ts: new Date().toISOString(),
    };
    io.to(payload.room || "main").emit("message", msg);
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
    io.emit("presence", { user, status: "offline" });
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on all interfaces at port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://[your-ip]:${PORT}`);
});

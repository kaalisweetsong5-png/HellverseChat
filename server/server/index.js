// server/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // your React client
    methods: ["GET", "POST"]
  }
});

// Listen for new socket connections
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Listen for chat messages
  socket.on("send_message", (data) => {
    console.log(data);
    io.emit("receive_message", data); // broadcast to all clients
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

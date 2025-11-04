# 🔥 Hellchat - F-Chat Style Real-time Chat

A modern real-time chat application inspired by F-Chat, built with Node.js, Socket.IO, and React.

## 🚀 Quick Start for Host

1. **Start the server:**
   ```bash
   cd e:\hellchat\server
   npm start
   ```

2. **Get your network IP for sharing:**
   ```bash
   node get-ip.js
   ```

3. **Start the client:**
   ```bash
   cd client\client
   npm run dev
   ```

## 🌐 How Others Can Join

### For Guests on the Same Network:

1. **Get the invitation link** from the host (they'll run `node get-ip.js` to see it)
2. **Open your browser** and go to the client URL (usually `http://localhost:5173`)
3. **Click "⚙️ Server Config"** on the login page
4. **Enter the host's server URL** (e.g., `http://192.168.1.100:4000`)
5. **Click "Save Server"**
6. **Create an account** or login
7. **Start chatting!**

### For Remote Users (Internet):

The host needs to:
1. **Port forward** port 4000 on their router to their computer
2. **Share their public IP** with port 4000 (e.g., `http://123.456.789.0:4000`)

Or use a service like ngrok:
```bash
# Install ngrok, then:
ngrok http 4000
# Share the generated URL (e.g., https://abc123.ngrok.io)
```

## 🎮 Features

- **Real-time messaging** with Socket.IO
- **Multiple chat rooms/channels** - create and join different rooms
- **User authentication** - secure login/signup system
- **Online user presence** - see who's currently online
- **Typing indicators** - see when someone is typing
- **F-Chat style interface** - familiar UI for F-Chat users
- **Cross-platform** - works on any device with a web browser

## 🔧 Server Configuration

The server listens on all network interfaces (`0.0.0.0:4000`) so others can connect from:
- Same device: `http://localhost:4000`
- Local network: `http://[your-ip]:4000`
- Internet: `http://[public-ip]:4000` (with port forwarding)

## 💬 Usage

1. **Login/Signup** - Create an account or login with existing credentials
2. **Join Channels** - Click on any channel in the sidebar or create new ones
3. **Chat** - Type messages and see real-time responses
4. **See Who's Online** - Check the online users list in the sidebar
5. **Multi-room Support** - Switch between different chat rooms seamlessly

## 🛠️ Development

### Server Dependencies:
- Express.js - Web server
- Socket.IO - Real-time communication
- JWT - Authentication tokens
- bcrypt - Password hashing
- CORS - Cross-origin requests

### Client Dependencies:  
- React - Frontend framework
- Socket.IO Client - Real-time communication
- Vite - Build tool and dev server

## 🔒 Security Notes

- Passwords are hashed with bcrypt
- JWT tokens for session management
- CORS enabled for cross-origin requests
- Change the SECRET key in production!

## 📝 To-Do / Future Features

- Private messaging
- File/image sharing
- User roles and moderation
- Message history persistence
- Push notifications
- Mobile app version

Enjoy chatting! 🎉
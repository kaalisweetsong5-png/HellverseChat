# Frontend Development

This directory will contain the React frontend for HellverseChat.

## Quick Setup

```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install socket.io-client
```

## Structure
```
frontend/
├── src/
│   ├── App.jsx        # Main React component
│   ├── components/    # Chat components
│   └── styles/        # F-chat styling
├── package.json       # Frontend dependencies
└── vite.config.js     # Vite configuration
```

## Development
```bash
npm run dev    # Start development server on http://localhost:5173
```

## Production Build
```bash
npm run build  # Creates dist/ folder for deployment
```

The frontend will connect to the backend server for Socket.IO real-time messaging and authentication.
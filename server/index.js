require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');

const { getDb } = require('./db/schema');
const authRoutes = require('./routes/auth');
const challengeRoutes = require('./routes/challenges');
const teamRoutes = require('./routes/teams');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');

const app = express();
const httpServer = http.createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }
});

app.set('io', io);

// Security & middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads — use persistent volume path in production
const UPLOAD_PATH = process.env.UPLOAD_PATH || path.join(__dirname, 'uploads');
if (!require('fs').existsSync(UPLOAD_PATH)) require('fs').mkdirSync(UPLOAD_PATH, { recursive: true });
app.use('/uploads', express.static(UPLOAD_PATH));
app.set('uploadPath', UPLOAD_PATH);

// Initialize DB
getDb();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Socket.io events
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join:team', (teamId) => {
    socket.join(`team_${teamId}`);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Periodic leaderboard broadcast every 30 seconds
setInterval(() => {
  io.emit('leaderboard:tick');
}, 30000);

// Serve React frontend in production (single-service deployment)
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  // Any non-API route serves the React app
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io') && !req.path.startsWith('/uploads')) {
      res.sendFile(path.join(clientDist, 'index.html'));
    }
  });
}

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`\n🔐 Mystery Vault CTF Server`);
  console.log(`🌐 Running on http://${HOST}:${PORT}`);
  console.log(`📡 Socket.io enabled`);
  console.log(`🗄️  SQLite database initialized`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`🚀 Serving React frontend from client/dist\n`);
  }
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Import database initialization
const { getDb } = require('./db/init');

// Import routes
const topupRoutes = require('./routes/topup');
const walletRoutes = require('./routes/wallet');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.APP_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../')));

// Mock authentication middleware for MVP
app.use((req, res, next) => {
  // Mock user for development
  req.user = { id: 1, email: 'demo@example.com' };
  next();
});

// API Routes
app.use('/api/topup', topupRoutes);
app.use('/api/wallet', walletRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Thunder API status check
app.get('/api/thunder/status', async (req, res) => {
  try {
    const ThunderService = require('./services/thunder');
    const thunderService = new ThunderService();
    const result = await thunderService.getMe();

    if (result.success) {
      res.json({
        success: true,
        data: {
          status: 'connected',
          quota: result.data.data
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Thunder status check error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'ไม่สามารถเชื่อมต่อ Thunder API ได้',
        details: error.message
      }
    });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'ขนาดไฟล์ใหญ่เกินไป',
        code: 'FILE_TOO_LARGE'
      }
    });
  }

  if (error.message === 'ประเภทไฟล์ไม่ถูกต้อง') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'ประเภทไฟล์ไม่ถูกต้อง',
        code: 'INVALID_FILE_TYPE'
      }
    });
  }

  res.status(500).json({
    success: false,
    error: {
      message: 'เกิดข้อผิดพลาดในระบบ',
      details: error.message
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'ไม่พบหน้าที่ต้องการ',
      code: 'NOT_FOUND'
    }
  });
});

// Initialize database and start server
const initServer = async () => {
  try {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Create default user and wallet for MVP
    const db = getDb();
    
    // Create default user
    const userStmt = db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password_hash)
      VALUES (1, 'demo@example.com', 'demo')
    `);
    userStmt.run();

    // Create default wallet
    const walletStmt = db.prepare(`
      INSERT OR IGNORE INTO wallets (user_id, balance)
      VALUES (1, 0)
    `);
    walletStmt.run();

    console.log('Database initialized successfully');

    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend: http://localhost:${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  process.exit(0);
});

// Start the server
initServer();

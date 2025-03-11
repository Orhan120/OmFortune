
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const morgan = require('morgan');

// Database connection
class Database {
  constructor() {
    this.db = new sqlite3.Database('./fortune.db', (err) => {
      if (err) {
        console.error('Database connection error:', err.message);
      } else {
        console.log('Connected to SQLite database');
        this.initTables();
      }
    });
  }

  initTables() {
    // Create tables if they don't exist
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS fortunes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        zodiac TEXT NOT NULL,
        fortune TEXT NOT NULL,
        birthDate TEXT,
        date TEXT NOT NULL,
        deviceInfo TEXT,
        sessionDuration INTEGER,
        phoneModel TEXT,
        browser TEXT,
        os TEXT,
        screenSize TEXT,
        isMobile INTEGER
      )`);
      
      this.db.run(`CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        ipAddress TEXT,
        referrer TEXT
      )`);
      
      this.db.run(`CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        visitors INTEGER DEFAULT 0,
        fortunes INTEGER DEFAULT 0, 
        zodiacCounts TEXT,
        deviceCounts TEXT,
        hourlyStats TEXT
      )`);

      console.log('Database tables initialized');
    });
  }

  get dbInstance() {
    return this.db;
  }
}

// Initialize app and database
const app = express();
const database = new Database();
const db = database.dbInstance;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('./'));

// Güvenlik başlıkları
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; frame-src 'none'; connect-src 'self';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  next();
});
app.use(morgan('dev')); // Logging middleware

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
};

// API Routes
const apiRouter = express.Router();

// Visitors API
apiRouter.get('/visitors', (req, res, next) => {
  db.get('SELECT SUM(count) as total FROM visitors', [], (err, row) => {
    if (err) return next(err);
    res.json({ count: row.total || 0 });
  });
});

apiRouter.post('/visitors', (req, res, next) => {
  const today = new Date().toISOString().split('T')[0];
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const referrer = req.headers.referer || 'direct';
  
  db.get('SELECT * FROM visitors WHERE date = ?', [today], (err, row) => {
    if (err) return next(err);
    
    if (row) {
      db.run('UPDATE visitors SET count = count + 1 WHERE date = ?', [today], function(err) {
        if (err) return next(err);
        res.json({ success: true, count: row.count + 1 });
      });
    } else {
      db.run('INSERT INTO visitors (date, count, ipAddress, referrer) VALUES (?, 1, ?, ?)', 
        [today, ipAddress, referrer], function(err) {
        if (err) return next(err);
        res.json({ success: true, count: 1 });
      });
    }
    
    // Update daily stats
    updateDailyStats(today, 'visitors');
  });
});

// Fortunes API
apiRouter.post('/fortunes', (req, res, next) => {
  try {
    const { name, zodiac, fortune, birthDate, deviceInfo, sessionDuration } = req.body;
    
    // Validation
    if (!name || !zodiac || !fortune) {
      return res.status(400).json({ error: 'Name, zodiac sign and fortune text are required' });
    }
    
    const date = new Date().toISOString();
    const today = date.split('T')[0];
    const isMobile = deviceInfo?.isMobile ? 1 : 0;
    
    // DeviceInfo güvenlik kontrolü
    let safeDeviceInfo = {};
    try {
      if (deviceInfo) {
        // Sadece güvenli alanları kopyala
        safeDeviceInfo = {
          browser: deviceInfo.browser || null,
          os: deviceInfo.os || null,
          isMobile: !!deviceInfo.isMobile,
          phoneModel: deviceInfo.phoneModel || null,
          screenWidth: deviceInfo.screenWidth || null,
          screenHeight: deviceInfo.screenHeight || null
        };
      }
    } catch (e) {
      console.error('DeviceInfo işlenirken hata:', e);
    }
    
    db.run(
      `INSERT INTO fortunes (name, zodiac, fortune, birthDate, date, deviceInfo, sessionDuration, phoneModel, browser, os, screenSize, isMobile) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, 
        zodiac, 
        fortune, 
        birthDate || null, 
        date,
        JSON.stringify(safeDeviceInfo),
        sessionDuration || 0,
        safeDeviceInfo.phoneModel || null,
        safeDeviceInfo.browser || null,
        safeDeviceInfo.os || null,
        safeDeviceInfo.screenWidth && safeDeviceInfo.screenHeight ? `${safeDeviceInfo.screenWidth}x${safeDeviceInfo.screenHeight}` : null,
        isMobile
      ],
      function(err) {
        if (err) {
          console.error('Fortune ekleme hatası:', err);
          return next(err);
        }
        
        const id = this.lastID;
        
        // Update daily stats
        try {
          updateDailyStats(today, 'fortunes', zodiac, currentHour(), isMobile ? 'Mobil' : 'Masaüstü');
        } catch (statsErr) {
          console.error('İstatistik güncelleme hatası:', statsErr);
          // İstatistik hatası nedeniyle ana işlemi durdurmuyoruz
        }
        
        res.json({
          success: true,
          id: id,
          date: date
        });
      }
    );
  } catch (err) {
    console.error('Fortune ekleme genel hatası:', err);
    next(err);
  }
});

apiRouter.get('/fortunes', (req, res, next) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  
  db.all('SELECT * FROM fortunes ORDER BY date DESC LIMIT ? OFFSET ?', [limit, offset], (err, rows) => {
    if (err) {
      console.error('API /fortunes hata:', err);
      return next(err);
    }
    
    // Parse deviceInfo JSON
    const fortunes = (rows || []).map(row => {
      try {
        if (row.deviceInfo) {
          row.deviceInfo = JSON.parse(row.deviceInfo);
        } else {
          row.deviceInfo = {};
        }
      } catch (e) {
        console.error('JSON ayrıştırma hatası:', e);
        row.deviceInfo = {};
      }
      return row;
    });
    
    res.json(fortunes);
  });
});

// Stats API
apiRouter.get('/stats/daily', (req, res, next) => {
  const days = parseInt(req.query.days) || 30;
  
  db.all('SELECT * FROM daily_stats ORDER BY date DESC LIMIT ?', [days], (err, rows) => {
    if (err) return next(err);
    
    // Parse JSON fields
    const stats = rows.map(row => {
      try {
        if (row.zodiacCounts) row.zodiacCounts = JSON.parse(row.zodiacCounts);
        if (row.deviceCounts) row.deviceCounts = JSON.parse(row.deviceCounts);
        if (row.hourlyStats) row.hourlyStats = JSON.parse(row.hourlyStats);
      } catch (e) {
        console.error('Stats parsing error:', e);
      }
      return row;
    });
    
    res.json(stats);
  });
});

// API Documentation route
apiRouter.get('/', (req, res) => {
  res.json({
    name: "OmFortune API",
    version: "1.0.0",
    endpoints: [
      { 
        path: "/api/visitors", 
        methods: ["GET", "POST"],
        description: "Get visitor count or record new visitor" 
      },
      { 
        path: "/api/fortunes", 
        methods: ["GET", "POST"],
        description: "Get fortunes or create new fortune record" 
      },
      { 
        path: "/api/stats/daily", 
        methods: ["GET"],
        description: "Get daily statistics" 
      }
    ]
  });
});

// Mount API router
app.use('/api', apiRouter);

// Add error handler middleware
app.use(errorHandler);

// Helper functions
function currentHour() {
  return new Date().getHours();
}

function updateDailyStats(date, type, zodiac = null, hour = null, deviceType = null) {
  db.get('SELECT * FROM daily_stats WHERE date = ?', [date], (err, row) => {
    if (err) {
      console.error('Error getting daily stats:', err);
      return;
    }
    
    if (row) {
      let zodiacCounts = {};
      let deviceCounts = {};
      let hourlyStats = Array(24).fill(0);
      
      try {
        if (row.zodiacCounts) zodiacCounts = JSON.parse(row.zodiacCounts);
        if (row.deviceCounts) deviceCounts = JSON.parse(row.deviceCounts);
        if (row.hourlyStats) hourlyStats = JSON.parse(row.hourlyStats);
      } catch (e) {
        console.error('Stats parsing error:', e);
      }
      
      // Update stats based on type
      if (type === 'visitors') {
        db.run('UPDATE daily_stats SET visitors = visitors + 1 WHERE date = ?', [date]);
      } else if (type === 'fortunes') {
        // Increment fortune count
        db.run('UPDATE daily_stats SET fortunes = fortunes + 1 WHERE date = ?', [date]);
        
        // Update zodiac stats
        if (zodiac) {
          zodiacCounts[zodiac] = (zodiacCounts[zodiac] || 0) + 1;
          db.run('UPDATE daily_stats SET zodiacCounts = ? WHERE date = ?', [JSON.stringify(zodiacCounts), date]);
        }
        
        // Update hourly stats
        if (hour !== null && hour >= 0 && hour < 24) {
          hourlyStats[hour]++;
          db.run('UPDATE daily_stats SET hourlyStats = ? WHERE date = ?', [JSON.stringify(hourlyStats), date]);
        }
        
        // Update device stats
        if (deviceType) {
          deviceCounts[deviceType] = (deviceCounts[deviceType] || 0) + 1;
          db.run('UPDATE daily_stats SET deviceCounts = ? WHERE date = ?', [JSON.stringify(deviceCounts), date]);
        }
      }
    } else {
      // Create new daily stats record
      let zodiacCounts = {};
      let deviceCounts = {};
      let hourlyStats = Array(24).fill(0);
      
      if (zodiac) zodiacCounts[zodiac] = 1;
      if (deviceType) deviceCounts[deviceType] = 1;
      if (hour !== null && hour >= 0 && hour < 24) hourlyStats[hour] = 1;
      
      db.run(
        'INSERT INTO daily_stats (date, visitors, fortunes, zodiacCounts, deviceCounts, hourlyStats) VALUES (?, ?, ?, ?, ?, ?)',
        [
          date,
          type === 'visitors' ? 1 : 0,
          type === 'fortunes' ? 1 : 0,
          JSON.stringify(zodiacCounts),
          JSON.stringify(deviceCounts),
          JSON.stringify(hourlyStats)
        ],
        function(err) {
          if (err) console.error('Error creating daily stats:', err);
        }
      );
    }
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Server startup
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║                                            ║
║    OmFortune Server                        ║
║    Running on port ${PORT}                     ║
║    http://0.0.0.0:${PORT}                      ║
║                                            ║
║    API: http://0.0.0.0:${PORT}/api              ║
║    Health: http://0.0.0.0:${PORT}/health        ║
║                                            ║
╚════════════════════════════════════════════╝
  `);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  db.close();
  process.exit(0);
});

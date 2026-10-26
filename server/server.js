const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const seedData = require('./utils/seed');
const errorHandler = require('./middleware/errorHandler');
const {
  mongoSanitizer,
  apiLimiter,
  authLimiter,
  trackingLimiter,
  passwordResetLimiter,
  adminActionLimiter,
} = require('./middleware/security');

// Route imports
const authRoutes = require('./routes/authRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const trackingRoutes = require('./routes/trackingRoutes');
const customerRoutes = require('./routes/customerRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingRoutes = require('./routes/settingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const destinationRoutes = require('./routes/destinationRoutes');
const cityRoutes = require('./routes/cityRoutes');
const parcelTypeRoutes = require('./routes/parcelTypeRoutes');
const busRoutes = require('./routes/busRoutes');
const driverRoutes = require('./routes/driverRoutes');
const superadminRoutes = require('./routes/superadminRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const liveRoutes = require('./routes/liveRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database & sync single admin
connectDB().then((conn) => {
  if (conn) {
    seedData();
  }
});

// Trust proxy for secure rate limiting behind reverse proxies (e.g. Nginx, Vercel, Railway, etc.)
app.set('trust proxy', 1);

// 1. Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // Disabled to permit Google Fonts and Vite HMR
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. CORS configuration with environment-aware origin validation
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5000', 'http://127.0.0.1:5000','https://mrcargo.online'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server, curl, and no-origin requests
      if (!origin) return callback(null, true);
      // In non-production, permit all origins for local dev convenience
      if (process.env.NODE_ENV !== 'production') return callback(null, true);
      // In production, validate against allowed whitelist
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Blocked by CORS policy'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// 3. Body parsers with payload size limits (supports custom logo uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 4. NoSQL Query Injection Sanitization
app.use(mongoSanitizer);

// 5. HTTP Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 6. Global API Rate Limiter
app.use('/api', apiLimiter);

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Parcel & Bus Dispatch Management System API',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 7. Targeted Security Rate Limits & API Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/tracking', trackingLimiter, trackingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/parcel-types', parcelTypeRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/audit-logs', adminActionLimiter, auditLogRoutes);
app.use('/api/live', liveRoutes);

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'dist', 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

// Start Server if executed directly
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Parcel & Bus Dispatch Management API running on port ${PORT}`);
    console.log(`🛡️  Security Headers & Rate Limiting Enabled`);
    console.log(`📍 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📦 MongoDB URI connected: ${process.env.MONGODB_URI ? 'Configured' : 'Missing'}`);
    console.log(`=======================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Error: Port ${PORT} is currently in use.`);
      console.error(`💡 Freeing port automatically... Run 'npm run clean-ports' or restart 'npm run dev'.\n`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err.message);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('[Unhandled Rejection]:', reason);
  });
}

module.exports = app;


/**
 * Express Application Configuration & Middleware Setup
 */
const express = require('express');
const path = require('path');
const apiRoutes = require('./routes');

const app = express();
const rootDir = path.resolve(__dirname, '..');

// Middleware
try {
  const cors = require('cors');
  app.use(cors());
} catch (e) {
  // CORS fallback header middleware in case cors package is not installed
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static Assets
app.use(express.static(rootDir));
app.use(express.static(path.join(rootDir, 'public')));
app.use('/public', express.static(path.join(rootDir, 'public')));
app.use('/assets', express.static(path.join(rootDir, 'assets')));

// API Routes
app.use('/api', apiRoutes);

// HTML Page Routes
app.get('/', (req, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(rootDir, 'admin.html')));
app.get('/security', (req, res) => res.sendFile(path.join(rootDir, 'security.html')));

// Global 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint not found: ${req.originalUrl}` });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;

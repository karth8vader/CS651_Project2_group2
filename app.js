/**
 * PicPlate Application Server
 * 
 * This is the main Express application file that configures middleware,
 * sets up routes, and handles errors for the PicPlate application.
 * 
 * PicPlate is a web application that analyzes food images using Google's
 * Vision API and generates recipes using Google's Gemini AI.
 */

// Import required dependencies
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// Import route handlers
var usersRouter = require('./routes/users');
var photosRouter = require('./routes/photos');
var authRouter = require('./routes/auth');
var visionRouter = require('./routes/vision');
var geminiRouter = require('./routes/gemini');
var historyRouter = require('./routes/history');
var imageProxyRouter = require('./routes/imageProxy');

// Import CORS middleware for cross-origin requests
const cors = require('cors');

// Initialize Express application
var app = express();

// Configure allowed origins for CORS
const allowedOrigins = [
  'http://localhost:3000',                       // Local development
  'https://picplate-login-app.wl.r.appspot.com', // Production deployment
];

// Set up CORS middleware with origin validation
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    // or requests from allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow credentials (cookies, authorization headers)
}));

// View engine configuration removed as we're using JSON responses for all routes

// Set up standard Express middleware
app.use(logger('dev'));                                    // HTTP request logging
app.use(express.json({ limit: '50mb' }));                  // Parse JSON request bodies (with increased size limit for images)
app.use(express.urlencoded({ extended: false, limit: '50mb' })); // Parse URL-encoded request bodies
app.use(cookieParser());                                   // Parse cookies

// ===== API ROUTES =====
// Note: API routes must be defined BEFORE the static file middleware
// to ensure they take precedence over the React app's routes

// Base API routes
app.use('/api/users', usersRouter);          // User management endpoints
app.use('/api/photos', photosRouter);        // Google Photos integration
app.use('/api/auth', authRouter);            // Authentication endpoints
app.use('/api/vision', visionRouter);        // Google Vision API integration
app.use('/api/gemini', geminiRouter);        // Google Gemini AI integration
app.use('/api/history', historyRouter);      // User history management
app.use('/api/imageProxy', imageProxyRouter); // Image proxy for Google Photos

// ===== STATIC FILES =====
// Serve the React frontend from the build directory
// This middleware serves static files from the specified directory
app.use(express.static(path.join(__dirname, 'picplate-frontend/build')));

// ===== CATCH-ALL ROUTE =====
// This must be the LAST route defined
// It sends the React app's index.html for any unmatched routes,
// allowing the React router to handle client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'picplate-frontend/build', 'index.html'));
});

// ===== ERROR HANDLING =====
// 404 handler - Convert unhandled requests to an error with 404 status
app.use(function (req, res, next) {
  next(createError(404)); // Create a 404 error and forward to the error handler
});

// Global error handler
app.use(function (err, req, res, next) {
  // Set appropriate status code (default to 500 if not specified)
  const statusCode = err.status || 500;

  // Send JSON error response
  res.status(statusCode).json({
    error: {
      message: err.message,
      status: statusCode,
      // Only include stack trace in development
      ...(req.app.get('env') === 'development' && { stack: err.stack })
    }
  });
});

// Startup confirmation
console.log("✅ App initialized successfully");

// Export the app for use in bin/www
module.exports = app;

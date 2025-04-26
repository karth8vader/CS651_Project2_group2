var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

var photosRouter = require('./routes/photos');
var authRouter = require('./routes/auth');
var visionRouter = require('./routes/vision');
var geminiRouter = require('./routes/gemini');
var historyRouter = require('./routes/history');

const cors = require('cors');

const allowedOrigins = [
  'http://localhost:3000',
  'https://picplate-login-app.wl.r.appspot.com',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Set up view engine (optional, only if you still use views)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// API routes - these need to be defined BEFORE the static file middleware
app.use('/api', indexRouter);
app.use('/api/users', usersRouter);
app.use('/api/photos', photosRouter);
app.use('/api/auth', authRouter);
app.use('/api/vision', visionRouter);
app.use('/api/gemini', geminiRouter);
app.use('/api/history', historyRouter);

// Serve React build from "picplate-frontend/build" - this should come AFTER API routes
app.use(express.static(path.join(__dirname, 'picplate-frontend/build')));

// Catch-all route - this should be the LAST route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'picplate-frontend/build', 'index.html'));
});

// Error handler for 404 and other errors
app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

console.log("✅ App initialized successfully");

module.exports = app;
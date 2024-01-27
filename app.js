var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
var FileStore = require('session-file-store')(session);
var Mutex = require('async-mutex').Mutex;
var fs = require('fs');
var util = require('util');


var indexRouter = require('./routes/index');
var teslaCallbackRouter = require('./routes/tesla-callback.js');
var teslaCertRouter = require('./routes/tesla-cert.js');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var sessionKey;
try {
  sessionKey = fs.readFileSync('/data/session_key', 'utf8').trim();
}
catch(e) {
  sessionKey = require('crypto').randomBytes(64).toString('hex');
  fs.writeFileSync('/data/session_key', sessionKey, 'utf8');
}

console.log(sessionKey);
app.use(session({
  store: new FileStore({
    path: '/data/sessions',
    ttl: 3600
  }),
  secret: sessionKey,
  saveUninitialized: true,
  resave: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

app.use((req, res, next) => {
  req.session.saveAsync = util.promisify(req.session.save.bind(req.session));
  next();
})

const { ClassicLevel } = require('classic-level');
var level = new ClassicLevel('/data/tokens', { valueEncoding: 'json'});
app.locals.db = level;

app.locals.keyMutex = new Mutex();
app.locals.registerMutex = new Mutex();

app.use('/', indexRouter);
app.use('/tesla-callback', teslaCallbackRouter);
app.use('/.well-known/appspecific', teslaCertRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

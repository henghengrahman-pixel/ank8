require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');

const { bootstrapData, getSettings } = require('./helpers/data');
const { ensureDailyReset } = require('./helpers/results');
const { ensureDailyPredictions } = require('./helpers/predictions');

bootstrapData();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  name: 'bandartoto.sid',
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 12
  }
}));

app.use((req, res, next) => {
  try {
    ensureDailyReset();
    ensureDailyPredictions();
  } catch (error) {
    console.error('Daily maintenance error:', error);
  }

  const settings = getSettings();

  res.locals.site = settings;
  res.locals.settings = settings;
  res.locals.baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
  res.locals.adminSession = req.session.admin || null;

  next();
});

app.use('/', require('./routes/site'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  return res.status(404).render('pages/404', {
    pageTitle: '404',
    settings: getSettings()
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).send('Internal Server Error');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

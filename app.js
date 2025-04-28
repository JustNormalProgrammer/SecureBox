const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const passwordRoutes = require('./routes/passwords');
const https = require('https');
const fs = require('fs');

const app = express();

const envtype = process.env.NODE_ENV || 'development';

const allowedOrigins = [
  'https://orange-ground-00ae1ad03.6.azurestaticapps.net',
  'chrome-extension://klaeffpcfgikkahmjkbjklejbifbcffi',
  'https://securebox.netlify.app',
];

if (envtype !== 'production') {
  allowedOrigins.push('http://localhost:5173');
  allowedOrigins.push('http://localhost:8000');
}

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json());

app.use('/login', authRoutes);
app.use('/users', userRoutes);
app.use('/passwords', passwordRoutes);

app.use((err, req, res, next) => {
  return res.status(err.statusCode || 500).json({ detail: err.message || 'Internal server error' });
});

app.use((req, res, next) => {
  res.status(404).send('404 Not Found');
});


const PORT = process.env.PORT || 5000;

if (envtype === 'production') {
  console.log('Production environment detected. Starting HTTPS server...');
  const privateKey = fs.readFileSync('./certs/server.key', 'utf8');
  const certificate = fs.readFileSync('./certs/server.crt', 'utf8');
  const credentials = { key: privateKey, cert: certificate };
  const server = https.createServer(credentials, app);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Production server running on port ${PORT}`);
  });
} else {
app.listen(PORT, () => {
  console.log(`Development server running on port ${PORT}`);
});
}



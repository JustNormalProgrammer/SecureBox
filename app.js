const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const passwordRoutes = require('./routes/passwords');

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'chrome-extension://klaeffpcfgikkahmjkbjklejbifbcffi',
  'http://localhost:8000',
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['*'],
  })
);
app.use(express.json());

app.use('/login', authRoutes);
app.use('/users', userRoutes);
app.use('/passwords', passwordRoutes);

app.use((err, req, res, next) => {
  return res.status(err.statusCode || 500).json({ detail: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
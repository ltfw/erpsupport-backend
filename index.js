const express = require('express');
const authRoutes = require('./routes/auth');
const authenticateToken = require('./middleware/auth');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use('/auth', authRoutes);

// Example protected route
app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Hello, you are authorized', user: req.user });
});

app.get('/', (req, res) => {
  res.send('API is running');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

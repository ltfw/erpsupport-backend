const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { poolConnect, pool, sql } = require('../db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  await poolConnect;
  const request = pool.request();
  request.input('username', sql.VarChar, username);
  request.input('password', sql.VarChar, hashed);

  try {
    await request.query(
      'INSERT INTO Users (username, password) VALUES (@username, @password)'
    );
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  console.log(req.body);
  

  await poolConnect;
  const request = pool.request();
  request.input('username', sql.VarChar, username);

  const result = await request.query(
    'SELECT * FROM Users WHERE UserName = @username'
  );

  const user = result.recordset[0];
  console.log('user',user.KodePassword);
  if (!user) return res.status(400).json({ error: 'User not found' });

  const hashedInputPassword = crypto.createHash('sha1').update(password).digest('hex');
  console.log(hashedInputPassword, user.kodepassword);
  
  if (hashedInputPassword !== user.KodePassword) {
    return res.status(403).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username: username }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  res.json({ token });
});

module.exports = router;

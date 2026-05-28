require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { transferFunds } = require('./transactionController');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'https://abbey-bank-dashboard-2a8h.onrender.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// --- DATABASE AUTO-INITIALIZATION ---
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        transaction_pin VARCHAR(255),
        account_number VARCHAR(20) UNIQUE NOT NULL,
        balance DECIMAL(15, 2) DEFAULT 0.00
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        sender_id INT REFERENCES users(id),
        receiver_id INT REFERENCES users(id),
        amount DECIMAL(15, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reference_id VARCHAR(50)
      );
    `);
    console.log("✅ Database tables checked/created.");
  } catch (err) {
    console.error("❌ Database initialization error:", err.message);
  }
}

pool.connect().then(() => {
  console.log("✅ Successfully connected to PostgreSQL!");
  initializeDatabase();
});

// --- REGISTRATION ---
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, pin } = req.body;
  if (!username || !email || !password || !pin) {
    return res.status(400).json({ error: "All fields including PIN are required" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(String(pin), 10);
    const accountNo = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const signupBonus = 500000.00;
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password, account_number, balance, transaction_pin) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, account_number, balance',
      [username, email.toLowerCase().trim(), hashedPassword, accountNo, signupBonus, hashedPin]
    );
    res.status(201).json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error("❌ REGISTRATION FAILED:", err.message);
    res.status(500).json({ error: "Registration error: Email might be taken" });
  }
});

// --- LOGIN ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });
    
    const { password: _, transaction_pin: __, ...userSafe } = user;
    res.json({ user: userSafe });
  } catch (err) {
    console.error("❌ LOGIN ERROR:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- TRANSACTIONS ---
app.post('/api/transfer', transferFunds);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
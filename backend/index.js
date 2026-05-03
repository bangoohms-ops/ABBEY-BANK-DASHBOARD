const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

// --- DATABASE TABLE SETUP ---
const setupDatabase = async () => {
  try {
    // 1. THIS LINE IS THE FIX: It wipes the old table to add the 'balance' column
    await pool.query('DROP TABLE IF EXISTS users CASCADE;');
    
    // 2. This creates the fresh table with 'username' and 'balance'
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance DECIMAL(15,2) DEFAULT 5000.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);
    console.log("✅ Database Reset and Synced with Balance column");
  } catch (err) {
    console.error("❌ Setup Error:", err);
  }
};
setupDatabase();

// --- AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username || req.body.name, email, password]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (result.rows.length > 0) res.json({ user: result.rows[0] });
    else res.status(401).json({ error: "Invalid login" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TRANSACTION ROUTE ---
app.post('/api/account/update-balance', async (req, res) => {
  const { userId, amount } = req.body; 
  try {
    const result = await pool.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance',
      [amount, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
    res.json({ newBalance: result.rows[0].balance });
  } catch (err) {
    console.log("TRANS ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
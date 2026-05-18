require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Pointing directly to your centralized db tool
const { transferFunds } = require('./controllers/transactionController');

const app = express();
app.use(cors());
app.use(express.json());

// --- AUTOMATED SAFE DATABASE SCHEMA SEEDING ---
const setupDatabase = async () => {
  try {
    // Creates tables without dropping existing customer data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance DECIMAL(15,2) DEFAULT 500000.00,
        account_number VARCHAR(20) UNIQUE,
        phone_number VARCHAR(20),
        transaction_pin VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        sender_id INT REFERENCES users(id),
        receiver_id INT REFERENCES users(id),
        amount DECIMAL(15,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'success',
        reference_id VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Live Ledger Database Schemas Verified and Active!");
  } catch (err) {
    console.error("❌ Database Schema Synchronization Failed:", err.message);
  }
};
setupDatabase();

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // Automatically generate an 10-digit account number for testing profiles on signup
    const generatedAccountNo = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const defaultPin = "1234"; 

    const result = await pool.query(
      'INSERT INTO users (username, email, password, account_number, transaction_pin) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, balance, account_number',
      [username, email, password, generatedAccountNo, defaultPin]
    );
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (result.rows.length > 0) {
      res.json({ user: result.rows[0] });
    } else {
      res.status(401).json({ error: "Invalid login credentials provided" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MODERN TRANSACTIONS PIPELINE GATEWAY ---
// This hooks directly into your transactionController.js file
app.post('/api/transfer', transferFunds);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Akoka Core Backend Engine running live on port ${PORT}`));
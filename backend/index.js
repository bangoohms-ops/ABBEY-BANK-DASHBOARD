const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. DATABASE CONNECTION ---
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: isProduction ? { rejectUnauthorized: false } : false, 
  ...( !process.env.DATABASE_URL && {
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'your_password', 
    port: 5432,
  })
});
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    balance DECIMAL(15,2) DEFAULT 5000.00, -- Give them some starting money!
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`;

pool.connect((err) => {
  if (err) console.log("❌ CONNECTION ERROR:", err.message);
  else console.log("✅ DATABASE ONLINE");
});

// --- 2. DATABASE TABLE SETUP ---
const setupDatabase = async () => {
  try {

    await pool.query('DROP TABLE IF EXISTS users CASCADE;');
    
    // STEP B: Create the table with the correct "username" column
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(createTableQuery);
    console.log("✅ Users table is synced with 'username' column");
  } catch (err) {
    console.error("❌ Error setting up database:", err);
  }
};

setupDatabase();

// --- 3. AUTH ROUTES ---
app.post('/api/auth/register', async (req, res) => {
  // This line accepts EITHER 'username' OR 'name' from your frontend
  const username = req.body.username || req.body.name;
  const { email, password } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username or Name is required" });
  }

  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, password]
    );
    console.log("✅ User Registered:", result.rows[0].username);
    res.json(result.rows[0]);
  } catch (err) {
    console.log("REG ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (result.rows.length > 0) res.json({ user: result.rows[0] });
    else res.status(401).json({ error: "Invalid login" });
  } catch (err) {
    console.log("LOGIN ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- 4. SERVER START ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 SERVER ON PORT ${PORT}`));
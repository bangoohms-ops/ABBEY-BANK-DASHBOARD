const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'your_password', 
  port: 5432,
});

pool.connect((err) => {
  if (err) console.log("❌ CONNECTION ERROR:", err.message);
  else console.log("✅ DATABASE ONLINE");
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, password]
    );
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

app.listen(5000, () => console.log("🚀 SERVER ON PORT 5000"));
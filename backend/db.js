const { Pool } = require("pg");

const pool = new Pool({
  user: "mac",
  host: "localhost",
  database: "postgres",
  password: "",
  port: 5432,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error("❌ Database Connection Error:", err.stack);
  }
  console.log("🐘 PostgreSQL Database Connected");
  release();
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};

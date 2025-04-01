const { Client } = require("pg");
const fs = require("fs").promises;
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const client = new Client({
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DATABASE}`,
});

const initDB = async () => {
  const createSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      login TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS passwords (
        id TEXT PRIMARY KEY,
        passwordfile TEXT NOT NULL,
        logo TEXT NOT NULL,
        platform TEXT NOT NULL,
        login TEXT NOT NULL,
        user_id TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS trusted_devices (
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        is_trusted INTEGER NOT NULL,
        PRIMARY KEY (user_id, device_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS login_entries (
        id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
        timestamp TIMESTAMPTZ NOT NULL,
        user_id TEXT NOT NULL,
        login TEXT NOT NULL,
        page TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    `;
  await client.query(createSQL);
  return;
};

async function addData() {
  const userId = "1";
  const hashedPassword = crypto
    .createHash("sha256")
    .update("password123")
    .digest("hex");
  await client.query(
    "INSERT INTO users (id, first_name, last_name, login, password) VALUES ($1, $2, $3, $4, $5)",
    [userId, "Jan", "Kowalski", "szaleniec", hashedPassword]
  );

  const passwordId = crypto.randomUUID();
  await client.query(
    "INSERT INTO passwords (id, passwordfile, logo, platform, login, user_id) VALUES ($1, $2, $3, $4, $5, $6)",
    [
      passwordId,
      "p1.txt",
      "https://static.vecteezy.com/system/resources/previews/013/948/544/non_2x/gmail-logo-on-transparent-white-background-free-vector.jpg",
      "Google",
      "example@gmail.com",
      userId,
    ]
  );

  const deviceId = crypto.randomUUID();
  await client.query(
    "INSERT INTO trusted_devices (user_id, device_id, user_agent, is_trusted) VALUES ($1, $2, $3, $4)",
    [
      userId,
      deviceId,
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      1,
    ]
  );

  await client.query(
    "INSERT INTO login_entries (timestamp, user_id, login, page) VALUES ($1, $2, $3, $4)",
    ["2023-11-14T12:40:00", userId, "user123", "Twitter"]
  );
  await fs.mkdir(path.join("files", userId), { recursive: true });
  await fs.writeFile(path.join("files", userId, "p1.txt"), "password123");
  return;
}

async function main() {
  console.log("Connecting...");
  try {
    await client.connect();
    console.log("Connected to the database");
  } catch (err) {
    console.error("Connection error", err.stack);
    await client.end();
    return;
  }
  console.log("Creating tables...");
  await initDB();
  console.log("Adding data...");
  await addData(client);
  await client.end();
  console.log("Tables created, seed data added.");
}

main();

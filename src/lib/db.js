// /lib/db.js
import mysql from 'mysql2/promise';
import { Buffer } from 'buffer';

const ssl = process.env.DB_CA_B64
  ? { ca: Buffer.from(process.env.DB_CA_B64, 'base64').toString('utf8') }
  : { rejectUnauthorized: false };

function createPool() {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // rekomendasi karena banyak kolom BIGINT di skema kamu:
    supportBigNumbers: true,
    bigNumberStrings: true,
  });
}

// cache pool saat dev / HMR supaya tidak buat pool baru terus
const g = globalThis;
const db = g.__bionePool ?? createPool();
if (process.env.NODE_ENV !== 'production') g.__bionePool = db;

export default db;

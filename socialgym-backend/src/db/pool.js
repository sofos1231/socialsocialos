// src/db/pool.js
import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const pool = new Pool({
  host: required('PG_HOST'),
  port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
  user: required('PG_USER'),
  password: required('PG_PASSWORD'),
  database: required('PG_DATABASE'),
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => console.log('✅ Connected to PostgreSQL'));
pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error:', err);
  process.exit(1);
});

export default pool;

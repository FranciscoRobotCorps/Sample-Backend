import mysql from 'mysql2/promise';
import { config } from '../config';

let pool: mysql.Pool | undefined;

/**
 * Lazily create the shared MariaDB connection pool.
 * Laziness lets the process start (e.g. for /health) even when the DB
 * is briefly unreachable.
 */
export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.poolSize,
      connectTimeout: config.db.connectionTimeoutMs,
      // Safe defaults for MariaDB:
      charset: 'utf8mb4_unicode_ci',
      dateStrings: true, // return DATETIME/TIMESTAMP as strings, not Date objects
      decimalNumbers: true,
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

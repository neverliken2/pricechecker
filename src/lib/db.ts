/**
 * Database Connection Pool Singleton
 * ใช้ pool เดียวกันตลอด lifecycle ของ application
 */

import { Pool } from 'pg';
import { dbConfig } from './database';

// Cache pools by database name
const pools: Map<string, Pool> = new Map();

// ==================== Timeout Configuration ====================

const TIMEOUTS = {
  CONNECTION: 30000,      // 30 วินาที - รอ connection
  QUERY_DEFAULT: 30000,   // 30 วินาที - query ปกติ
  IDLE: 60000,            // 60 วินาที - ปิด idle connection
};

export { TIMEOUTS };

// ==================== Query Options ====================

export interface QueryOptions {
  timeout?: number;
}

export interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

// ==================== Pool Management ====================

/**
 * Get or create a connection pool for a specific database
 */
export function getPool(databaseName: string): Pool {
  const dbName = databaseName.toLowerCase();
  let pool = pools.get(dbName);
  
  if (!pool) {
    pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbName,
      max: 10,
      min: 1,
      idleTimeoutMillis: TIMEOUTS.IDLE,
      connectionTimeoutMillis: TIMEOUTS.CONNECTION,
      statement_timeout: TIMEOUTS.QUERY_DEFAULT,
      query_timeout: TIMEOUTS.QUERY_DEFAULT,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
    
    pool.on('error', (err) => {
      console.error(`[DB Pool Error] ${dbName}:`, err.message);
    });

    pool.on('connect', () => {
      console.log(`[DB] New connection to: ${dbName}`);
    });
    
    pools.set(dbName, pool);
    console.log(`[DB] Created pool for: ${dbName}`);
  }
  
  return pool;
}

/**
 * Get pool for login database (smlerpmain + provider)
 */
export function getLoginPool(provider: string): Pool {
  const databaseName = `${dbConfig.namePrefix}${provider.toLowerCase()}`;
  return getPool(databaseName);
}

// ==================== Safe Query Functions ====================

/**
 * Execute query safely with error handling
 */
export async function query<T = Record<string, unknown>>(
  databaseName: string,
  sql: string,
  params?: (string | number | boolean | null)[],
  options?: QueryOptions
): Promise<T[]> {
  const pool = getPool(databaseName);
  const client = await pool.connect();
  
  try {
    // Set timeout for this query if specified
    if (options?.timeout) {
      await client.query(`SET statement_timeout = ${options.timeout}`);
    }
    
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    // Reset timeout and release
    if (options?.timeout) {
      await client.query('RESET statement_timeout').catch(() => {});
    }
    client.release();
  }
}

/**
 * Execute query with full result (includes rowCount)
 */
export async function safeQuery<T = Record<string, unknown>>(
  databaseName: string,
  sql: string,
  params?: (string | number | boolean | null)[],
  options?: QueryOptions
): Promise<QueryResult<T>> {
  const pool = getPool(databaseName);
  const client = await pool.connect();
  
  try {
    if (options?.timeout) {
      await client.query(`SET statement_timeout = ${options.timeout}`);
    }
    
    const result = await client.query(sql, params);
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount || 0,
    };
  } finally {
    if (options?.timeout) {
      await client.query('RESET statement_timeout').catch(() => {});
    }
    client.release();
  }
}

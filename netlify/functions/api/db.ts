/**
 * Neon PostgreSQL Database Module
 *
 * Provides a key-value interface for storing room data in Neon PostgreSQL.
 * Uses parameterized queries to prevent SQL injection.
 */

import { neon } from "@neondatabase/serverless";

// Initialize Neon client
const sql = neon(process.env.DATABASE_URL!);

// Ensure the kv_store table exists
let tableInitialized = false;
async function ensureTable() {
  if (tableInitialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT NOT NULL PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    tableInitialized = true;
  } catch (error) {
    console.error("Error initializing table:", error);
  }
}

/**
 * Set stores a key-value pair in the database.
 */
export async function set(key: string, value: any): Promise<void> {
  try {
    await ensureTable();
    const valueJson = JSON.stringify(value);
    await sql`
      INSERT INTO kv_store (key, value, updated_at)
      VALUES (${key}, ${valueJson}::jsonb, NOW())
      ON CONFLICT (key) 
      DO UPDATE SET value = ${valueJson}::jsonb, updated_at = NOW();
    `;
  } catch (error) {
    console.error("Error setting key-value:", error);
    throw new Error("Failed to store data");
  }
}

/**
 * Get retrieves a key-value pair from the database.
 */
export async function get(key: string): Promise<any> {
  try {
    await ensureTable();
    const result = await sql`
      SELECT value FROM kv_store WHERE key = ${key};
    `;
    return result[0]?.value || null;
  } catch (error) {
    console.error("Error getting key-value:", error);
    throw new Error("Failed to retrieve data");
  }
}

/**
 * Delete deletes a key-value pair from the database.
 */
export async function del(key: string): Promise<void> {
  try {
    await ensureTable();
    await sql`
      DELETE FROM kv_store WHERE key = ${key};
    `;
  } catch (error) {
    console.error("Error deleting key-value:", error);
    throw new Error("Failed to delete data");
  }
}

/**
 * GetByPrefix retrieves all key-value pairs with keys starting with the prefix.
 */
export async function getByPrefix(prefix: string): Promise<any[]> {
  try {
    await ensureTable();
    const pattern = `${prefix}%`;
    const result = await sql`
      SELECT value FROM kv_store WHERE key LIKE ${pattern};
    `;
    return result.map((row: any) => row.value);
  } catch (error) {
    console.error("Error getting by prefix:", error);
    throw new Error("Failed to retrieve data by prefix");
  }
}

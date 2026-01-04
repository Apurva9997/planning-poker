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

    // Create admin_users table
    await sql`
      CREATE TABLE IF NOT EXISTS admin_users (
        uid TEXT NOT NULL PRIMARY KEY,
        email TEXT,
        display_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Create session_history table
    await sql`
      CREATE TABLE IF NOT EXISTS session_history (
        id SERIAL PRIMARY KEY,
        room_code TEXT NOT NULL,
        admin_uid TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        player_count INTEGER DEFAULT 0,
        rounds INTEGER DEFAULT 0,
        FOREIGN KEY (admin_uid) REFERENCES admin_users(uid)
      );
    `;

    // Create index for faster queries
    await sql`
      CREATE INDEX IF NOT EXISTS idx_session_history_admin_uid ON session_history(admin_uid);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_session_history_created_at ON session_history(created_at);
    `;

    tableInitialized = true;
  } catch (error) {
    console.error("Error initializing tables:", error);
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

/**
 * Admin user functions
 */
export async function isAdmin(uid: string): Promise<boolean> {
  try {
    await ensureTable();
    const result = await sql`
      SELECT uid FROM admin_users WHERE uid = ${uid};
    `;
    return result.length > 0;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

export async function createAdminUser(
  uid: string,
  email: string | null,
  displayName: string | null
): Promise<void> {
  try {
    await ensureTable();
    await sql`
      INSERT INTO admin_users (uid, email, display_name)
      VALUES (${uid}, ${email}, ${displayName})
      ON CONFLICT (uid) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name;
    `;
  } catch (error) {
    console.error("Error creating admin user:", error);
    throw new Error("Failed to create admin user");
  }
}

/**
 * Session history functions
 */
export async function createSession(
  roomCode: string,
  adminUid: string,
  playerCount: number
): Promise<number> {
  try {
    await ensureTable();
    const result = await sql`
      INSERT INTO session_history (room_code, admin_uid, player_count)
      VALUES (${roomCode}, ${adminUid}, ${playerCount})
      RETURNING id;
    `;
    return result[0].id;
  } catch (error) {
    console.error("Error creating session:", error);
    throw new Error("Failed to create session");
  }
}

export async function updateSession(
  sessionId: number,
  updates: { endedAt?: Date; playerCount?: number; rounds?: number }
): Promise<void> {
  try {
    await ensureTable();
    if (updates.endedAt !== undefined) {
      await sql`
        UPDATE session_history
        SET ended_at = ${updates.endedAt}
        WHERE id = ${sessionId};
      `;
    }
    if (updates.playerCount !== undefined) {
      await sql`
        UPDATE session_history
        SET player_count = ${updates.playerCount}
        WHERE id = ${sessionId};
      `;
    }
    if (updates.rounds !== undefined) {
      await sql`
        UPDATE session_history
        SET rounds = ${updates.rounds}
        WHERE id = ${sessionId};
      `;
    }
  } catch (error) {
    console.error("Error updating session:", error);
    throw new Error("Failed to update session");
  }
}

export async function getSessionsByAdmin(
  adminUid: string,
  limit: number = 50
): Promise<any[]> {
  try {
    await ensureTable();
    const result = await sql`
      SELECT * FROM session_history
      WHERE admin_uid = ${adminUid}
      ORDER BY created_at DESC
      LIMIT ${limit};
    `;
    return result;
  } catch (error) {
    console.error("Error getting sessions:", error);
    throw new Error("Failed to get sessions");
  }
}

export async function getAnalyticsByAdmin(adminUid: string): Promise<any> {
  try {
    await ensureTable();

    // Get total sessions
    const sessionsResult = await sql`
      SELECT COUNT(*) as count FROM session_history WHERE admin_uid = ${adminUid};
    `;
    const totalSessions = parseInt(sessionsResult[0].count) || 0;

    // Get unique rooms
    const roomsResult = await sql`
      SELECT COUNT(DISTINCT room_code) as count FROM session_history WHERE admin_uid = ${adminUid};
    `;
    const totalRooms = parseInt(roomsResult[0].count) || 0;

    // Get total players (sum of player_count)
    const playersResult = await sql`
      SELECT SUM(player_count) as total FROM session_history WHERE admin_uid = ${adminUid};
    `;
    const totalPlayers = parseInt(playersResult[0].total) || 0;

    // Get average session duration
    const durationResult = await sql`
      SELECT AVG(EXTRACT(EPOCH FROM (ended_at - created_at)) * 1000) as avg_duration
      FROM session_history
      WHERE admin_uid = ${adminUid} AND ended_at IS NOT NULL;
    `;
    const averageSessionDuration =
      parseInt(durationResult[0].avg_duration) || 0;

    // Get average players per session
    const avgPlayersResult = await sql`
      SELECT AVG(player_count) as avg_players FROM session_history WHERE admin_uid = ${adminUid};
    `;
    const averagePlayersPerSession =
      parseFloat(avgPlayersResult[0].avg_players) || 0;

    return {
      totalSessions,
      totalRooms,
      totalPlayers,
      averageSessionDuration,
      averagePlayersPerSession,
      sessionsByDate: [], // Can be implemented if needed
    };
  } catch (error) {
    console.error("Error getting analytics:", error);
    throw new Error("Failed to get analytics");
  }
}

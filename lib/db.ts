import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { UserMemory } from './types';

// Lazy-initialized SQL helper
let sql: NeonQueryFunction<false, false> | null = null;

/**
 * Get the SQL query function, initializing if needed
 * Returns null if DATABASE_URL is not configured
 */
function getSQL(): NeonQueryFunction<false, false> | null {
  if (sql) return sql;
  
  const databaseUrl = process.env.DATABASE_URL;
  
  // Check if DATABASE_URL is configured and looks like a valid URL
  if (!databaseUrl || !databaseUrl.startsWith('postgres')) {
    console.warn('DATABASE_URL not configured or invalid, database features disabled');
    return null;
  }
  
  try {
    sql = neon(databaseUrl);
    return sql;
  } catch (error) {
    console.error('Failed to initialize database connection:', error);
    return null;
  }
}

/**
 * Initialize the database schema
 * Creates user_memory table if it doesn't exist
 */
export async function initializeDatabase(): Promise<boolean> {
  const db = getSQL();
  if (!db) {
    console.warn('Database not available, skipping initialization');
    return false;
  }
  
  try {
    await db`
      CREATE TABLE IF NOT EXISTS user_memory (
        session_id TEXT PRIMARY KEY,
        memory JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

/**
 * Retrieve user memory from the database
 * @param sessionId - The session ID to look up
 * @returns UserMemory or null if not found or DB unavailable
 */
export async function getMemoryFromDB(sessionId: string): Promise<UserMemory | null> {
  const db = getSQL();
  if (!db) return null;
  
  try {
    const result = await db`
      SELECT memory FROM user_memory WHERE session_id = ${sessionId}
    `;
    
    if (result.length === 0) {
      return null;
    }
    
    return result[0].memory as UserMemory;
  } catch (error) {
    console.error('Failed to get memory from DB:', error);
    return null;
  }
}

/**
 * Save or update user memory in the database
 * @param memory - The UserMemory object to save
 * @returns true if saved successfully, false otherwise
 */
export async function saveMemoryToDB(memory: UserMemory): Promise<boolean> {
  const db = getSQL();
  if (!db) return false;
  
  try {
    await db`
      INSERT INTO user_memory (session_id, memory, created_at, updated_at)
      VALUES (${memory.sessionId}, ${JSON.stringify(memory)}, NOW(), NOW())
      ON CONFLICT (session_id)
      DO UPDATE SET
        memory = ${JSON.stringify(memory)},
        updated_at = NOW()
    `;
    return true;
  } catch (error) {
    console.error('Failed to save memory to DB:', error);
    return false;
  }
}

/**
 * Check if database is available
 */
export function isDatabaseAvailable(): boolean {
  return getSQL() !== null;
}

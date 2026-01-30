import { UserMemory, MasteryForecast } from './types';
import { getMemoryFromDB, saveMemoryToDB } from './db';
import { DEFAULT_USER_PROFILE } from './core-vocab';

// In-memory cache as fallback when DB is unavailable
const memoryCache = new Map<string, UserMemory>();

/**
 * Create an empty memory object with defaults
 * @param sessionId - The session ID for this memory
 */
export function createEmptyMemory(sessionId: string): UserMemory {
  const now = new Date().toISOString();
  
  return {
    sessionId,
    userProfile: { ...DEFAULT_USER_PROFILE },
    iepContext: undefined,
    recentGoals: [],
    recentUtterances: [],
    preferredWords: {},
    wordStats: {},
    combinationStats: {},
    masteryForecast: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get memory for a session
 * Tries DB first, falls back to cache, creates new if neither exists
 * @param sessionId - The session ID to retrieve
 */
export async function getMemory(sessionId: string): Promise<UserMemory> {
  // Try database first
  try {
    const dbMemory = await getMemoryFromDB(sessionId);
    if (dbMemory) {
      // Update cache with DB value
      memoryCache.set(sessionId, dbMemory);
      return dbMemory;
    }
  } catch (error) {
    console.error('DB lookup failed, trying cache:', error);
  }
  
  // Try cache
  const cachedMemory = memoryCache.get(sessionId);
  if (cachedMemory) {
    return cachedMemory;
  }
  
  // Create new memory
  const newMemory = createEmptyMemory(sessionId);
  memoryCache.set(sessionId, newMemory);
  
  // Try to persist to DB (non-blocking)
  saveMemory(newMemory).catch(err => 
    console.error('Failed to persist new memory:', err)
  );
  
  return newMemory;
}

/**
 * Save memory to both database and cache
 * @param memory - The UserMemory to save
 */
export async function saveMemory(memory: UserMemory): Promise<void> {
  // Update timestamp
  memory.updatedAt = new Date().toISOString();
  
  // Always update cache
  memoryCache.set(memory.sessionId, memory);
  
  // Try to save to DB (don't fail if DB is unavailable)
  try {
    await saveMemoryToDB(memory);
  } catch (error) {
    console.error('Failed to save to DB, cached only:', error);
  }
}

/**
 * Update word statistics for used words
 * @param sessionId - The session ID
 * @param words - Array of words that were used
 */
export async function updateWordStats(sessionId: string, words: string[]): Promise<UserMemory> {
  const memory = await getMemory(sessionId);
  const now = new Date().toISOString();
  
  for (const word of words) {
    const normalizedWord = word.toLowerCase();
    
    if (memory.wordStats[normalizedWord]) {
      memory.wordStats[normalizedWord].count += 1;
      memory.wordStats[normalizedWord].lastUsedAt = now;
    } else {
      memory.wordStats[normalizedWord] = {
        count: 1,
        lastUsedAt: now,
      };
    }
    
    // Also update preferred words
    memory.preferredWords[normalizedWord] = 
      (memory.preferredWords[normalizedWord] || 0) + 1;
  }
  
  // Recalculate mastery forecast
  memory.masteryForecast = calculateMasteryForecast(memory);
  
  await saveMemory(memory);
  return memory;
}

/**
 * Update combination statistics for an utterance
 * Extracts and counts 2-word combinations
 * @param sessionId - The session ID
 * @param utterance - The full utterance/sentence
 */
export async function updateCombinationStats(
  sessionId: string, 
  utterance: string
): Promise<UserMemory> {
  const memory = await getMemory(sessionId);
  
  // Extract words from utterance
  const words = utterance
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  // Create 2-word combinations
  for (let i = 0; i < words.length - 1; i++) {
    const combination = `${words[i]}+${words[i + 1]}`;
    
    if (memory.combinationStats[combination]) {
      memory.combinationStats[combination].count += 1;
    } else {
      memory.combinationStats[combination] = { count: 1 };
    }
  }
  
  // Add to recent utterances (keep last 20)
  memory.recentUtterances.unshift(utterance);
  if (memory.recentUtterances.length > 20) {
    memory.recentUtterances = memory.recentUtterances.slice(0, 20);
  }
  
  await saveMemory(memory);
  return memory;
}

/**
 * Calculate mastery forecast based on word statistics
 * - emerging: count < 5
 * - developing: count 5-15
 * - mastered: count > 15
 * @param memory - The UserMemory object
 */
export function calculateMasteryForecast(memory: UserMemory): MasteryForecast[] {
  const forecasts: MasteryForecast[] = [];
  
  for (const [word, stats] of Object.entries(memory.wordStats)) {
    let level: MasteryForecast['level'];
    let projectedMasteryDate: string | undefined;
    
    if (stats.count > 15) {
      level = 'mastered';
    } else if (stats.count >= 5) {
      level = 'developing';
      // Estimate days to mastery based on current usage rate
      const daysToMastery = Math.ceil((16 - stats.count) * 2);
      const projectedDate = new Date();
      projectedDate.setDate(projectedDate.getDate() + daysToMastery);
      projectedMasteryDate = projectedDate.toISOString().split('T')[0];
    } else {
      level = 'emerging';
      // Longer estimate for emerging words
      const daysToMastery = Math.ceil((16 - stats.count) * 3);
      const projectedDate = new Date();
      projectedDate.setDate(projectedDate.getDate() + daysToMastery);
      projectedMasteryDate = projectedDate.toISOString().split('T')[0];
    }
    
    forecasts.push({
      word,
      level,
      projectedMasteryDate,
    });
  }
  
  // Sort by level priority: emerging first, then developing, then mastered
  const levelOrder = { emerging: 0, developing: 1, mastered: 2 };
  forecasts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  
  return forecasts;
}

/**
 * Get memory from cache only (synchronous)
 * Useful for quick lookups when DB access isn't needed
 */
export function getMemoryFromCache(sessionId: string): UserMemory | undefined {
  return memoryCache.get(sessionId);
}

/**
 * Clear memory cache (useful for testing)
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

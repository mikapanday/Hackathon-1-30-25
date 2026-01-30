import { tool } from 'ai';
import { z } from 'zod';
import { SlotType, PlanStep, UserMemory, SentenceSlot } from '@/lib/types';
import { CORE_VOCABULARY, STEP_ORDER } from '@/lib/core-vocab';
import { getMemory, saveMemory } from '@/lib/memory';

// Zod schema for SentenceSlot
const SentenceSlotSchema = z.object({
  type: z.enum(['WHO', 'ACTION', 'OBJECT', 'LOCATION', 'MODIFIERS']),
  value: z.string().nullable(),
  isCustom: z.boolean(),
});

// Zod schema for SlotType
const SlotTypeSchema = z.enum(['WHO', 'ACTION', 'OBJECT', 'LOCATION', 'MODIFIERS']);

/**
 * Tool 1: planFromGoal
 * Creates a 1-10 step plan based on goal complexity
 */
export const planFromGoal = tool({
  description: 'Creates a 1-10 step plan based on the user\'s communication goal complexity',
  inputSchema: z.object({
    goal: z.string().describe('The user\'s communication goal'),
    hasIEPContext: z.boolean().describe('Whether IEP context is available'),
  }),
  execute: async ({ goal, hasIEPContext }): Promise<{ steps: PlanStep[]; totalSteps: number }> => {
    // Base steps for simple goals
    const baseSteps: PlanStep[] = [
      { id: 1, description: 'Analyze the communication goal', status: 'pending' },
      { id: 2, description: 'Determine sentence structure', status: 'pending' },
      { id: 3, description: 'Fetch core vocabulary candidates', status: 'pending' },
      { id: 4, description: 'Apply user preferences', status: 'pending' },
      { id: 5, description: 'Finalize utterance options', status: 'pending' },
    ];

    // Add IEP-specific steps if context exists
    if (hasIEPContext) {
      baseSteps.splice(1, 0, {
        id: 2,
        description: 'Cross-reference with IEP target words',
        status: 'pending',
      });
    }

    // Add complexity-based steps for longer goals
    if (goal.length > 50) {
      baseSteps.push({
        id: baseSteps.length + 1,
        description: 'Fetch additional vocabulary from external sources',
        status: 'pending',
      });
    }

    // Re-number steps
    const steps = baseSteps.map((step, index) => ({
      ...step,
      id: index + 1,
    }));

    return {
      steps,
      totalSteps: steps.length,
    };
  },
});

/**
 * Tool 2: analyzeGoal
 * Analyzes the user's goal to determine intent and context
 */
export const analyzeGoal = tool({
  description: 'Analyzes the user\'s goal to determine communicative intent, environment, and suggested slots',
  inputSchema: z.object({
    goal: z.string().describe('The user\'s communication goal'),
    iepContext: z.string().optional().describe('Optional IEP context for personalization'),
  }),
  execute: async ({ goal }): Promise<{
    communicativeIntent: string;
    environment: string;
    suggestedSlots: SlotType[];
    complexity: string;
  }> => {
    // Determine complexity based on goal length and keywords
    const wordCount = goal.split(/\s+/).length;
    let complexity: 'simple' | 'moderate' | 'complex';
    
    if (wordCount <= 5) {
      complexity = 'simple';
    } else if (wordCount <= 15) {
      complexity = 'moderate';
    } else {
      complexity = 'complex';
    }

    // Determine suggested slots based on complexity
    let suggestedSlots: SlotType[];
    if (complexity === 'simple') {
      suggestedSlots = ['WHO', 'ACTION'];
    } else if (complexity === 'moderate') {
      suggestedSlots = ['WHO', 'ACTION', 'OBJECT'];
    } else {
      suggestedSlots = STEP_ORDER;
    }

    // Infer environment from keywords
    let environment = 'general';
    const lowerGoal = goal.toLowerCase();
    if (lowerGoal.includes('school') || lowerGoal.includes('class') || lowerGoal.includes('teacher')) {
      environment = 'school';
    } else if (lowerGoal.includes('home') || lowerGoal.includes('family') || lowerGoal.includes('mom') || lowerGoal.includes('dad')) {
      environment = 'home';
    } else if (lowerGoal.includes('play') || lowerGoal.includes('friend') || lowerGoal.includes('game')) {
      environment = 'social';
    }

    // Infer communicative intent
    let communicativeIntent = 'request';
    if (lowerGoal.includes('tell') || lowerGoal.includes('share') || lowerGoal.includes('say')) {
      communicativeIntent = 'comment';
    } else if (lowerGoal.includes('ask') || lowerGoal.includes('question')) {
      communicativeIntent = 'question';
    } else if (lowerGoal.includes('refuse') || lowerGoal.includes('don\'t want') || lowerGoal.includes('stop')) {
      communicativeIntent = 'refusal';
    } else if (lowerGoal.includes('greet') || lowerGoal.includes('hello') || lowerGoal.includes('hi')) {
      communicativeIntent = 'greeting';
    }

    return {
      communicativeIntent,
      environment,
      suggestedSlots,
      complexity,
    };
  },
});

/**
 * Tool 3: proposeSentenceSlots
 * Determines which slots to use based on goal complexity
 */
export const proposeSentenceSlots = tool({
  description: 'Determines which sentence slots to use based on goal complexity',
  inputSchema: z.object({
    goal: z.string().describe('The user\'s communication goal'),
    complexity: z.enum(['simple', 'moderate', 'complex']).describe('Goal complexity level'),
  }),
  execute: async ({ complexity }): Promise<{
    slots: SlotType[];
    template: string;
    requiredSlots: SlotType[];
    optionalSlots: SlotType[];
  }> => {
    let slots: SlotType[];
    let requiredSlots: SlotType[];
    let optionalSlots: SlotType[];
    let template: string;

    switch (complexity) {
      case 'simple':
        slots = ['WHO', 'ACTION'];
        requiredSlots = ['WHO', 'ACTION'];
        optionalSlots = [];
        template = '[WHO] [ACTION]';
        break;
      case 'moderate':
        slots = ['WHO', 'ACTION', 'OBJECT'];
        requiredSlots = ['WHO', 'ACTION'];
        optionalSlots = ['OBJECT'];
        template = '[WHO] [ACTION] [OBJECT]';
        break;
      case 'complex':
      default:
        slots = STEP_ORDER;
        requiredSlots = ['WHO', 'ACTION'];
        optionalSlots = ['OBJECT', 'LOCATION', 'MODIFIERS'];
        template = '[WHO] [ACTION] [OBJECT] [LOCATION] [MODIFIERS]';
        break;
    }

    return {
      slots,
      template,
      requiredSlots,
      optionalSlots,
    };
  },
});

/**
 * Tool 4: fetchCoreCandidates
 * Returns core vocabulary words for a specific slot
 */
export const fetchCoreCandidates = tool({
  description: 'Returns core vocabulary words for a specific slot type',
  inputSchema: z.object({
    slot: SlotTypeSchema.describe('The slot type to fetch candidates for'),
    context: z.string().optional().describe('Optional context to help filter candidates'),
  }),
  execute: async ({ slot }): Promise<{ candidates: string[] }> => {
    const candidates = CORE_VOCABULARY[slot as SlotType] || [];
    return { candidates };
  },
});

/**
 * Tool 5: memoryRead
 * Reads the user's memory/history
 */
export const memoryRead = tool({
  description: 'Reads the user\'s memory and history for personalization',
  inputSchema: z.object({
    sessionId: z.string().describe('The session ID to read memory for'),
  }),
  execute: async ({ sessionId }): Promise<UserMemory> => {
    const memory = await getMemory(sessionId);
    return memory;
  },
});

/**
 * Tool 6: memoryWrite
 * Updates the user's memory
 */
export const memoryWrite = tool({
  description: 'Updates the user\'s memory with new information',
  inputSchema: z.object({
    sessionId: z.string().describe('The session ID to update memory for'),
    updates: z.object({
      recentGoals: z.array(z.string()).optional(),
      recentUtterances: z.array(z.string()).optional(),
      preferredWords: z.record(z.string(), z.number()).optional(),
      iepContext: z.object({
        rawText: z.string().optional(),
        extractedGoals: z.array(z.string()).optional(),
        targetWords: z.array(z.string()).optional(),
      }).optional(),
    }).describe('Partial updates to apply to the memory'),
  }),
  execute: async ({ sessionId, updates }): Promise<{ success: boolean }> => {
    try {
      const memory = await getMemory(sessionId);
      
      // Merge updates
      if (updates.recentGoals) {
        memory.recentGoals = [...updates.recentGoals, ...memory.recentGoals].slice(0, 20);
      }
      if (updates.recentUtterances) {
        memory.recentUtterances = [...updates.recentUtterances, ...memory.recentUtterances].slice(0, 20);
      }
      if (updates.preferredWords) {
        memory.preferredWords = { ...memory.preferredWords, ...updates.preferredWords };
      }
      if (updates.iepContext) {
        memory.iepContext = { ...memory.iepContext, ...updates.iepContext };
      }
      
      await saveMemory(memory);
      return { success: true };
    } catch (error) {
      console.error('Failed to write memory:', error);
      return { success: false };
    }
  },
});

/**
 * Tool 7: fetchDatamuseCandidates
 * Fetches semantically related words from Datamuse API
 */
export const fetchDatamuseCandidates = tool({
  description: 'Fetches semantically related words from the Datamuse API for vocabulary expansion',
  inputSchema: z.object({
    slot: SlotTypeSchema.describe('The slot type to fetch candidates for'),
    topic: z.string().describe('The topic to find related words for'),
    relatedWords: z.array(z.string()).optional().describe('Optional related words to refine results'),
  }),
  execute: async ({ topic, relatedWords }): Promise<{ candidates: string[] }> => {
    try {
      // Build Datamuse API URL
      let url = `https://api.datamuse.com/words?ml=${encodeURIComponent(topic)}&max=15`;
      
      // Add related words trigger if provided
      if (relatedWords && relatedWords.length > 0) {
        url += `&rel_trg=${encodeURIComponent(relatedWords[0])}`;
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Datamuse API error:', response.status);
        return { candidates: [] };
      }

      const data = await response.json() as Array<{ word: string; score?: number }>;
      
      // Filter to simple words: no spaces, less than 10 characters
      const filtered = data
        .map(item => item.word)
        .filter(word => !word.includes(' ') && word.length < 10)
        .slice(0, 10);

      return { candidates: filtered };
    } catch (error) {
      console.error('Failed to fetch from Datamuse:', error);
      return { candidates: [] };
    }
  },
});

/**
 * Tool 8: fetchLexicalInfo
 * Gets part of speech info from WordsAPI via RapidAPI
 */
export const fetchLexicalInfo = tool({
  description: 'Gets part of speech and frequency information for words using WordsAPI',
  inputSchema: z.object({
    words: z.array(z.string()).describe('Array of words to get lexical info for'),
  }),
  execute: async ({ words }): Promise<{
    wordInfo: Array<{ word: string; partOfSpeech: string; isSimple: boolean }>;
  }> => {
    const rapidApiKey = process.env.RAPIDAPI_KEY;
    
    if (!rapidApiKey) {
      console.warn('RAPIDAPI_KEY not configured, returning default word info');
      return {
        wordInfo: words.map(word => ({
          word,
          partOfSpeech: 'unknown',
          isSimple: true, // Assume simple if we can't check
        })),
      };
    }

    const wordInfo: Array<{ word: string; partOfSpeech: string; isSimple: boolean }> = [];

    for (const word of words) {
      try {
        const response = await fetch(
          `https://wordsapiv1.p.rapidapi.com/words/${encodeURIComponent(word)}`,
          {
            headers: {
              'X-RapidAPI-Key': rapidApiKey,
              'X-RapidAPI-Host': 'wordsapiv1.p.rapidapi.com',
            },
          }
        );

        if (!response.ok) {
          wordInfo.push({ word, partOfSpeech: 'unknown', isSimple: true });
          continue;
        }

        const data = await response.json() as {
          results?: Array<{ partOfSpeech?: string }>;
          frequency?: number;
        };

        // Extract part of speech from first result
        const partOfSpeech = data.results?.[0]?.partOfSpeech || 'unknown';
        
        // Mark as simple if frequency exists and > 3
        const isSimple = data.frequency !== undefined && data.frequency > 3;

        wordInfo.push({ word, partOfSpeech, isSimple });
      } catch (error) {
        console.error(`Failed to fetch lexical info for "${word}":`, error);
        wordInfo.push({ word, partOfSpeech: 'unknown', isSimple: true });
      }
    }

    return { wordInfo };
  },
});

/**
 * Tool 9: finalizeUtterance
 * Constructs final utterance from filled slots
 */
export const finalizeUtterance = tool({
  description: 'Constructs the final utterance from filled sentence slots',
  inputSchema: z.object({
    slots: z.array(SentenceSlotSchema).describe('Array of filled sentence slots'),
    context: z.object({
      sessionId: z.string(),
      preferredWords: z.record(z.string(), z.number()).optional(),
    }).optional().describe('Optional user context for personalization'),
  }),
  execute: async ({ slots }): Promise<{
    primaryUtterance: string;
    alternatives: string[];
    wordsUsed: string[];
  }> => {
    // Extract words from slots in order
    const wordsUsed: string[] = [];
    const slotOrder: SlotType[] = ['WHO', 'ACTION', 'OBJECT', 'LOCATION', 'MODIFIERS'];
    
    // Build primary utterance from slot values in order
    for (const slotType of slotOrder) {
      const slot = slots.find(s => s.type === slotType);
      if (slot?.value) {
        wordsUsed.push(slot.value);
      }
    }

    const primaryUtterance = wordsUsed.join(' ');

    // Generate alternatives with slight variations
    const alternatives: string[] = [];
    
    // Alternative 1: Add emphasis word if not already present
    if (wordsUsed.length >= 2 && !wordsUsed.includes('please')) {
      alternatives.push(primaryUtterance + ' please');
    }
    
    // Alternative 2: Simplified version (first 2-3 words)
    if (wordsUsed.length > 3) {
      alternatives.push(wordsUsed.slice(0, 3).join(' '));
    }
    
    // Alternative 3: Reorder if it makes sense (e.g., "Want ball" instead of "I want ball")
    if (wordsUsed.length >= 2 && wordsUsed[0]?.toLowerCase() === 'i') {
      alternatives.push(wordsUsed.slice(1).join(' '));
    }

    // Ensure we have at least 2 alternatives
    if (alternatives.length === 0) {
      alternatives.push(primaryUtterance);
    }
    if (alternatives.length === 1) {
      alternatives.push(primaryUtterance + '!');
    }

    return {
      primaryUtterance,
      alternatives: alternatives.slice(0, 2),
      wordsUsed,
    };
  },
});

/**
 * Tool 10: analyzeIEP
 * Parses IEP document to extract relevant information
 */
export const analyzeIEP = tool({
  description: 'Analyzes an IEP (Individualized Education Program) document to extract communication goals and target words',
  inputSchema: z.object({
    iepText: z.string().describe('The raw IEP text to analyze'),
  }),
  execute: async ({ iepText }): Promise<{
    extractedGoals: string[];
    targetWords: string[];
    constraints: string[];
  }> => {
    const lowerText = iepText.toLowerCase();
    
    // Simple keyword extraction for goals
    const goalKeywords = [
      'will be able to',
      'will demonstrate',
      'will communicate',
      'will express',
      'will request',
      'will use',
      'goal:',
      'objective:',
    ];

    const extractedGoals: string[] = [];
    const sentences = iepText.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (goalKeywords.some(keyword => lowerSentence.includes(keyword))) {
        extractedGoals.push(sentence.trim());
      }
    }

    // Extract target words - common AAC vocabulary patterns
    const targetWordPatterns = [
      /target words?:\s*([^.]+)/gi,
      /vocabulary:\s*([^.]+)/gi,
      /core words?:\s*([^.]+)/gi,
    ];

    const targetWords: string[] = [];
    for (const pattern of targetWordPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(iepText)) !== null) {
        const words = match[1].split(/[,;]/);
        targetWords.push(...words.map((w: string) => w.trim()).filter((w: string) => w.length > 0 && w.length < 15));
      }
    }

    // If no target words found, extract simple nouns and verbs from goals
    if (targetWords.length === 0) {
      const commonAAC = ['want', 'go', 'help', 'more', 'stop', 'yes', 'no', 'like', 'eat', 'play'];
      for (const word of commonAAC) {
        if (lowerText.includes(word)) {
          targetWords.push(word);
        }
      }
    }

    // Extract constraints (things to avoid or limitations)
    const constraints: string[] = [];
    const constraintKeywords = ['avoid', 'do not', 'should not', 'cannot', 'limitation', 'accommodation'];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (constraintKeywords.some(keyword => lowerSentence.includes(keyword))) {
        constraints.push(sentence.trim());
      }
    }

    // Deduplicate target words
    const uniqueTargetWords = Array.from(new Set(targetWords));

    return {
      extractedGoals: extractedGoals.slice(0, 5),
      targetWords: uniqueTargetWords.slice(0, 15),
      constraints: constraints.slice(0, 3),
    };
  },
});

// Export all tools as an object
export const tools = {
  planFromGoal,
  analyzeGoal,
  proposeSentenceSlots,
  fetchCoreCandidates,
  memoryRead,
  memoryWrite,
  fetchDatamuseCandidates,
  fetchLexicalInfo,
  finalizeUtterance,
  analyzeIEP,
};

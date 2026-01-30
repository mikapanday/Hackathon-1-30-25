import { NextResponse } from 'next/server';
import { getMemory, saveMemory, updateWordStats, updateCombinationStats } from '@/lib/memory';

/**
 * GET endpoint - retrieves memory for a session
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const memory = await getMemory(sessionId);
    return NextResponse.json(memory);

  } catch (error) {
    console.error('Memory GET error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve memory' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint - updates memory based on action
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, action } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'updateStats': {
        const { words, utterance } = body;
        
        // Update word statistics
        if (words && Array.isArray(words)) {
          await updateWordStats(sessionId, words);
        }
        
        // Update combination statistics
        if (utterance && typeof utterance === 'string') {
          await updateCombinationStats(sessionId, utterance);
        }
        
        return NextResponse.json({ success: true });
      }

      case 'saveIEP': {
        const { iepText } = body;
        
        if (!iepText || typeof iepText !== 'string') {
          return NextResponse.json(
            { error: 'iepText is required' },
            { status: 400 }
          );
        }

        const memory = await getMemory(sessionId);
        
        // Simple IEP parsing - extract potential target words
        const targetWords: string[] = [];
        const commonAAC = ['want', 'go', 'help', 'more', 'stop', 'yes', 'no', 'like', 'eat', 'play'];
        const lowerText = iepText.toLowerCase();
        
        for (const word of commonAAC) {
          if (lowerText.includes(word)) {
            targetWords.push(word);
          }
        }

        memory.iepContext = {
          rawText: iepText,
          extractedGoals: [],
          targetWords,
        };

        await saveMemory(memory);
        return NextResponse.json({ success: true, targetWords });
      }

      case 'get': {
        const memory = await getMemory(sessionId);
        return NextResponse.json(memory);
      }

      case 'save': {
        const { updates } = body;
        const memory = await getMemory(sessionId);
        
        // Merge updates
        if (updates) {
          Object.assign(memory, updates);
        }
        
        await saveMemory(memory);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Memory POST error:', error);
    
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update memory' },
      { status: 500 }
    );
  }
}

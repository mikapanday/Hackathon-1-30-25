import { streamText, stepCountIs } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { v4 as uuidv4 } from 'uuid';
import { tools } from '@/ai/tools';
import { buildSystemPrompt } from '@/ai/prompts';

export async function GET() {
  return Response.json({ 
    message: 'AAC Chat API endpoint',
    status: 'ready',
  });
}

export async function POST(req: Request) {
  try {
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return Response.json(
        { 
          error: 'ANTHROPIC_API_KEY is not configured',
          message: 'Please add your Anthropic API key to .env.local',
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { messages, sessionId: providedSessionId, hasIEP = false } = body;

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Get or create session ID
    const sessionId = providedSessionId || uuidv4();

    // Build system prompt with optional IEP context
    const systemPrompt = buildSystemPrompt(hasIEP);

    // Call streamText with Claude and tools
    const result = streamText({
      model: anthropic('claude-sonnet-4-5-20250514'),
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(10), // Limits tool call rounds to match our 10-step workflow
    });

    // Return streaming response with session ID header
    const response = result.toTextStreamResponse();
    
    // Add session ID to response headers
    const headers = new Headers(response.headers);
    headers.set('X-Session-ID', sessionId);
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });

  } catch (error) {
    console.error('Chat API error:', error);
    
    // Handle specific error types
    if (error instanceof SyntaxError) {
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return Response.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

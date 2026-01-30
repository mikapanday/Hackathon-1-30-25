import { NextResponse } from 'next/server';

// Simple in-memory cache for recent TTS results (up to 20 items)
const ttsCache = new Map<string, ArrayBuffer>();
const MAX_CACHE_SIZE = 20;

/**
 * Add item to cache with LRU-style eviction
 */
function addToCache(key: string, value: ArrayBuffer) {
  // If cache is full, remove oldest entry
  if (ttsCache.size >= MAX_CACHE_SIZE) {
    const firstKey = ttsCache.keys().next().value;
    if (firstKey) {
      ttsCache.delete(firstKey);
    }
  }
  ttsCache.set(key, value);
}

/**
 * Generate cache key from text and voice ID
 */
function getCacheKey(text: string, voiceId: string): string {
  return `${voiceId}:${text}`;
}

/**
 * GET endpoint - returns API status and available voice info
 */
export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID;

  return NextResponse.json({
    message: 'TTS API endpoint',
    status: apiKey ? 'ready' : 'missing_api_key',
    defaultVoiceId: defaultVoiceId || 'not_configured',
    cacheSize: ttsCache.size,
    maxCacheSize: MAX_CACHE_SIZE,
  });
}

/**
 * POST endpoint - converts text to speech using ElevenLabs
 */
export async function POST(req: Request) {
  try {
    // Check for API key
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'ELEVENLABS_API_KEY is not configured',
          message: 'Please add your ElevenLabs API key to .env.local',
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { text, voiceId: requestVoiceId } = body;

    // Validate text
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Use voiceId from request or fall back to env var
    const voiceId = requestVoiceId || process.env.ELEVENLABS_VOICE_ID;
    if (!voiceId) {
      return NextResponse.json(
        {
          error: 'Voice ID is required',
          message: 'Provide voiceId in request or set ELEVENLABS_VOICE_ID in .env.local',
        },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = getCacheKey(text.trim(), voiceId);
    const cachedAudio = ttsCache.get(cacheKey);
    if (cachedAudio) {
      return new Response(cachedAudio, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'X-Cache': 'HIT',
        },
      });
    }

    // Call ElevenLabs API
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const response = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    });

    // Handle ElevenLabs errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      
      return NextResponse.json(
        {
          error: 'ElevenLabs API error',
          status: response.status,
          message: errorText,
        },
        { status: response.status }
      );
    }

    // Get audio as ArrayBuffer
    const audioBuffer = await response.arrayBuffer();

    // Cache the result
    addToCache(cacheKey, audioBuffer);

    // Return audio response
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    console.error('TTS API error:', error);

    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

# AAC Planning Assistant - Cursor Prompts (Sequential)

Copy and paste ONE phase at a time into Cursor. Check the output before moving to the next phase.

---

## UI FLOW REFERENCE

The app uses a **step-by-step wizard flow** for sentence building:

```
Step 1: WHO      → I, You, We, They, Yes, No + [Custom word]
Step 2: ACTION   → want, go, play, look, eat, get, stop, like + [Custom word]
Step 3: OBJECT   → ball, toy, it, that, more, water + [Custom word]
Step 4: LOCATION → here, there, outside, in, on, now, later + [Custom word]
Step 5: MODIFIERS → more, again, big, fast, good, bad, happy, mad + [Custom word]
```

Each screen shows:
- Top: "Formulating a sentence (loading icon)" + "Manual Chat" toggle
- Middle: "[Constructing Sentence here]" showing words selected so far
- Bottom: Word grid for current step + Custom word input
- Footer: "Agent (WHO)" label showing current step

User progresses through steps sequentially. Can skip steps or go back.

---

## PHASE 1: Project Setup

```
Create a Next.js 14 App Router project with TypeScript for an AAC (Augmentative and Alternative Communication) planning assistant.

Requirements:
1. Use these dependencies: @ai-sdk/anthropic, @ai-sdk/react, ai, zod, @neondatabase/serverless, uuid
2. Use Tailwind CSS for styling
3. Create this folder structure with empty placeholder files:

/app
  page.tsx (main page - sentence builder wizard)
  layout.tsx
  globals.css
  /dashboard/page.tsx
  /fridge/page.tsx
  /api/chat/route.ts
  /api/tts/route.ts
  /api/memory/route.ts
/components (empty folder for now)
/ai (empty folder for now)
/lib (empty folder for now)

4. In layout.tsx, set up basic HTML with a simple nav linking to /, /dashboard, /fridge
5. In globals.css, add base styles for touch-friendly UI (minimum 44px tap targets), dark background (#1a1a1a)
6. Create .env.local with placeholder variables: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, DATABASE_URL, RAPIDAPI_KEY

Each page.tsx should just have a placeholder heading for now.
```

**Check**: Run `npm run dev`, verify all 3 pages load with navigation working.

---

## PHASE 2: TypeScript Types

```
In /lib/types.ts, create all the TypeScript types for the AAC app:

1. WordStats - tracks individual word usage:
   - count: number
   - lastUsedAt: string (ISO timestamp)

2. CombinationStats - tracks word combinations:
   - count: number

3. MasteryForecast - predicts word mastery:
   - word: string
   - level: "emerging" | "developing" | "mastered"
   - projectedMasteryDate?: string

4. SlotType - the 5 steps in the wizard (matching Figma):
   - "WHO" | "ACTION" | "OBJECT" | "LOCATION" | "MODIFIERS"

5. SentenceSlot - a single slot in the sentence:
   - type: SlotType
   - value: string | null
   - isCustom: boolean (true if user typed custom word)

6. WizardState - tracks the sentence building wizard:
   - currentStep: SlotType
   - slots: Record<SlotType, SentenceSlot>
   - isComplete: boolean

7. UserMemory - the main memory object for a user session:
   - sessionId: string
   - userProfile?: { ageRange?, literacyLevel?, language? }
   - iepContext?: { rawText?, extractedGoals?: string[], targetWords?: string[] }
   - recentGoals: string[]
   - recentUtterances: string[]
   - preferredWords: Record<string, number>
   - wordStats: Record<string, WordStats>
   - combinationStats: Record<string, CombinationStats>
   - masteryForecast: MasteryForecast[]
   - createdAt: string
   - updatedAt: string

8. PlanStep - a step in the AI's plan:
   - id: number
   - description: string
   - status: "pending" | "in_progress" | "completed"

Export all types.
```

**Check**: No TypeScript errors when importing types elsewhere.

---

## PHASE 3: Core Vocabulary Data

```
In /lib/core-vocab.ts, create the core vocabulary dataset matching the Figma design.

Export CORE_VOCABULARY as Record<SlotType, string[]> with EXACTLY these words per step:

WHO: I, You, We, They, Yes, No

ACTION: want, go, play, look, eat, get, stop, like

OBJECT: ball, toy, it, that, more, water

LOCATION: here, there, outside, in, on, now, later

MODIFIERS: more, again, big, fast, good, bad, happy, mad

Also export:
- STEP_ORDER: SlotType[] = ["WHO", "ACTION", "OBJECT", "LOCATION", "MODIFIERS"]
- STEP_LABELS: Record<SlotType, string> = { WHO: "Agent (WHO)", ACTION: "Action", OBJECT: "Patient-object", LOCATION: "Location", MODIFIERS: "Modifiers-feelings" }
- DEFAULT_USER_PROFILE for an early communicator child

Import SlotType from /lib/types.ts.
```

**Check**: Import and log CORE_VOCABULARY to verify data structure.

---

## PHASE 4: Database & Memory Layer

```
Create the database and memory layer for persisting user data.

File: /lib/db.ts
- Set up Neon Postgres connection using @neondatabase/serverless
- Create a sql helper for queries
- Function: initializeDatabase() - creates user_memory table if not exists with columns: session_id (PRIMARY KEY), memory (JSONB), created_at, updated_at
- Function: getMemoryFromDB(sessionId) - returns UserMemory or null
- Function: saveMemoryToDB(memory: UserMemory) - upserts memory

File: /lib/memory.ts
- In-memory Map<string, UserMemory> as fallback cache
- Function: createEmptyMemory(sessionId): UserMemory - returns new memory with defaults
- Function: getMemory(sessionId) - tries DB first, falls back to cache, creates new if neither
- Function: saveMemory(memory) - saves to both DB and cache
- Function: updateWordStats(sessionId, words: string[]) - increments counts for used words
- Function: updateCombinationStats(sessionId, utterance: string) - extracts and counts 2-word combinations
- Function: calculateMasteryForecast(memory) - updates mastery levels based on wordStats:
  - emerging: count < 5
  - developing: count 5-15
  - mastered: count > 15

Handle errors gracefully - if DB fails, continue with in-memory only.
```

**Check**: Test getMemory and saveMemory functions work (can add a test route temporarily).

---

## PHASE 5: AI Tools - Core Functions

```
In /ai/tools.ts, implement the first set of AI SDK tools using the 'tool' function from 'ai' package with zod schemas.

1. planFromGoal
   - Input: { goal: string, hasIEPContext: boolean }
   - Output: { steps: PlanStep[], totalSteps: number }
   - Description: Creates a 1-10 step plan based on goal complexity
   - Execute: Return a hardcoded plan structure (the LLM will fill in details)

2. analyzeGoal
   - Input: { goal: string, iepContext?: string }
   - Output: { communicativeIntent: string, environment: string, suggestedSlots: SlotType[], complexity: string }
   - Description: Analyzes the user's goal to determine intent and context
   - Execute: Return structured analysis (LLM interprets the goal)

3. proposeSentenceSlots
   - Input: { goal: string, complexity: string }
   - Output: { slots: SlotType[], template: string, requiredSlots: SlotType[], optionalSlots: SlotType[] }
   - Description: Determines which slots to use based on goal complexity
   - Execute: Return slot configuration based on complexity (simple=2-3 slots, complex=5 slots)

4. fetchCoreCandidates
   - Input: { slot: SlotType, context?: string }
   - Output: { candidates: string[] }
   - Description: Returns core vocabulary words for a specific slot
   - Execute: Return words from CORE_VOCABULARY for the given slot type

5. memoryRead
   - Input: { sessionId: string }
   - Output: UserMemory
   - Description: Reads the user's memory/history
   - Execute: Call getMemory from /lib/memory.ts

6. memoryWrite
   - Input: { sessionId: string, updates: Partial<UserMemory> }
   - Output: { success: boolean }
   - Description: Updates the user's memory
   - Execute: Merge updates and call saveMemory

Export all tools as an object: export const tools = { planFromGoal, analyzeGoal, ... }
```

**Check**: Import tools and verify zod schemas are valid, no TypeScript errors.

---

## PHASE 6: AI Tools - External APIs

```
In /ai/tools.ts, add these additional tools that call external APIs:

7. fetchDatamuseCandidates
   - Input: { slot: SlotType, topic: string, relatedWords?: string[] }
   - Output: { candidates: string[] }
   - Description: Fetches semantically related words from Datamuse API
   - Execute:
     - Build URL: https://api.datamuse.com/words?ml={topic}&max=15
     - If relatedWords provided, add: &rel_trg={relatedWords[0]}
     - Fetch and parse JSON response
     - Filter to simple words (no spaces, < 10 chars)
     - Return top 10 words

8. fetchLexicalInfo
   - Input: { words: string[] }
   - Output: { wordInfo: Array<{ word: string, partOfSpeech: string, isSimple: boolean }> }
   - Description: Gets part of speech info from WordsAPI via RapidAPI
   - Execute:
     - For each word, call: https://wordsapi.com/mashape/words/{word}
     - Headers: X-RapidAPI-Key from env, X-RapidAPI-Host: wordsapi-p.rapidapi.com
     - Extract part of speech
     - Mark as simple if frequency exists and > 3
     - Handle errors gracefully (return unknown POS if API fails)

9. finalizeUtterance
   - Input: { slots: SentenceSlot[], context?: UserMemory }
   - Output: { primaryUtterance: string, alternatives: string[], wordsUsed: string[] }
   - Description: Constructs final utterance from filled slots
   - Execute:
     - Build primary utterance from slot values
     - Generate 2 alternatives with slight variations
     - Return list of words used

10. analyzeIEP (optional, can return mock data)
    - Input: { iepText: string }
    - Output: { extractedGoals: string[], targetWords: string[], constraints: string[] }
    - Description: Parses IEP document to extract relevant information
    - Execute: Use simple keyword extraction or return mock data for demo
```

**Check**: Test Datamuse API call manually with curl to verify it works.

---

## PHASE 7: System Prompt

```
In /ai/prompts.ts, create the system prompt that instructs Claude how to behave.

Export SYSTEM_PROMPT as a template literal string:

You are an AAC (Augmentative and Alternative Communication) planning assistant. You help create simple, effective utterances for users who communicate using AAC devices.

WORKFLOW RULES:
1. You have a STRICT 10-step maximum per workflow
2. Always report your current step: "Step X/10: [what you're doing]"
3. A step is: one planning decision, one tool call, or one reasoning phase
4. When you reach step 10, immediately finalize with your best available data

TYPICAL TOOL FLOW:
Step 1: analyzeGoal - understand the user's intent
Step 2: proposeSentenceSlots - determine sentence structure
Step 3: fetchCoreCandidates for required slots
Step 4-6: fetchDatamuseCandidates for each slot needing more options
Step 7: memoryRead - check user preferences
Step 8: Apply personalization from memory
Step 9: finalizeUtterance - create final options
Step 10: memoryWrite - save stats

CRITICAL RULES:
- NEVER speak or call TTS automatically - only when user explicitly asks to speak
- Return word suggestions as structured arrays, not prose
- If IEP context exists, prioritize those target words
- Keep suggestions simple and high-frequency
- Always show the sentence template with filled/empty slots

OUTPUT FORMAT:
When providing suggestions, structure your response with:
- Current step progress
- Slot suggestions as JSON arrays
- The sentence template showing current state
- Any relevant context from memory

Also export a helper: buildSystemPrompt(hasIEP: boolean) that returns SYSTEM_PROMPT with IEP-specific additions if hasIEP is true.
```

**Check**: Read the prompt to verify it's clear and complete.

---

## PHASE 8: Chat API Route

```
In /app/api/chat/route.ts, implement the streaming chat endpoint.

Import:
- streamText from 'ai'
- anthropic from '@ai-sdk/anthropic'
- tools from '@/ai/tools'
- SYSTEM_PROMPT from '@/ai/prompts'

Export async function POST(req: Request):
1. Parse request body: { messages, sessionId, hasIEP }
2. Get or create session ID (use uuid if not provided)
3. Build system prompt using buildSystemPrompt(hasIEP)
4. Call streamText with:
   - model: anthropic('claude-sonnet-4-5')
   - system: the system prompt
   - messages: from request
   - tools: all tools from /ai/tools
   - maxSteps: 10 (this limits tool call rounds)
5. Return the streaming response with toDataStreamResponse()

Add error handling:
- If ANTHROPIC_API_KEY missing, return 500 with helpful error
- Wrap in try/catch, return errors as JSON

Add headers for session ID in response so client can track it.
```

**Check**: Test with curl or Postman - send a simple message and verify streaming response.

---

## PHASE 9: TTS API Route

```
In /app/api/tts/route.ts, implement the text-to-speech endpoint using ElevenLabs.

Export async function POST(req: Request):
1. Parse body: { text, voiceId? }
2. Validate text exists and is not empty
3. Use voiceId from request or fall back to ELEVENLABS_VOICE_ID env var
4. Call ElevenLabs API:
   - URL: https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
   - Method: POST
   - Headers:
     - xi-api-key: ELEVENLABS_API_KEY
     - Content-Type: application/json
   - Body: { text, model_id: "eleven_monolingual_v1", voice_settings: { stability: 0.5, similarity_boost: 0.5 } }
5. Get audio as ArrayBuffer
6. Return as Response with Content-Type: audio/mpeg

Add error handling:
- If API key missing, return 500
- If ElevenLabs fails, return error message
- Add a simple in-memory cache: Map<string, ArrayBuffer> for recent texts (cache up to 20 items)

Also create GET endpoint that returns available voice info (optional, for debugging).
```

**Check**: Test with curl - send text and verify audio data returns (save to .mp3 file to test).

---

## PHASE 10: Main Page - Wizard Layout

```
In /app/page.tsx, create the sentence building wizard matching the Figma design.

DESIGN: Dark background (#1a1a1a), white text, step-by-step wizard flow.

1. STATE:
   - currentStep: SlotType (starts at "WHO")
   - slots: Record<SlotType, SentenceSlot> (all start null)
   - customWordInput: string (for the custom word field)
   - isManualChat: boolean (toggle for manual chat mode)
   - isLoading: boolean (for AI formulation)
   - sessionId: string (persist to localStorage)

2. LAYOUT (matching Figma exactly):

   TOP BAR:
   - Left: "Formulating a sentence" + loading spinner (when isLoading)
   - Right: "Manual Chat" toggle button

   SENTENCE DISPLAY (middle area):
   - "[Constructing Sentence here]" label
   - Show the sentence being built: words selected so far, joined with spaces
   - If empty, show placeholder text

   WORD GRID (main interaction):
   - Display words from CORE_VOCABULARY[currentStep] in a grid
   - 2-3 columns, large tappable buttons (min 60px height)
   - White/light text on dark background
   - When tapped: fill that slot, advance to next step

   CUSTOM WORD INPUT:
   - Text input labeled "[Custom word]"
   - When submitted: fill slot with custom word, advance to next step

   STEP INDICATOR (bottom):
   - "Agent (WHO)" or "Action" etc. - shows current step name
   - Use STEP_LABELS from core-vocab.ts

3. NAVIGATION:
   - Tapping a word auto-advances to next step
   - After MODIFIERS step, show "Speak" button and "Start Over" button
   - Allow going back to previous steps (tap on sentence word to edit)
   - Skip button to skip optional steps

4. MANUAL CHAT MODE:
   - When toggled on, show a simple text input for free typing
   - Direct TTS without wizard flow

5. IEP CONTEXT (accessible via settings/menu icon):
   - Modal or slide-out panel
   - Textarea to paste IEP text OR file upload
   - "Use Default Profile" button
   - When IEP provided, AI can suggest personalized words
   - Store in memory for session

6. HEADER NAV:
   - Link to /dashboard (stats icon)
   - Link to /fridge (celebration icon)

Style with Tailwind. Dark theme. Touch-friendly.
```

**Check**: Page loads with dark background, shows WHO words in grid, can tap to select.

---

## PHASE 11: Wizard Components

```
Create the wizard components matching the Figma design.

File: /components/SentenceDisplay.tsx
Props: slots: Record<SlotType, SentenceSlot>, onWordTap?: (step: SlotType) => void

Display:
- Shows "[Constructing Sentence here]" label above
- Displays the sentence being built from filled slots
- Words shown inline, tappable to go back and edit that step
- If no words selected, show placeholder like "Tap words below to build your sentence"

File: /components/WordGrid.tsx
Props: words: string[], onWordSelect: (word: string) => void, columns?: number

Display:
- Grid of word buttons (default 3 columns)
- Each button: dark background, white text, rounded corners
- Large touch targets (min 60px height, full width of column)
- Gap between buttons for easy tapping
- Subtle hover/active state

File: /components/CustomWordInput.tsx
Props: onSubmit: (word: string) => void, placeholder?: string

Display:
- Text input with "[Custom word]" placeholder
- Submit on Enter key
- Clear after submit
- Styled to match dark theme

File: /components/StepIndicator.tsx
Props: currentStep: SlotType, totalSteps: number

Display:
- Shows current step label: "Agent (WHO)", "Action", etc.
- Optional: progress dots or bar showing 1/5, 2/5, etc.

File: /components/ManualChatToggle.tsx
Props: isActive: boolean, onToggle: () => void

Display:
- "Manual Chat" button/toggle in top right
- Different style when active

Integrate all into /app/page.tsx:
- WordGrid shows CORE_VOCABULARY[currentStep]
- Tapping word calls handler that fills slot and advances step
- SentenceDisplay updates live as words are selected
```

**Check**: Can see word grid, tap words to fill sentence, step advances automatically.

---

## PHASE 12: TTS Player Component

```
Create the TTS player and integrate into main page.

File: /components/TTSPlayer.tsx
Props: text: string, disabled?: boolean

Features:
- Large "Speak" button (green, prominent)
- Loading state while fetching audio (spinner)
- Audio element for playback (hidden)
- Play/replay functionality
- Visual feedback during playback (pulsing effect)

Implementation:
- On button click, POST to /api/tts with text
- Convert response to blob URL
- Play audio using Audio API
- Track playing state for visual feedback
- Handle errors with retry option

File: /components/FreeTypeMode.tsx
Props: onSpeak: (text: string) => void

Features:
- Toggle to show/hide free type mode
- Textarea for typing any sentence
- Quick phrase buttons: "Yes", "No", "Help", "More please", "All done"
- Speak button for the typed text

Integrate into /app/page.tsx:
- Add TTSPlayer below SentenceStrip, passing constructed sentence
- Add FreeTypeMode as collapsible section
- When utterance is spoken, call memoryWrite to update stats
```

**Check**: Can tap Speak, hear audio playback, free type mode works.

---

## PHASE 13: Dashboard Page

```
In /app/dashboard/page.tsx, create the analytics dashboard.

Fetch UserMemory on page load using /api/memory endpoint (create simple GET endpoint if needed).

Layout:

1. STATS HEADER:
   - Total words spoken (sum of all wordStats counts)
   - Unique words used (count of wordStats keys)
   - Most used word

2. WORD FREQUENCY SECTION:
   - Title: "Word Usage"
   - List/bars showing top 15 words by count
   - Each row: word | bar visualization | count
   - Color code by slot type if known

3. COMMON COMBINATIONS:
   - Title: "Common Phrases"
   - List top 10 combinations from combinationStats
   - Show: phrase | count

4. MASTERY FORECAST:
   - Title: "Learning Progress"
   - Card for each word in masteryForecast
   - Show: word, level (with icon/color), progress bar
   - Emerging = red, Developing = yellow, Mastered = green
   - Show projected mastery date if available

Style with Tailwind:
- Clean card-based layout
- Touch-friendly
- Works on mobile and iPad
```

**Check**: Dashboard loads, shows data from memory (may be empty initially - that's OK).

---

## PHASE 14: Fridge Celebration Page

```
In /app/fridge/page.tsx, create the fridge magnet celebration board.

Fetch UserMemory on page load.

Layout:

1. FRIDGE BACKGROUND:
   - Light gray/silver background resembling fridge
   - Subtle texture or gradient
   - Border to frame the "fridge door"

2. WORD MAGNETS:
   - Display words with count > 3 as magnet tiles
   - Magnet styling:
     - Rounded rectangle, shadow for 3D effect
     - Random slight rotation (-5 to +5 degrees) using inline style
     - Color based on slot type
     - Size scales slightly with usage count
   - Scattered layout (use CSS grid with random positioning or flexbox with gaps)

3. CELEBRATION STICKERS:
   - Check for achievements and display sticky notes:
     - "First word!" - any word with count = 1 (first time)
     - "5 uses!" - words crossing 5 count
     - "10 uses!" - words crossing 10 count
     - "Word master!" - words reaching mastered level
   - Style as colorful sticky notes or star stickers
   - Position near relevant magnets or in corner

4. ACHIEVEMENTS SECTION (bottom):
   - "Recent Achievements" header
   - List recent milestones
   - Celebratory styling (stars, colors)

Make it playful and delightful - this is the "wow" demo page!
```

**Check**: Fridge page loads, shows magnets for any used words, stickers appear for achievements.

---

## PHASE 15: Animations

```
Add animations throughout the app using CSS and the animations from https://makeitanimated.dev/animations

INSTALL/SETUP:
- Review makeitanimated.dev for available animations
- Add any required CSS or imports

ANIMATIONS TO ADD:

1. /components/WordGrid.tsx - Word button tap:
   - Scale up on tap (transform: scale(1.1))
   - Brief highlight/glow effect
   - Word "flies" up to sentence display

2. /components/SentenceDisplay.tsx - Word added:
   - Pop/bounce effect when new word appears
   - Smooth text reflow
   - Fade out when word removed

3. /components/TTSPlayer.tsx - Speak button:
   - Pulse animation while loading
   - Ripple effect on tap
   - Glow during audio playback

4. /app/dashboard/page.tsx - Charts:
   - Bars grow from 0 on page load
   - Count numbers animate up
   - Cards fade in sequentially

5. /app/fridge/page.tsx - Magnets:
   - Magnets "fall" into place on load (staggered)
   - Subtle wobble on hover
   - New achievement stickers bounce in
   - Confetti effect for major milestones (optional)

6. Page transitions:
   - Fade between routes
   - Content slides up on load

7. Loading states:
   - Skeleton shimmer effect
   - Spinner for AI thinking

Use CSS transitions and keyframes. Keep animations performant (transform, opacity only).
Add prefers-reduced-motion media query to disable for accessibility.
```

**Check**: Animations feel smooth, not janky. Test on mobile/iPad if possible.

---

## PHASE 16: Final Integration & Polish

```
Final integration to ensure everything works end-to-end.

1. DATA FLOW CHECK:
   - WHO → ACTION → OBJECT → LOCATION → MODIFIERS (wizard flow)
   - Each word selection advances to next step
   - Sentence builds in SentenceDisplay
   - Speak → TTS plays → memory updated with words used
   - Dashboard shows updated word stats
   - Fridge shows new magnets/achievements

2. ERROR HANDLING:
   - If AI fails: show error message, allow retry
   - If TTS fails: show text-only fallback
   - If memory/DB fails: continue with localStorage
   - Add try/catch around all API calls
   - Show user-friendly error messages

3. LOADING STATES:
   - Goal submission: show "Planning..." with spinner
   - TTS: show loading on button
   - Dashboard/Fridge: skeleton loaders while fetching memory

4. EMPTY STATES:
   - Dashboard with no data: "Start using words to see your stats!"
   - Fridge with no data: "Your magnets will appear here as you use words!"

5. MOBILE/IPAD CHECK:
   - Test touch interactions
   - Verify 44px minimum tap targets
   - Check horizontal scrolling on suggestion panel
   - Test in both orientations

6. CACHE FALLBACK:
   - If Datamuse fails, use only core vocabulary
   - If WordsAPI fails, skip POS filtering
   - Always have suggestions available

7. FINAL CLEANUP:
   - Remove console.logs
   - Check for TypeScript errors
   - Verify env variables documented
   - Test npm run build succeeds
```

**Check**: Full happy path works: Select WHO → ACTION → OBJECT → LOCATION → MODIFIERS → Speak → See stats on dashboard → See magnets on fridge.

---

## Quick Reference: API Keys Needed

Before you start, get these ready:
- `ANTHROPIC_API_KEY` - console.anthropic.com
- `ELEVENLABS_API_KEY` - elevenlabs.io (free tier works)
- `ELEVENLABS_VOICE_ID` - pick from ElevenLabs voice library
- `DATABASE_URL` - neon.tech (create free project)
- `RAPIDAPI_KEY` - rapidapi.com (subscribe to WordsAPI - has free tier)

---

## If Running Behind

Skip or simplify in this order:
1. Phase 6 (WordsAPI) - just use core vocab
2. Phase 4 (Neon DB) - use localStorage only
3. Phase 15 (Animations) - add later
4. Phase 13 (Dashboard charts) - just show lists
5. Phase 7 (IEP section) - use default profile only

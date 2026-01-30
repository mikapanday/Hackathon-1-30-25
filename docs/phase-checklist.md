# Phase Implementation Checklist

After each phase, paste the relevant checklist into Cursor to verify implementation.

---

## PHASE 1: Project Setup

```
Verify Phase 1 implementation:

1. [ ] `npm run dev` starts without errors
2. [ ] http://localhost:3000 loads (main page)
3. [ ] http://localhost:3000/dashboard loads
4. [ ] http://localhost:3000/fridge loads
5. [ ] Navigation links between all 3 pages work
6. [ ] Dark background (#1a1a1a) is applied
7. [ ] .env.local exists with placeholder variables
8. [ ] Folder structure exists: /app, /components, /ai, /lib

Fix any issues found.
```

---

## PHASE 2: TypeScript Types

```
Verify Phase 2 implementation:

1. [ ] /lib/types.ts exists and exports all types
2. [ ] SlotType includes: "WHO" | "ACTION" | "OBJECT" | "LOCATION" | "MODIFIERS"
3. [ ] SentenceSlot has: type, value, isCustom
4. [ ] WizardState has: currentStep, slots, isComplete
5. [ ] UserMemory has: sessionId, wordStats, combinationStats, masteryForecast
6. [ ] No TypeScript errors in the file
7. [ ] Can import types in another file without errors:
   ```typescript
   import { SlotType, UserMemory, WizardState } from '@/lib/types'
   ```

Fix any issues found.
```

---

## PHASE 3: Core Vocabulary Data

```
Verify Phase 3 implementation:

1. [ ] /lib/core-vocab.ts exists
2. [ ] CORE_VOCABULARY exports with exactly these keys: WHO, ACTION, OBJECT, LOCATION, MODIFIERS
3. [ ] WHO contains: I, You, We, They, Yes, No
4. [ ] ACTION contains: want, go, play, look, eat, get, stop, like
5. [ ] OBJECT contains: ball, toy, it, that, more, water
6. [ ] LOCATION contains: here, there, outside, in, on, now, later
7. [ ] MODIFIERS contains: more, again, big, fast, good, bad, happy, mad
8. [ ] STEP_ORDER exports as array: ["WHO", "ACTION", "OBJECT", "LOCATION", "MODIFIERS"]
9. [ ] STEP_LABELS exports with display names for each step
10. [ ] No TypeScript errors

Fix any issues found.
```

---

## PHASE 4: Database & Memory Layer

```
Verify Phase 4 implementation:

1. [ ] /lib/db.ts exists with Neon connection setup
2. [ ] /lib/memory.ts exists with memory functions
3. [ ] createEmptyMemory(sessionId) returns valid UserMemory object
4. [ ] getMemory(sessionId) works (returns new memory if none exists)
5. [ ] saveMemory(memory) works without errors
6. [ ] updateWordStats increments word counts correctly
7. [ ] updateCombinationStats extracts 2-word combinations
8. [ ] calculateMasteryForecast sets correct levels (emerging < 5, developing 5-15, mastered > 15)
9. [ ] Functions handle errors gracefully (don't crash if DB unavailable)
10. [ ] In-memory fallback works when DB connection fails

Test with this code in a temporary API route:
```typescript
const memory = await getMemory('test-session')
console.log('Memory:', memory)
await saveMemory({ ...memory, recentGoals: ['test goal'] })
const updated = await getMemory('test-session')
console.log('Updated:', updated.recentGoals)
```

Fix any issues found.
```

---

## PHASE 5: AI Tools - Core Functions

```
Verify Phase 5 implementation:

1. [ ] /ai/tools.ts exists
2. [ ] All tools use zod schemas for input/output
3. [ ] planFromGoal tool exists with correct schema
4. [ ] analyzeGoal tool exists with correct schema
5. [ ] proposeSentenceSlots tool exists with correct schema
6. [ ] fetchCoreCandidates tool returns words from CORE_VOCABULARY
7. [ ] memoryRead tool calls getMemory correctly
8. [ ] memoryWrite tool calls saveMemory correctly
9. [ ] Tools are exported as object: export const tools = { ... }
10. [ ] No TypeScript errors

Test fetchCoreCandidates:
```typescript
const result = await tools.fetchCoreCandidates.execute({ slot: 'WHO' })
console.log(result) // Should include: I, You, We, They, Yes, No
```

Fix any issues found.
```

---

## PHASE 6: AI Tools - External APIs

```
Verify Phase 6 implementation:

1. [ ] fetchDatamuseCandidates tool exists
2. [ ] fetchDatamuseCandidates calls https://api.datamuse.com/words
3. [ ] fetchLexicalInfo tool exists (can return mock data if API not ready)
4. [ ] finalizeUtterance tool builds sentence from slots
5. [ ] analyzeIEP tool exists (can return mock data)
6. [ ] All tools handle API errors gracefully

Test Datamuse manually:
```bash
curl "https://api.datamuse.com/words?ml=playground&max=10"
```

Test fetchDatamuseCandidates:
```typescript
const result = await tools.fetchDatamuseCandidates.execute({
  slot: 'LOCATION',
  topic: 'playground'
})
console.log(result) // Should return related words
```

Fix any issues found.
```

---

## PHASE 7: System Prompt

```
Verify Phase 7 implementation:

1. [ ] /ai/prompts.ts exists
2. [ ] SYSTEM_PROMPT is exported as string
3. [ ] Prompt includes 10-step workflow limit
4. [ ] Prompt includes tool usage instructions
5. [ ] Prompt says NOT to auto-play TTS
6. [ ] Prompt mentions returning structured data (not prose)
7. [ ] buildSystemPrompt(hasIEP) function exists
8. [ ] buildSystemPrompt(true) returns IEP-aware prompt
9. [ ] buildSystemPrompt(false) returns default prompt

Read the prompt aloud - does it make sense?

Fix any issues found.
```

---

## PHASE 8: Chat API Route

```
Verify Phase 8 implementation:

1. [ ] /app/api/chat/route.ts exists
2. [ ] POST handler is exported
3. [ ] Uses streamText from 'ai' package
4. [ ] Uses anthropic model (claude-sonnet-4-5)
5. [ ] Imports tools from /ai/tools
6. [ ] Imports system prompt from /ai/prompts
7. [ ] Returns streaming response with toDataStreamResponse()
8. [ ] Handles missing API key with helpful error
9. [ ] Has try/catch error handling

Test with curl:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Help me say I want to play"}]}'
```

Should return streaming response (or helpful error if API key missing).

Fix any issues found.
```

---

## PHASE 9: TTS API Route

```
Verify Phase 9 implementation:

1. [ ] /app/api/tts/route.ts exists
2. [ ] POST handler is exported
3. [ ] Accepts { text, voiceId? } in body
4. [ ] Calls ElevenLabs API: https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
5. [ ] Uses ELEVENLABS_API_KEY from env
6. [ ] Returns audio/mpeg content type
7. [ ] Handles missing API key with error message
8. [ ] Handles empty text with error message
9. [ ] Has basic caching (optional but nice)

Test with curl:
```bash
curl -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"I want to play"}' \
  --output test.mp3
```

Play test.mp3 - should hear speech (or get helpful error if API key missing).

Fix any issues found.
```

---

## PHASE 10: Main Page - Wizard Layout

```
Verify Phase 10 implementation:

1. [ ] /app/page.tsx renders without errors
2. [ ] Dark background (#1a1a1a) is visible
3. [ ] Top bar shows "Formulating a sentence" text
4. [ ] Top bar has "Manual Chat" toggle on right
5. [ ] Middle shows "[Constructing Sentence here]" or similar placeholder
6. [ ] Word grid displays WHO words: I, You, We, They, Yes, No
7. [ ] Words are in a grid (2-3 columns), not horizontal scroll
8. [ ] Word buttons are large and tappable (min 44px, prefer 60px)
9. [ ] "[Custom word]" input is visible
10. [ ] Footer shows "Agent (WHO)" or similar step indicator
11. [ ] State management: currentStep, slots, customWordInput exist
12. [ ] sessionId is generated and stored in localStorage

Visually compare to Figma - does it match the layout?

Fix any issues found.
```

---

## PHASE 11: Wizard Components

```
Verify Phase 11 implementation:

1. [ ] /components/SentenceDisplay.tsx exists and renders
2. [ ] /components/WordGrid.tsx exists and renders
3. [ ] /components/CustomWordInput.tsx exists and renders
4. [ ] /components/StepIndicator.tsx exists and renders

Test the flow:
5. [ ] Tap "I" → word appears in sentence display
6. [ ] After tap, step advances to ACTION
7. [ ] ACTION words now shown: want, go, play, look, eat, get, stop, like
8. [ ] Tap "want" → "I want" shows in sentence display
9. [ ] Step advances to OBJECT
10. [ ] Continue through all 5 steps
11. [ ] After MODIFIERS, "Speak" button appears (can be disabled)
12. [ ] Can tap word in sentence to go back and edit that step
13. [ ] Custom word input works - type word, submit, fills slot

Full flow test: Build "I want ball here" and verify display.

Fix any issues found.
```

---

## PHASE 12: TTS Player Component

```
Verify Phase 12 implementation:

1. [ ] /components/TTSPlayer.tsx exists
2. [ ] Large "Speak" button is visible (green, prominent)
3. [ ] Button is disabled when no sentence built
4. [ ] Button shows loading state when fetching audio
5. [ ] Clicking Speak calls /api/tts with constructed sentence
6. [ ] Audio plays after loading
7. [ ] Can replay audio
8. [ ] Error state shows retry option

9. [ ] /components/FreeTypeMode.tsx exists (if implemented)
10. [ ] Manual Chat toggle reveals free text input
11. [ ] Can type custom sentence and speak it

Full flow test:
- Build sentence "I want play"
- Tap Speak
- Hear audio playback
- Verify no auto-play (only plays on tap)

Fix any issues found.
```

---

## PHASE 13: Dashboard Page

```
Verify Phase 13 implementation:

1. [ ] /app/dashboard/page.tsx renders without errors
2. [ ] Page fetches UserMemory on load
3. [ ] Stats header shows: total words, unique words, most used word
4. [ ] Word frequency section displays (even if empty)
5. [ ] Top 15 words shown with counts/bars
6. [ ] Common combinations section displays
7. [ ] Shows 2-word phrases from combinationStats
8. [ ] Mastery forecast section displays
9. [ ] Shows words with levels: emerging (red), developing (yellow), mastered (green)
10. [ ] Touch-friendly layout, works on mobile
11. [ ] Empty state message when no data: "Start using words to see your stats!"

Test flow:
- Go to main page, build and speak a sentence
- Go to dashboard
- Verify the words you used appear in frequency list

Fix any issues found.
```

---

## PHASE 14: Fridge Celebration Page

```
Verify Phase 14 implementation:

1. [ ] /app/fridge/page.tsx renders without errors
2. [ ] Fridge-like background (light gray/silver)
3. [ ] Page fetches UserMemory on load
4. [ ] Word magnets appear for words with count > 3
5. [ ] Magnets have 3D effect (shadow, rounded)
6. [ ] Magnets have slight random rotation
7. [ ] Magnets colored by slot type
8. [ ] Celebration stickers appear for achievements:
   - "First word!" for count = 1
   - "5 uses!" for count = 5
   - "10 uses!" for count = 10
9. [ ] Achievements section shows recent milestones
10. [ ] Empty state: "Your magnets will appear here as you use words!"
11. [ ] Page feels playful and delightful

Test flow:
- Use same word 5+ times on main page
- Go to fridge
- Verify magnet appears with "5 uses!" sticker

Fix any issues found.
```

---

## PHASE 15: Animations

```
Verify Phase 15 implementation:

1. [ ] Animations imported from makeitanimated.dev or custom CSS
2. [ ] WordGrid: word buttons scale on tap
3. [ ] WordGrid: selected word has visual feedback
4. [ ] SentenceDisplay: new words pop/bounce in
5. [ ] SentenceDisplay: words fade out when removed
6. [ ] TTSPlayer: Speak button pulses while loading
7. [ ] TTSPlayer: visual feedback during playback
8. [ ] Dashboard: bars/numbers animate on load
9. [ ] Fridge: magnets fall/appear with stagger
10. [ ] Fridge: magnets wobble on hover
11. [ ] Fridge: stickers bounce in
12. [ ] Page transitions: fade or slide between routes
13. [ ] Loading states: skeleton shimmer or spinner
14. [ ] prefers-reduced-motion is respected

Performance check:
- Animations run at 60fps (no jank)
- Only using transform/opacity (GPU accelerated)

Fix any issues found.
```

---

## PHASE 16: Final Integration & Polish

```
Verify Phase 16 - Full End-to-End Test:

HAPPY PATH:
1. [ ] Load app at http://localhost:3000
2. [ ] See WHO words: I, You, We, They, Yes, No
3. [ ] Tap "I" → advances to ACTION step
4. [ ] Tap "want" → advances to OBJECT step
5. [ ] Tap "ball" → advances to LOCATION step
6. [ ] Tap "here" → advances to MODIFIERS step
7. [ ] Tap "happy" → sentence complete
8. [ ] Sentence display shows: "I want ball here happy"
9. [ ] Speak button is enabled
10. [ ] Tap Speak → audio plays "I want ball here happy"
11. [ ] Navigate to /dashboard
12. [ ] See word frequency updated with: I, want, ball, here, happy
13. [ ] Navigate to /fridge
14. [ ] See magnets for used words (if count > 3, use words multiple times)

ERROR HANDLING:
15. [ ] If AI fails: error message shown, can retry
16. [ ] If TTS fails: error message shown, can retry
17. [ ] If DB fails: app continues with localStorage

EDGE CASES:
18. [ ] Custom word input works
19. [ ] Can skip steps (if implemented)
20. [ ] Can go back and edit previous step
21. [ ] Manual Chat mode works
22. [ ] IEP upload works (if implemented)
23. [ ] Session persists across page refresh

MOBILE/TOUCH:
24. [ ] All tap targets are 44px+
25. [ ] Works in portrait and landscape
26. [ ] No horizontal scroll issues

FINAL:
27. [ ] npm run build succeeds
28. [ ] No console errors
29. [ ] No TypeScript errors

Fix any issues found.
```

---

## Quick Copy-Paste Template

After any phase, paste this generic template:

```
Review the implementation for [PHASE NAME].

Check each item and fix any issues:
[PASTE CHECKLIST ITEMS HERE]

After fixing, confirm all items pass.
```

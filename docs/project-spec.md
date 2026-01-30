Here’s an updated, self-contained prompt for Claude that includes all your new user stories and previous constraints. You can paste this directly into Claude to have it generate Cursor-ready code and system prompts.You are an expert AI engineer building a web AAC-style planning assistant for a hackathon.  
  
## High-level goal  
  
Build a demo web app that:  
  
1. Takes a natural-language **goal** from the user (e.g., “I want to help a nonverbal child say what they want to do at the park”).  
  
2. Converts that goal into an explicit, **multi-step plan**.  
  
3. **Sequentially executes the plan in up to 10 steps total per workflow**, where a “step” is:  
  
   - A planning or reasoning turn, and/or  
  
   - One or more tool/API actions (Datamuse, WordsAPI, ElevenLabs, memory read/write, etc.).  
  
4. **Persists and updates memory** throughout execution (per user/session).  
  
5. Outputs real results in a **demo-friendly Generative UI** that supports:  
  
   - **Context from an IEP or default:**  
  
     - Ability to set a context by uploading an IEP (Individualized Education Plan) document or profile.  
  
     - If no IEP is uploaded, proceed with a sensible default child profile.  
  
   - **Dynamic “fill-the-blank” main sentence + floating word selections:**  
  
     - At every phase, word selections are visible and tappable (floating suggestions by slot).  
  
     - There is a main sentence strip that shows a **fill-the-blank style template**:  
  
       - e.g., “WHO ___ DO ___ WHAT ___ WHERE/WHEN ___ HOW/FEEL ___”.  
  
     - When the user taps words, they fill these blanks and dynamically construct the main sentence.  
  
   - **Free-type TTS mode:**  
  
     - An option for the user/caregiver/SLP to **just type a sentence** and use text-to-speech (TTS) directly via ElevenLabs (bypassing planning if desired).  
  
   - **Live dashboard with word frequency and combinations:**  
  
     - A dashboard view that shows:  
  
       - Word frequency over time (how often each word has been selected/spoken).  
  
       - Common **word combinations / n-grams** (e.g., “I want”, “go park”, “more please”).  
  
   - **“Fridge magnet” celebration board:**  
  
     - A playful fridge-like design with:  
  
       - Magnetic tiles representing words/phrases.  
  
       - Notes/stickers that appear when a student reaches milestones:  
  
         - First-time use of a word.  
  
         - Reaching a usage threshold (e.g., 10 uses of “help”).  
  
       - Visual celebration of **word accomplishment and mastery**.  
  
   - **Mastery forecast in the dashboard:**  
  
     - On the dashboard page, show a simple **forecast of the student’s path to mastery**, e.g.:  
  
       - For each tracked word or objective, a projected time-to-mastery based on usage trends.  
  
       - Visual cues (progress bars, trend arrows) that are easy to demo, not clinically perfect.  
  
The app is not a full AAC product; it’s a hackathon prototype that demonstrates:  
  
**Goal → Plan (≤10 steps) → Context-aware tool usage → Memory → Utterances + TTS → Analytics & celebration UI.**  
  
## Tech stack and constraints  
  
Use:  
  
- **Framework:** Next.js 14 App Router (TypeScript).  
  
- **UI:** React + Tailwind (or minimal CSS), responsive for desktop and iPad (touch-friendly).  
  
- **LLM tooling:** Vercel **AI SDK 6**:  
  
  - `@ai-sdk/react` – `useChat`, generative UI pattern.  
  
  - `ai` – `streamText`, `tool`, `UIMessage`, etc.  
  
- **Model:** `anthropic/claude-sonnet-4.5` via AI SDK.  
  
- **Deployment assumption:** Vercel (no deployment files required, just code that is deploy-ready).  
  
- **Memory:** Per-session via:  
  
  - Simple in-memory store on the server. Create a postgres db scheme and other requirements we would be using a neon postgres cloud db.  
  
  - Browser `localStorage` to persist a session ID + last snapshot across refreshes.  
  
Keep external dependencies minimal and well-known.  
  
## External APIs to integrate as tools  
  
Use these APIs via server-side tools:  
  
1. **Datamuse API** – word-finding / semantic suggestions    
  
   - `https://api.datamuse.com/words?...`  
  
   - Use for relevant words given topics or related words (`ml`, `rel_trg`, `topics`).  
  
   - Powers slot-specific suggestions (ACTION, OBJECT, LOCATION, etc.).  
  
2. **WordsAPI** – lexical / dictionary info    
  
   - Via RapidAPI.  
  
   - Use for:  
  
     - Definitions and basic part-of-speech info.  
  
     - Filtering suggestions by POS (verbs for DO slot, nouns for WHAT slot, etc.).  
  
3. **ElevenLabs TTS** – text-to-speech    
  
   - Use official HTTP API.  
  
   - Assume `ELEVENLABS_API_KEY` is available in env.  
  
   - Implement server-side tool `elevenLabsSpeak` that:  
  
     - Input: utterance text + optional voice ID.  
  
     - Output: an audio URL or buffer that the client can play (e.g., via `/api/tts`).  
  
## Execution step budget: hard cap of 10 per workflow  
  
Define a “workflow” as the full sequence from:  
  
- New goal (and optionally IEP context),  
  
- Through planning and slot-filling,  
  
- To final utterance suggestions plus TTS ready.  
  
Constraints:  
  
- **At most 10 execution steps** per workflow.  
  
- A “step” is a distinct logical phase, such as:  
  
  - Step 1: parse goal + IEP.  
  
  - Step 2: propose slots.  
  
  - Step 3: fetch core candidates.  
  
  - Step 4: call Datamuse.  
  
  - Step 5: call WordsAPI for filtering.  
  
  - Step 6: apply memory personalization.  
  
  - Step 7: finalize utterance candidates.  
  
  - Step 8: prepare dashboard updates.  
  
  - Step 9: prepare fridge/milestone events.  
  
  - Step 10: TTS preparation.  
  
Implementation:  
  
- Maintain a step counter in the server logic:  
  
  - Initialize at 0 when starting a new workflow.  
  
  - Increment for each logical step.  
  
  - When reaching 10, stop planning/tool calls:  
  
    - Return a final state with best available data.  
  
    - Mark in the UI that the step limit was reached (for transparency).  
  
Use AI SDK’s `stopWhen` and/or metadata as needed, but enforce the **10-step logical limit** explicitly.  
  
## Context input: IEP upload vs default  
  
Design a simple context mechanism:  
  
- On first load or via a “Context” panel:  
  
  - Option to **upload an IEP** or structured JSON profile (for the hackathon, you can simulate with a text area or JSON upload).  
  
  - If provided, parse and extract:  
  
    - Goals (e.g., “use 2-word combinations”),  
  
    - Target vocabulary,  
  
    - Constraints (non-literate, motor impairments, etc.).  
  
  - Store this in `UserMemory.userProfile` and `UserMemory.iepContext`.  
  
- If no IEP is uploaded:  
  
  - Use a sensible default profile for an early communicator child.  
  
The planning tools must use this context to bias:  
  
- Slot structure (e.g., simpler utterances for emergent communicators),  
  
- Suggested words,  
  
- Mastery targets in the dashboard.  
  
## Core tools and behavior  
  
Implement AI SDK `tool`s (with `zod` schemas), including:  
  
1. `planFromGoal`  
  
   - Input: goal text + flag whether IEP context is available.  
  
   - Output: JSON plan with 1–10 steps (each step: id, description, type, optional toolToCall).  
  
   - Must respect the 10-step budget.  
  
2. `analyzeGoal`  
  
   - Input: goal text + (optional) IEP context.  
  
   - Output: structured summary of:  
  
     - Communicative intent (requesting, commenting, protesting, etc.).  
  
     - Age / developmental stage (if inferable).  
  
     - Environment (home / school / playground).  
  
     - Constraints (non-literate, motor fatigue, etc.).  
  
3. `proposeSentenceSlots`  
  
   - Output: small set of slots for a fill-the-blank sentence:  
  
     - e.g., `["WHO", "DO", "WHAT", "WHERE_WHEN", "HOW_FEEL"]`.  
  
   - Include a template string like: `"{WHO} {DO} {WHAT} {WHERE_WHEN} {HOW_FEEL}"`.  
  
4. `fetchCoreCandidates`  
  
   - Uses a local JSON of core vocab per slot.  
  
   - Returns a small list of high-frequency, child-friendly words per slot.  
  
5. `fetchDatamuseCandidates`  
  
   - Calls Datamuse based on topic and current partially filled slots.  
  
   - Returns additional candidate words per slot.  
  
6. `fetchLexicalInfo`  
  
   - Calls WordsAPI for candidate words.  
  
   - Filters by part-of-speech and basic complexity (e.g., avoid obscure words).  
  
7. `memoryRead` / `memoryWrite`  
  
   - `memoryRead`: returns `UserMemory` for the session.  
  
   - `memoryWrite`: merges updates:  
  
     - `recentGoals`,  
  
     - `recentUtterances`,  
  
     - `preferredWords` counts,  
  
     - IEP context presence,  
  
     - word frequency data used in the dashboard.  
  
8. `finalizeUtterance`  
  
   - Given:  
  
     - Selected words per slot,  
  
     - Alternative suggestions,  
  
     - Context + IEP,  
  
   - Output:  
  
     - A primary utterance string.  
  
     - 2–3 alternative utterances.  
  
     - Updated stats (e.g., which words were used).  
  
9. `elevenLabsSpeak`  
  
   - Input: text + optional voice ID.  
  
   - Output: a URL or base64 audio that the client can play.  
  
10. (Optional) `analyzeIEP`    
  
    - Input: IEP text or JSON.  
  
    - Output: structured goals, target vocab, and constraints for the memory profile.  
  
All tool usage must fit within the 10-step workflow budget.  
  
## Memory model and analytics  
  
Define a `UserMemory` type, e.g.:  
  
```ts  
  
type WordStats = {  
  
  count: number;  
  
  lastUsedAt: string; // ISO timestamp  
  
};  
  
type CombinationStats = {  
  
  count: number;  
  
};  
  
type MasteryForecast = {  
  
  word: string;  
  
  level: "emerging" | "developing" | "mastered";  
  
  projectedMasteryDate?: string;  
  
};  
  
type UserMemory = {  
  
  userProfile?: {  
  
    ageRange?: "toddler" | "child" | "teen" | "adult";  
  
    literacyLevel?: "non_literate" | "emerging" | "literate";  
  
    language?: string;  
  
  };  
  
  iepContext?: {  
  
    rawText?: string;  
  
    extractedGoals?: string[];  
  
    targetWords?: string[];  
  
  };  
  
  recentGoals: string[];  
  
  recentUtterances: string[];  
  
  preferredWords: Record<string, number>;  
  
  wordStats: Record<string, WordStats>;  
  
  combinationStats: Record<string, CombinationStats>; // e.g., "i want", "go park"  
  
  masteryForecast: MasteryForecast[];  
  
};  
  
Server:  
  
- Maintain a simple in-memory map keyed by session ID.  
  
Client:  
  
- Store session ID and last known memory snapshot in ‎⁠localStorage⁠.  
  
Dashboard:  
  
- Use ‎⁠wordStats⁠ and ‎⁠combinationStats⁠ to render:  
  
 ▫ Live word frequency charts (bar chart or simple list).  
  
 ▫ Lists of common two- or three-word combinations.  
  
- Use ‎⁠masteryForecast⁠ to render:  
  
 ▫ Progress bars and estimated dates (“At current usage, ‘help’ may be mastered in ~3 weeks”).  
  
 ▫ Simple logic is fine (e.g., mastery after N uses over Y days).  
  
Fridge:  
  
- Use ‎⁠wordStats⁠ and ‎⁠masteryForecast⁠ to:  
  
 ▫ Place “magnets” for high-usage or target words.  
  
 ▫ Show stickers/notes when:  
  
 ⁃ A word is used for the first time.  
  
 ⁃ A word crosses defined thresholds (e.g., 5, 10, 20 uses).  
  
Generative UI (React + AI SDK UIMessage parts)  
  
Use ‎⁠useChat⁠ and ‎⁠UIMessage⁠ parts to drive the UI:  
  
- Main page (planning + utterance building):  
  
 ▫ Goal input (text box).  
  
 ▫ Optional IEP upload/textarea.  
  
 ▫ Chat log showing:  
  
 ⁃ User goals.  
  
 ⁃ AI’s step-by-step commentary (e.g., “Step 3/8: fetching Datamuse suggestions for ACTION slot.”).  
  
 ▫ Fill-the-blank main sentence:  
  
 ⁃ Show the template string and current slots filled/empty.  
  
 ▫ Suggestion panel:  
  
 ⁃ For each slot (WHO, DO, WHAT, WHERE/WHEN, HOW/FEEL):  
  
 ▪ Show “floating” word suggestions (core + Datamuse/WordsAPI).  
  
 ▪ Tapping a word adds it to that slot (or to a list of alternatives).  
  
 ▫ Sentence strip:  
  
 ⁃ Show the constructed sentence as tokens.  
  
 ⁃ Buttons:  
  
 ▪ “Speak” → calls the ElevenLabs TTS API route and plays audio.  
  
 ▪ “Clear” → clears the current sentence.  
  
 ▪ “Type your own” → opens a text input where user can free-type a sentence and speak it via ElevenLabs.  
  
- Dashboard page:  
  
 ▫ Word frequency list or simple chart (top N words).  
  
 ▫ Common combinations (e.g., “I want”, “more please”).  
  
 ▫ Mastery forecast section:  
  
 ⁃ Cards per key word showing level + projected mastery date.  
  
- Fridge page/panel:  
  
 ▫ Fridge-like background.  
  
 ▫ Draggable magnetic tiles representing words with high stats or target words.  
  
 ▫ Sticky notes that appear on milestones (first use, 10 uses, etc.).  
  
 ▫ Display these tiles and notes based on ‎⁠UserMemory⁠.  
  
Make UI components touch-friendly with large tap targets and simple layouts for iPad.  
  
Files and structure  
  
At minimum:  
  
- ‎⁠app/page.tsx⁠  
  
 ▫ Main planner + utterance builder UI.  
  
 ▫ IEP upload control.  
  
 ▫ Goal input + chat log.  
  
 ▫ Fill-the-blank main sentence.  
  
 ▫ Suggestion panel.  
  
 ▫ Sentence strip with “Speak” and “Type your own” modes.  
  
- ‎⁠app/dashboard/page.tsx⁠  
  
 ▫ Dashboard view for:  
  
 ⁃ Word frequency.  
  
 ⁃ Common combinations.  
  
 ⁃ Mastery forecast.  
  
- ‎⁠app/fridge/page.tsx⁠  
  
 ▫ Fridge/magnet celebration UI.  
  
- ‎⁠app/api/chat/route.ts⁠  
  
 ▫ AI SDK ‎⁠streamText⁠ endpoint:  
  
 ⁃ Model: ‎⁠anthropic/claude-sonnet-4.5⁠.  
  
 ⁃ System prompt encoding:  
  
 ▪ Planner responsibilities.  
  
 ▪ 10-step limit.  
  
 ▪ Tool usage.  
  
 ▪ Rules for not speaking until user explicitly triggers TTS.  
  
 ⁃ Tools imported from ‎⁠@/ai/tools⁠.  
  
- ‎⁠app/api/tts/route.ts⁠  
  
 ▫ Wraps ‎⁠elevenLabsSpeak⁠ to return playable audio for the browser.  
  
- ‎⁠ai/tools.ts⁠  
  
 ▫ All tools described above (‎⁠planFromGoal⁠, ‎⁠analyzeGoal⁠, ‎⁠proposeSentenceSlots⁠, ‎⁠fetchCoreCandidates⁠,  
⁠fetchDatamuseCandidates⁠, ‎⁠fetchLexicalInfo⁠, ‎⁠memoryRead⁠, ‎⁠memoryWrite⁠,  
⁠finalizeUtterance⁠, ‎⁠elevenLabsSpeak⁠, ‎⁠analyzeIEP⁠).  
  
- ‎⁠lib/memory.ts⁠  
  
 ▫ In-memory ‎⁠UserMemory⁠ store helpers keyed by session ID.  
  
- ‎⁠components/PlanView.tsx⁠, ‎⁠components/SuggestionPanel.tsx⁠, ‎⁠components/SentenceStrip.tsx⁠,  
⁠components/DashboardView.tsx⁠, ‎⁠components/FridgeView.tsx⁠, ‎⁠components/TTSPlayer.tsx⁠.  
  
- Cache: cache the generated ui's and return the cached result instead of generating new ones for a similar user, also have a fall back ui to display in case there is no output.  
  
What I want from you (Claude)  
  
1. Propose and refine the system prompt for ‎⁠streamText⁠ that encodes:  
  
 ▫ Planner behavior and step ordering.  
  
 ▫ The strict 10-step execution limit per workflow.  
  
 ▫ How and when to call each tool.  
  
 ▫ The requirement that nothing is spoken until the user explicitly triggers TTS.  
  
 ▫ How to use IEP context when available vs a default profile.  
  
2. Generate a Next.js + AI SDK codebase:  
  
 ▫ All files listed above, with TypeScript.  
  
 ▫ Working tool definitions and API wrappers for Datamuse, WordsAPI, and ElevenLabs.  
  
 ▫ A simple memory layer and session handling.  
  
 ▫ The main page (planner + fill-the-blank sentence), dashboard, and fridge UI.  
  
3. Ensure the final project:  
  
 ▫ Runs with ‎⁠npm run dev⁠ or ‎⁠pnpm dev⁠.  
  
 ▫ Demonstrates the full pipeline:  
  
 ⁃ Goal (+ optional IEP) → Plan (≤10 steps) → Tools (Datamuse/WordsAPI/Memory/ElevenLabs) → Memory updates → Sentence building → TTS → Analytics + celebration UI.  
  
 ▫ Has a clean, hackathon-ready UI suitable for demo on desktop and iPad.  
  

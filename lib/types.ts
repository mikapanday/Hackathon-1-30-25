// Word usage statistics
export interface WordStats {
  count: number;
  lastUsedAt: string; // ISO timestamp
}

// Word combination statistics
export interface CombinationStats {
  count: number;
}

// Mastery prediction for a word
export interface MasteryForecast {
  word: string;
  level: "emerging" | "developing" | "mastered";
  projectedMasteryDate?: string;
}

// The 5 steps in the sentence building wizard
export type SlotType = "WHO" | "ACTION" | "OBJECT" | "LOCATION" | "MODIFIERS";

// A single slot in the sentence
export interface SentenceSlot {
  type: SlotType;
  value: string | null;
  isCustom: boolean; // true if user typed custom word
}

// State of the sentence building wizard
export interface WizardState {
  currentStep: SlotType;
  slots: Record<SlotType, SentenceSlot>;
  isComplete: boolean;
}

// User profile information
export interface UserProfile {
  ageRange?: string;
  literacyLevel?: string;
  language?: string;
}

// IEP (Individualized Education Program) context
export interface IEPContext {
  rawText?: string;
  extractedGoals?: string[];
  targetWords?: string[];
}

// Main memory object for a user session
export interface UserMemory {
  sessionId: string;
  userProfile?: UserProfile;
  iepContext?: IEPContext;
  recentGoals: string[];
  recentUtterances: string[];
  preferredWords: Record<string, number>;
  wordStats: Record<string, WordStats>;
  combinationStats: Record<string, CombinationStats>;
  masteryForecast: MasteryForecast[];
  createdAt: string;
  updatedAt: string;
}

// A step in the AI's plan
export interface PlanStep {
  id: number;
  description: string;
  status: "pending" | "in_progress" | "completed";
}

import { SlotType } from './types';

// Core vocabulary matching the Figma design
export const CORE_VOCABULARY: Record<SlotType, string[]> = {
  WHO: ["I", "You", "We", "They", "Yes", "No"],
  ACTION: ["want", "go", "play", "look", "eat", "get", "stop", "like"],
  OBJECT: ["ball", "toy", "it", "that", "more", "water"],
  LOCATION: ["here", "there", "outside", "in", "on", "now", "later"],
  MODIFIERS: ["more", "again", "big", "fast", "good", "bad", "happy", "mad"],
};

// Order of steps in the wizard
export const STEP_ORDER: SlotType[] = [
  "WHO",
  "ACTION",
  "OBJECT",
  "LOCATION",
  "MODIFIERS",
];

// Human-readable labels for each step
export const STEP_LABELS: Record<SlotType, string> = {
  WHO: "Agent (WHO)",
  ACTION: "Action",
  OBJECT: "Patient-object",
  LOCATION: "Location",
  MODIFIERS: "Modifiers-feelings",
};

// Default user profile for an early communicator child
export const DEFAULT_USER_PROFILE = {
  ageRange: "3-7",
  literacyLevel: "early-communicator",
  language: "en",
};

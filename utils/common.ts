
import { GameState, GameHistoryEntry } from "../types";

export function deepClone<T,>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  // Handle Array
  if (Array.isArray(obj)) {
    const clonedArray = [] as any[];
    for (let i = 0; i < obj.length; i++) {
      clonedArray[i] = deepClone(obj[i]);
    }
    return clonedArray as T;
  }
  // Handle Object
  const clonedObj = {} as { [key: string]: any };
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clonedObj[key] = deepClone((obj as any)[key]);
    }
  }
  return clonedObj as T;
}


export function sanitizeFilename(name: string): string {
  if (!name) return 'level';
  return name
    .replace(/[^a-z0-9_\-\s.]/gi, '_') // Replace invalid chars with underscore
    .replace(/[\s_]+/g, '_'); // Collapse multiple spaces/underscores to one
}

export function statesAreEqual(stateA: GameHistoryEntry, stateB: GameHistoryEntry): boolean {
  // A more robust comparison than JSON.stringify if needed, but for this game, stringify is likely sufficient and simpler.
  // For very complex states or states with functions/undefined, a custom deep equal function would be better.
  try {
    return JSON.stringify(stateA) === JSON.stringify(stateB);
  } catch (e) {
    console.error("State comparison failed:", e);
    return false;
  }
}
    
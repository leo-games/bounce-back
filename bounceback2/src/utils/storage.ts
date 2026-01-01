import type { LevelData, LevelProgress } from '@/types';
import { STORAGE_KEYS } from './constants';

export function saveCustomLevels(levels: LevelData[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.customLevels, JSON.stringify(levels));
  } catch (e) {
    console.error('Failed to save custom levels:', e);
  }
}

export function loadCustomLevels(): LevelData[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.customLevels);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load custom levels:', e);
  }
  return [];
}

export function saveProgress(progress: Record<string, LevelProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save progress:', e);
  }
}

export function loadProgress(): Record<string, LevelProgress> {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.progress);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load progress:', e);
  }
  return {};
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

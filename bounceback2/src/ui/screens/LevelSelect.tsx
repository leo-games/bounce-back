import type { LevelData, LevelProgress } from '@/types';
import { Button } from '../components/Button';

interface LevelSelectProps {
  levels: LevelData[];
  progress: Record<string, LevelProgress>;
  onSelectLevel: (level: LevelData) => void;
  onBack: () => void;
}

export function LevelSelect({ levels, progress, onSelectLevel, onBack }: LevelSelectProps) {
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-b from-sky-100 to-blue-200 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
        <h2 className="text-2xl font-bold text-indigo-600">Select Level</h2>
      </div>

      {/* Level grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {levels.map((level, index) => {
            const levelProgress = progress[level.id];
            const isCompleted = levelProgress?.completed ?? false;
            const bestAttempts = levelProgress?.bestAttempts ?? null;

            return (
              <button
                key={level.id}
                onClick={() => onSelectLevel(level)}
                className={`
                  relative p-4 rounded-2xl border-2 transition-all duration-200
                  hover:scale-105 active:scale-95
                  ${isCompleted
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-indigo-200 hover:border-indigo-400'
                  }
                `}
              >
                {/* Level number */}
                <div className={`
                  text-3xl font-bold mb-2
                  ${isCompleted ? 'text-green-500' : 'text-indigo-500'}
                `}>
                  {index + 1}
                </div>

                {/* Level name */}
                <div className="text-sm text-slate-600 truncate">
                  {level.name}
                </div>

                {/* Completion badge */}
                {isCompleted && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                {/* Best attempts */}
                {bestAttempts !== null && (
                  <div className="text-xs text-slate-500 mt-1">
                    Best: {bestAttempts} {bestAttempts === 1 ? 'try' : 'tries'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

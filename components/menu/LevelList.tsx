
import React from 'react';
import { LevelData } from '../../types';

interface LevelListProps {
  levels: LevelData[];
  currentLevelIndex: number;
  onSelectLevel: (index: number) => void;
  onRenameLevel: (index: number) => void;
  onMoveLevelUp: (index: number) => void;
  onMoveLevelDown: (index: number) => void;
}

const LevelList: React.FC<LevelListProps> = ({
  levels,
  currentLevelIndex,
  onSelectLevel,
  onRenameLevel,
  onMoveLevelUp,
  onMoveLevelDown,
}) => {
  return (
    <div className="border rounded-md p-2 bg-gray-50 shadow-inner">
      <h4 className="text-sm font-medium mb-1 text-gray-700">Levels:</h4>
      <ul className="text-sm max-h-48 overflow-y-auto mb-2 border rounded bg-white divide-y divide-gray-200">
        {levels.map((level, index) => (
          <li
            key={index}
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('.level-controls')) return;
              onSelectLevel(index);
            }}
            className={`p-2 cursor-pointer flex justify-between items-center transition-colors duration-100 ease-in-out
                        ${index === currentLevelIndex ? 'bg-blue-100 border-blue-300 font-medium' : 'hover:bg-gray-100'}`}
          >
            <span
              className="level-name flex-grow mr-2 whitespace-nowrap overflow-hidden text-ellipsis hover:underline"
              title="Double-click to rename"
              onDoubleClick={(e) => {
                e.stopPropagation();
                onRenameLevel(index);
              }}
            >
              {level.name || `Level ${index + 1}`}
            </span>
            <div className="level-controls flex space-x-1">
              <button
                title="Move Up"
                onClick={(e) => { e.stopPropagation(); onMoveLevelUp(index); }}
                disabled={index === 0}
                className="p-1 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &uarr;
              </button>
              <button
                title="Move Down"
                onClick={(e) => { e.stopPropagation(); onMoveLevelDown(index); }}
                disabled={index === levels.length - 1}
                className="p-1 text-xs rounded bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                &darr;
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LevelList;
    
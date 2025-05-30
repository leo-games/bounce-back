
import React from 'react';

interface StartMenuProps {
  onStart: () => void;
}

const StartMenu: React.FC<StartMenuProps> = ({ onStart }) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full bg-blue-200 bg-opacity-95 flex flex-col justify-center items-center z-50 text-center p-5">
      <h1 className="text-5xl font-bold text-blue-800 mb-4 text-shadow-lg">Bounce Back</h1>
      <p className="text-blue-700 mb-8 text-lg">React & TypeScript Edition</p>
      <button
        onClick={onStart}
        className="px-8 py-3 text-xl font-medium text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition duration-200 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
      >
        Play Game
      </button>
    </div>
  );
};

export default StartMenu;
    

import React from 'react';

interface StartMenuProps {
  onStart: () => void;
}

const StartMenu: React.FC<StartMenuProps> = ({ onStart }) => {
  return (
    <div className="hero-screen z-50">
      <div className="hero-card">
        <div className="hero-badge">Physics Puzzle</div>
        <h1 className="hero-title">Bounce Back</h1>
        <p className="hero-subtitle">
          Curve one perfect shot into the hole, then craft your own playable challenges.
        </p>
        <button onClick={onStart} className="hero-cta">
          Start Playing
        </button>
        <div className="hero-tips">
          <span className="hero-tip">Drag from the ball to aim</span>
          <span className="hero-tip">Red bricks reset your attempt</span>
          <span className="hero-tip">Edit mode includes solvability checks</span>
        </div>
      </div>
    </div>
  );
};

export default StartMenu;
    

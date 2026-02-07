
import React from 'react';
import { EditorState } from '../../types';

interface MarqueeBoxProps {
  marqueeState: Pick<EditorState, 'isMarqueeSelecting' | 'marqueeStart' | 'marqueeEnd'>;
}

const MarqueeBox: React.FC<MarqueeBoxProps> = ({ marqueeState }) => {
  if (!marqueeState.isMarqueeSelecting) {
    return null;
  }

  const x = Math.min(marqueeState.marqueeStart.x, marqueeState.marqueeEnd.x);
  const y = Math.min(marqueeState.marqueeStart.y, marqueeState.marqueeEnd.y);
  const width = Math.abs(marqueeState.marqueeStart.x - marqueeState.marqueeEnd.x);
  const height = Math.abs(marqueeState.marqueeStart.y - marqueeState.marqueeEnd.y);

  return (
    <div
      className="absolute border border-dashed border-orange-500 bg-orange-300 bg-opacity-20 pointer-events-none z-10"
      style={{
        left: x,
        top: y,
        width: width,
        height: height,
      }}
    />
  );
};

export default MarqueeBox;
    

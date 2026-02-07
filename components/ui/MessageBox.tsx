
import React, { useEffect } from 'react';

interface MessageBoxProps {
  message: string;
  onClose: () => void;
}

const MessageBox: React.FC<MessageBoxProps> = ({ message, onClose }) => {
  useEffect(() => {
    // This component is mounted when there's a message.
    // The App component handles the timeout for hiding.
    // If we need self-hiding logic here, it can be added.
  }, [message]);

  if (!message) return null;

  return (
    <div className="toast-message">
      <div className="toast-row">
        <p className="m-0 text-sm">{message}</p>
        <button onClick={onClose} className="toast-close text-xs" aria-label="Dismiss message">
          X
        </button>
      </div>
    </div>
  );
};

export default MessageBox;
    

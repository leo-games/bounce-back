
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
    <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-75 text-white px-6 py-4 rounded-lg shadow-xl text-center z-50">
      <p>{message}</p>
      <button
        onClick={onClose}
        className="mt-3 px-4 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-150 ease-in-out text-sm"
      >
        OK
      </button>
    </div>
  );
};

export default MessageBox;
    
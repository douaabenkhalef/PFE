// frontend/src/components/FormError.jsx
import React from 'react';
import { AlertCircle } from 'lucide-react';

const FormError = ({ messages, onClose }) => {
  if (!messages || messages.length === 0) return null;
  
  const messageArray = Array.isArray(messages) ? messages : [messages];
  
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          {messageArray.map((msg, index) => (
            <p key={index} className="text-red-300 text-sm">
              {msg}
            </p>
          ))}
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-red-400/70 hover:text-red-300 transition ml-2"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default FormError;
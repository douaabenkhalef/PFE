// frontend/src/components/FormError.jsx
import React from 'react';
import { AlertCircle, Shield } from 'lucide-react';

const FormError = ({ messages, onClose }) => {
  if (!messages || messages.length === 0) return null;
  
  const messageArray = Array.isArray(messages) ? messages : [messages];
  
  // Détecter si c'est une erreur de permission
  const isPermissionError = messageArray.some(msg => 
    msg?.toLowerCase().includes('permission') || 
    msg?.toLowerCase().includes('pas les droits') ||
    msg?.toLowerCase().includes('pas autorisé')
  );
  
  return (
    <div className={`rounded-lg p-4 mb-4 ${
      isPermissionError 
        ? 'bg-orange-500/10 border border-orange-500/30' 
        : 'bg-red-500/10 border border-red-500/30'
    }`}>
      <div className="flex items-start gap-3">
        {isPermissionError ? (
          <Shield className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          {messageArray.map((msg, index) => (
            <p key={index} className={`text-sm ${isPermissionError ? 'text-orange-300' : 'text-red-300'}`}>
              {msg}
            </p>
          ))}
          {isPermissionError && (
            <p className="text-orange-300/70 text-xs mt-2">
              💡 Veuillez contacter votre Department Head pour demander les permissions nécessaires.
            </p>
          )}
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className={`${isPermissionError ? 'text-orange-400/70 hover:text-orange-300' : 'text-red-400/70 hover:text-red-300'} transition ml-2`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default FormError;
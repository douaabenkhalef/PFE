// frontend/src/components/FormError.jsx
import React from 'react';
import { AlertCircle, Shield } from 'lucide-react';

const FormError = ({ messages, onClose }) => {
  if (!messages || messages.length === 0) return null;
  
  const messageArray = Array.isArray(messages) ? messages : [messages];
  
  // Detect if it's a permission error
  const isPermissionError = messageArray.some(msg => 
    msg?.toLowerCase().includes('permission') || 
    msg?.toLowerCase().includes('access') ||
    msg?.toLowerCase().includes('not authorized') ||
    msg?.toLowerCase().includes('rights')
  );
  
  return (
    <div className={`form-error ${isPermissionError ? 'permission-error' : 'validation-error'}`}>
      <div className="form-error-content">
        {isPermissionError ? (
          <Shield className="form-error-icon permission" />
        ) : (
          <AlertCircle className="form-error-icon validation" />
        )}
        <div className="form-error-messages">
          {messageArray.map((msg, index) => (
            <p key={index} className={`form-error-text ${isPermissionError ? 'permission' : 'validation'}`}>
              {msg}
            </p>
          ))}
          {isPermissionError && (
            <p className="form-error-suggestion">
              💡 Please contact your Department Head to request the necessary permissions.
            </p>
          )}
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className={`form-error-close ${isPermissionError ? 'permission' : 'validation'}`}
          >
            ✕
          </button>
        )}
      </div>

      <style>{`
        /* ===== FORM ERROR STYLES ===== */
        .form-error {
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .form-error.validation-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        
        .form-error.permission-error {
          background: rgba(249, 115, 22, 0.1);
          border: 1px solid rgba(249, 115, 22, 0.3);
        }
        
        .form-error-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        
        .form-error-icon {
          width: 20px;
          height: 20px;
          margin-top: 2px;
          flex-shrink: 0;
        }
        
        .form-error-icon.validation {
          color: #ef4444;
        }
        
        .form-error-icon.permission {
          color: #f97316;
        }
        
        .form-error-messages {
          flex: 1;
        }
        
        .form-error-text {
          font-size: 0.875rem;
          margin: 0;
          line-height: 1.4;
        }
        
        .form-error-text.validation {
          color: #fca5a5;
        }
        
        .form-error-text.permission {
          color: #fdba74;
        }
        
        .form-error-suggestion {
          color: rgba(253, 186, 116, 0.7);
          font-size: 0.75rem;
          margin-top: 8px;
        }
        
        .form-error-close {
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s;
          margin-left: 8px;
          font-size: 14px;
        }
        
        .form-error-close.validation {
          color: rgba(239, 68, 68, 0.6);
        }
        
        .form-error-close.validation:hover {
          color: #fca5a5;
        }
        
        .form-error-close.permission {
          color: rgba(249, 115, 22, 0.6);
        }
        
        .form-error-close.permission:hover {
          color: #fdba74;
        }
        
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 480px) {
          .form-error {
            padding: 12px;
          }
          .form-error-content {
            gap: 8px;
          }
          .form-error-icon {
            width: 16px;
            height: 16px;
          }
          .form-error-text {
            font-size: 0.75rem;
          }
          .form-error-suggestion {
            font-size: 0.65rem;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .form-error.validation-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        
        body.light-mode .form-error.permission-error {
          background: rgba(249, 115, 22, 0.08);
          border: 1px solid rgba(249, 115, 22, 0.4);
        }
        
        body.light-mode .form-error-text.validation {
          color: #dc2626;
        }
        
        body.light-mode .form-error-text.permission {
          color: #ea580c;
        }
        
        body.light-mode .form-error-suggestion {
          color: #ea580c;
          opacity: 0.8;
        }
        
        body.light-mode .form-error-icon.validation {
          color: #dc2626;
        }
        
        body.light-mode .form-error-icon.permission {
          color: #ea580c;
        }
        
        body.light-mode .form-error-close.validation {
          color: rgba(220, 38, 38, 0.6);
        }
        
        body.light-mode .form-error-close.validation:hover {
          color: #dc2626;
        }
        
        body.light-mode .form-error-close.permission {
          color: rgba(234, 88, 12, 0.6);
        }
        
        body.light-mode .form-error-close.permission:hover {
          color: #ea580c;
        }
      `}</style>
    </div>
  );
};

export default FormError;
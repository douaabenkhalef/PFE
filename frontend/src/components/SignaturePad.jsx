// frontend/src/components/SignaturePad.jsx
import React, { useRef, useState } from 'react';
import { PenTool, X, Check, RefreshCw } from 'lucide-react';

const SignaturePad = ({ onSave, onClose, title = "Add your signature" }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    ctx.lineTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  return (
    <div className="signature-modal-overlay" onClick={onClose}>
      <div className="signature-modal" onClick={(e) => e.stopPropagation()}>
        <div className="signature-modal-header">
          <div className="signature-modal-header-left">
            <PenTool className="signature-modal-header-icon" />
            <h3 className="signature-modal-title">{title}</h3>
          </div>
          <button onClick={onClose} className="signature-modal-close">
            <X size={20} />
          </button>
        </div>
        
        <div className="signature-modal-body">
          <div className="signature-canvas-container">
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
              className="signature-canvas"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={(e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const canvas = canvasRef.current;
                const rect = canvas.getBoundingClientRect();
                const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
                const ctx = canvas.getContext('2d');
                ctx.beginPath();
                ctx.moveTo(x, y);
                setIsDrawing(true);
              }}
              onTouchMove={(e) => {
                e.preventDefault();
                if (!isDrawing) return;
                const touch = e.touches[0];
                const canvas = canvasRef.current;
                const rect = canvas.getBoundingClientRect();
                const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
                const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
                const ctx = canvas.getContext('2d');
                ctx.lineTo(x, y);
                ctx.lineWidth = 2;
                ctx.lineCap = 'round';
                ctx.strokeStyle = '#000';
                ctx.stroke();
                setHasSignature(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                setIsDrawing(false);
              }}
            />
          </div>
          
          <div className="signature-actions">
            <button
              onClick={clearSignature}
              className="signature-clear-btn"
            >
              <RefreshCw size={16} />
              Clear
            </button>
            <button
              onClick={saveSignature}
              disabled={!hasSignature}
              className="signature-save-btn"
            >
              <Check size={16} />
              Validate
            </button>
          </div>
          
          <p className="signature-hint">
            Use your mouse or finger to sign in the area above
          </p>
        </div>
      </div>

      <style>{`
        /* ===== SIGNATURE PAD STYLES ===== */
        
        /* Modal overlay */
        .signature-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 100;
        }
        
        /* Modal container */
        .signature-modal {
          background: #1e293b;
          border: 1px solid rgba(141, 35, 212, 0.3);
          border-radius: 16px;
          width: 100%;
          max-width: 448px;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        }
        
        /* Modal header */
        .signature-modal-header {
          padding: 20px;
          border-bottom: 1px solid rgba(141, 35, 212, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .signature-modal-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .signature-modal-header-icon {
          width: 20px;
          height: 20px;
          color: #c084fc;
        }
        .signature-modal-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }
        .signature-modal-close {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .signature-modal-close:hover {
          color: white;
        }
        
        /* Modal body */
        .signature-modal-body {
          padding: 20px;
        }
        
        /* Canvas container */
        .signature-canvas-container {
          background: white;
          border-radius: 8px;
          padding: 8px;
          margin-bottom: 16px;
        }
        .signature-canvas {
          width: 100%;
          height: 180px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          cursor: crosshair;
          background: white;
        }
        
        /* Action buttons */
        .signature-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        .signature-clear-btn {
          flex: 1;
          padding: 10px 16px;
          background: #334155;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .signature-clear-btn:hover {
          background: #475569;
        }
        .signature-save-btn {
          flex: 1;
          padding: 10px 16px;
          background: #059669;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .signature-save-btn:hover:not(:disabled) {
          background: #10b981;
        }
        .signature-save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Hint text */
        .signature-hint {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.7rem;
          text-align: center;
          margin: 0;
        }
        
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 480px) {
          .signature-modal {
            max-width: 95%;
          }
          .signature-modal-header {
            padding: 16px;
          }
          .signature-modal-title {
            font-size: 1rem;
          }
          .signature-modal-body {
            padding: 16px;
          }
          .signature-canvas-container {
            padding: 6px;
          }
          .signature-canvas {
            height: 140px;
          }
          .signature-clear-btn,
          .signature-save-btn {
            padding: 8px 12px;
            font-size: 0.75rem;
          }
          .signature-clear-btn svg,
          .signature-save-btn svg {
            width: 14px;
            height: 14px;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .signature-modal {
          background: #ffffff;
          border-color: rgba(141, 35, 212, 0.3);
        }
        body.light-mode .signature-modal-title {
          color: #1a1a2e;
        }
        body.light-mode .signature-modal-close {
          color: #666;
        }
        body.light-mode .signature-modal-close:hover {
          color: #1a1a2e;
        }
        body.light-mode .signature-canvas-container {
          background: #f8fafc;
        }
        body.light-mode .signature-canvas {
          border-color: #cbd5e1;
        }
        body.light-mode .signature-clear-btn {
          background: #e2e8f0;
          color: #1a1a2e;
        }
        body.light-mode .signature-clear-btn:hover {
          background: #cbd5e1;
        }
        body.light-mode .signature-save-btn {
          background: #8D23D4;
        }
        body.light-mode .signature-save-btn:hover:not(:disabled) {
          background: #6B21A5;
        }
        body.light-mode .signature-hint {
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default SignaturePad;
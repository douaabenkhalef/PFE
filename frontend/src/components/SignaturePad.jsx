// frontend/src/components/SignaturePad.jsx
import React, { useRef, useState } from 'react';
import { PenTool, X, Check, RefreshCw } from 'lucide-react';

const SignaturePad = ({ onSave, onClose, title = "Ajouter votre signature" }) => {
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5">
          <div className="bg-white rounded-lg p-2 mb-4">
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
              className="w-full h-40 border border-gray-300 rounded cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={clearSignature}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              Effacer
            </button>
            <button
              onClick={saveSignature}
              disabled={!hasSignature}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check size={16} />
              Valider
            </button>
          </div>
          
          <p className="text-slate-400 text-xs text-center mt-4">
            Utilisez votre souris ou votre doigt pour signer dans la zone ci-dessus
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignaturePad;
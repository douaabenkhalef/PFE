// frontend/src/components/StampPad.jsx
import React, { useState, useRef } from 'react';
import { Stamp, X, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const StampPad = ({ onSave, onClose, title = "Importer le cachet de l'université", existingStamp }) => {
  const [stampImage, setStampImage] = useState(existingStamp || null);
  const [stampPreview, setStampPreview] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier le type de fichier
    if (!file.type.includes('image')) {
      toast.error('Veuillez sélectionner une image (PNG, JPG, JPEG)');
      return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 2 Mo');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imgData = event.target.result;
      setStampImage(imgData);
      setStampPreview(imgData);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveStamp = () => {
    setStampImage(null);
    setStampPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!stampImage) {
      toast.error('Veuillez importer une image du cachet');
      return;
    }
    onSave(stampImage);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-md">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Stamp className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5">
          {/* Zone de preview du cachet */}
          <div className="bg-slate-800/60 rounded-lg p-4 mb-4 flex flex-col items-center justify-center min-h-[200px] border border-dashed border-slate-600">
            {stampPreview ? (
              <div className="relative">
                <img 
                  src={stampPreview} 
                  alt="Cachet" 
                  className="max-w-full max-h-[150px] object-contain"
                />
                <button
                  onClick={handleRemoveStamp}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600 transition"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div className="text-center">
                <Stamp className="w-12 h-12 text-slate-500 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Aucun cachet importé</p>
                <p className="text-slate-500 text-xs mt-1">PNG, JPG, JPEG (max 2 Mo)</p>
              </div>
            )}
          </div>

          {/* Bouton d'upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileUpload}
            className="hidden"
            id="stamp-upload"
          />
          
          <label
            htmlFor="stamp-upload"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition cursor-pointer mb-3"
          >
            <Upload size={16} />
            Importer le cachet
          </label>

          {/* Informations */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
            <p className="text-blue-300 text-xs">
              <strong>📌 Recommandations :</strong>
            </p>
            <ul className="text-blue-300/70 text-xs mt-1 space-y-1">
              <li>• Utilisez une image PNG avec fond transparent</li>
              <li>• Taille recommandée : 300x300 pixels</li>
              <li>• Format supporté : PNG, JPG, JPEG</li>
            </ul>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!stampImage}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Valider le cachet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StampPad;
// frontend/src/components/StampPad.jsx
import React, { useState, useRef } from 'react';
import { Stamp, X, Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const StampPad = ({ onSave, onClose, title = "Import university stamp", existingStamp }) => {
  const [stampImage, setStampImage] = useState(existingStamp || null);
  const [stampPreview, setStampPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file type
    if (!file.type.includes('image')) {
      toast.error('Please select an image (PNG, JPG, JPEG)');
      return;
    }

    // 🔥 Increase max size: 2 MB → 10 MB
    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
      toast.error(`Image must not exceed 10 MB`);
      return;
    }

    setUploading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgData = event.target.result;
      setStampImage(imgData);
      setStampPreview(imgData);
      setUploading(false);
      toast.success('Image loaded successfully');
    };
    reader.onerror = () => {
      toast.error('Error loading image');
      setUploading(false);
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
      toast.error('Please import a stamp image');
      return;
    }
    console.log("📸 Saving stamp, image length:", stampImage.length);
    onSave(stampImage);
  };

  return (
    <div className="stamp-modal-overlay" onClick={onClose}>
      <div className="stamp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="stamp-modal-header">
          <div className="stamp-modal-header-left">
            <Stamp className="stamp-modal-header-icon" />
            <h3 className="stamp-modal-title">{title}</h3>
          </div>
          <button onClick={onClose} className="stamp-modal-close">
            <X size={20} />
          </button>
        </div>
        
        <div className="stamp-modal-body">
          {/* Stamp preview area */}
          <div className="stamp-preview-area">
            {uploading ? (
              <div className="stamp-preview-loading">
                <Loader2 className="stamp-preview-spinner" />
                <p className="stamp-preview-loading-text">Loading...</p>
              </div>
            ) : stampPreview ? (
              <div className="stamp-preview-image-container">
                <img 
                  src={stampPreview} 
                  alt="Stamp" 
                  className="stamp-preview-image"
                  onError={() => {
                    toast.error('Error loading image');
                    handleRemoveStamp();
                  }}
                />
                <button
                  onClick={handleRemoveStamp}
                  className="stamp-preview-remove"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div className="stamp-preview-empty">
                <Stamp className="stamp-preview-empty-icon" />
                <p className="stamp-preview-empty-text">No stamp imported</p>
                <p className="stamp-preview-empty-hint">PNG, JPG, JPEG (max 10 MB)</p>
              </div>
            )}
          </div>

          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileUpload}
            className="stamp-file-input"
            id="stamp-upload"
          />
          
          <label
            htmlFor="stamp-upload"
            className="stamp-upload-btn"
          >
            <Upload size={16} />
            Import stamp
          </label>

          {/* Information */}
          <div className="stamp-info">
            <p className="stamp-info-title">
              <strong>📌 Recommendations:</strong>
            </p>
            <ul className="stamp-info-list">
              <li>• Use PNG image with transparent background</li>
              <li>• Recommended size: 300x300 pixels</li>
              <li>• Supported formats: PNG, JPG, JPEG (max 10 MB)</li>
            </ul>
          </div>
          
          <div className="stamp-modal-actions">
            <button
              onClick={onClose}
              className="stamp-modal-cancel"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!stampImage || uploading}
              className="stamp-modal-submit"
            >
              Validate stamp
            </button>
          </div>
        </div>
      </div>

      <style>{`
        /* ===== STAMP PAD STYLES ===== */
        
        /* Modal overlay */
        .stamp-modal-overlay {
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
        .stamp-modal {
          background: #1e293b;
          border: 1px solid rgba(141, 35, 212, 0.3);
          border-radius: 16px;
          width: 100%;
          max-width: 448px;
          overflow: hidden;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        }
        
        /* Modal header */
        .stamp-modal-header {
          padding: 20px;
          border-bottom: 1px solid rgba(141, 35, 212, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stamp-modal-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stamp-modal-header-icon {
          width: 20px;
          height: 20px;
          color: #60a5fa;
        }
        .stamp-modal-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: white;
          margin: 0;
        }
        .stamp-modal-close {
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stamp-modal-close:hover {
          color: white;
        }
        
        /* Modal body */
        .stamp-modal-body {
          padding: 20px;
        }
        
        /* Preview area */
        .stamp-preview-area {
          background: rgba(30, 41, 59, 0.6);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          border: 1px dashed rgba(141, 35, 212, 0.3);
        }
        .stamp-preview-loading {
          text-align: center;
        }
        .stamp-preview-spinner {
          width: 40px;
          height: 40px;
          color: #60a5fa;
          animation: spin 1s linear infinite;
          margin: 0 auto 8px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .stamp-preview-loading-text {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.875rem;
          margin: 0;
        }
        .stamp-preview-image-container {
          position: relative;
        }
        .stamp-preview-image {
          max-width: 100%;
          max-height: 150px;
          object-fit: contain;
        }
        .stamp-preview-remove {
          position: absolute;
          top: -8px;
          right: -8px;
          padding: 4px;
          background: #ef4444;
          border: none;
          border-radius: 50%;
          color: white;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stamp-preview-remove:hover {
          background: #dc2626;
        }
        .stamp-preview-empty {
          text-align: center;
        }
        .stamp-preview-empty-icon {
          width: 48px;
          height: 48px;
          color: rgba(255, 255, 255, 0.3);
          margin: 0 auto 8px;
        }
        .stamp-preview-empty-text {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.875rem;
          margin: 0;
        }
        .stamp-preview-empty-hint {
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.75rem;
          margin-top: 4px;
        }
        
        /* File input (hidden) */
        .stamp-file-input {
          display: none;
        }
        
        /* Upload button */
        .stamp-upload-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px 16px;
          background: #334155;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
          margin-bottom: 12px;
        }
        .stamp-upload-btn:hover {
          background: #475569;
        }
        
        /* Info box */
        .stamp-info {
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 16px;
        }
        .stamp-info-title {
          color: #93c5fd;
          font-size: 0.75rem;
          margin: 0 0 4px 0;
        }
        .stamp-info-list {
          color: rgba(147, 197, 253, 0.7);
          font-size: 0.7rem;
          margin: 0;
          padding-left: 20px;
          list-style: none;
        }
        .stamp-info-list li {
          margin: 4px 0;
        }
        
        /* Modal actions */
        .stamp-modal-actions {
          display: flex;
          gap: 12px;
        }
        .stamp-modal-cancel {
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
        }
        .stamp-modal-cancel:hover {
          background: #475569;
        }
        .stamp-modal-submit {
          flex: 1;
          padding: 10px 16px;
          background: #2563eb;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .stamp-modal-submit:hover:not(:disabled) {
          background: #3b82f6;
        }
        .stamp-modal-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 480px) {
          .stamp-modal {
            max-width: 95%;
          }
          .stamp-modal-header {
            padding: 16px;
          }
          .stamp-modal-title {
            font-size: 1rem;
          }
          .stamp-modal-body {
            padding: 16px;
          }
          .stamp-preview-area {
            min-height: 160px;
          }
          .stamp-preview-empty-icon {
            width: 36px;
            height: 36px;
          }
          .stamp-upload-btn,
          .stamp-modal-cancel,
          .stamp-modal-submit {
            padding: 8px 12px;
            font-size: 0.75rem;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .stamp-modal {
          background: #ffffff;
          border-color: rgba(141, 35, 212, 0.3);
        }
        body.light-mode .stamp-modal-title {
          color: #1a1a2e;
        }
        body.light-mode .stamp-modal-close {
          color: #666;
        }
        body.light-mode .stamp-modal-close:hover {
          color: #1a1a2e;
        }
        body.light-mode .stamp-preview-area {
          background: rgba(0, 0, 0, 0.03);
          border-color: rgba(141, 35, 212, 0.2);
        }
        body.light-mode .stamp-preview-loading-text {
          color: #666;
        }
        body.light-mode .stamp-preview-empty-text {
          color: #666;
        }
        body.light-mode .stamp-preview-empty-hint {
          color: #999;
        }
        body.light-mode .stamp-preview-empty-icon {
          color: #ccc;
        }
        body.light-mode .stamp-upload-btn {
          background: #e2e8f0;
          color: #1a1a2e;
        }
        body.light-mode .stamp-upload-btn:hover {
          background: #cbd5e1;
        }
        body.light-mode .stamp-info {
          background: rgba(59, 130, 246, 0.08);
        }
        body.light-mode .stamp-info-title {
          color: #2563eb;
        }
        body.light-mode .stamp-info-list {
          color: #4b5563;
        }
        body.light-mode .stamp-modal-cancel {
          background: #e2e8f0;
          color: #1a1a2e;
        }
        body.light-mode .stamp-modal-cancel:hover {
          background: #cbd5e1;
        }
        body.light-mode .stamp-modal-submit {
          background: #8D23D4;
        }
        body.light-mode .stamp-modal-submit:hover:not(:disabled) {
          background: #6B21A5;
        }
      `}</style>
    </div>
  );
};

export default StampPad;
// frontend/src/page/MyCV.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, Download, Upload, Eye, Trash2, Loader2, 
  X, Clock, Briefcase, User, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentSidebar from '../components/Studentsidebar';
import './MyCV.css';

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('access_token');

const authHeaders = () => ({
  'Authorization': `Bearer ${token()}`
});

// Composant CVViewer amélioré
function CVViewer({ url, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const accessToken = localStorage.getItem('access_token');
        
        // Construire l'URL correctement
        let fullUrl = url;
        if (url && !url.startsWith('http')) {
          if (url.startsWith('/api/')) {
            fullUrl = `http://localhost:8000${url}`;
          } else if (url.startsWith('/student/')) {
            fullUrl = `http://localhost:8000/api${url}`;
          } else {
            fullUrl = `http://localhost:8000/api/${url}`;
          }
        }
        
        console.log('📥 Loading PDF from:', fullUrl);
        
        const res = await fetch(fullUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setBlobUrl(blobUrl);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error loading PDF:', err);
        setError(err.message || 'Impossible de charger le CV');
        setLoading(false);
      }
    };
    
    if (url) {
      loadPdf();
    } else {
      setError('URL du CV non trouvée');
      setLoading(false);
    }
    
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [url]);

  return (
    <div
      className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]"
      onClick={onClose}
    >
      <div
        style={{
          background: '#0e0c27',
          border: '1px solid rgba(141,35,212,0.60)',
          borderRadius: 16,
          width: '90%',
          maxWidth: 1000,
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.15)',
          background: '#0e0c27',
        }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
            📄 CV / Resume
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {blobUrl && (
              <a
                href={blobUrl}
                download="cv.pdf"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'linear-gradient(135deg,#B556D7,#8E2FFB,#5D77D4)',
                  color: '#fff', padding: '7px 16px', borderRadius: 8,
                  fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none',
                }}
              >
                <Download size={13} /> Télécharger
              </a>
            )}
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
            <div className="sd-spinner" style={{ width: 40, height: 40, border: '3px solid rgba(141,35,212,0.3)', borderTopColor: '#8d23d4', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#fff' }}>Chargement du PDF...</p>
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#f87171' }}>
              <FileText size={48} className="mx-auto mb-3 opacity-50" />
              <p>{error}</p>
              <button 
                onClick={() => window.open(url, '_blank')}
                style={{ marginTop: 16, padding: '8px 16px', background: '#8d23d4', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer' }}
              >
                Ouvrir dans un nouvel onglet
              </button>
            </div>
          </div>
        ) : blobUrl ? (
          <iframe
            src={blobUrl}
            title="CV PDF"
            style={{ flex: 1, border: 'none', width: '100%', background: '#fff' }}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#fff' }}>Impossible de charger le PDF.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyCV() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // CV personnel
  const [personalCV, setPersonalCV] = useState(null);
  const [cvHistory, setCvHistory] = useState([]);
  const [applicationCVs, setApplicationCVs] = useState([]);
  
  const [selectedFile, setSelectedFile] = useState(null);
  
  // États pour le modal CV
  const [showCVModal, setShowCVModal] = useState(false);
  const [currentCVUrl, setCurrentCVUrl] = useState(null);
  const [currentCVType, setCurrentCVType] = useState(null);
  const [currentCVData, setCurrentCVData] = useState(null);

  // 🔥 Fonction pour construire l'URL correcte pour les CVs
  const buildFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/api/')) return `http://localhost:8000${url}`;
    if (url.startsWith('/student/')) return `http://localhost:8000/api${url}`;
    return `http://localhost:8000/api/${url}`;
  };

  // 🔥 Récupérer le CV actuel depuis le backend
  const fetchCurrentCV = async () => {
    try {
      console.log('📡 Fetching current CV...');
      const res = await fetch(`${API}/student/cv/`, { headers: authHeaders() });
      const data = await res.json();
      console.log('📥 Current CV response:', data);
      
      if (data.success && data.cv) {
        // Construire l'URL correcte pour le téléchargement
        const downloadUrl = `${API}/student/cv/download/`;
        setPersonalCV({
          ...data.cv,
          url: downloadUrl,
          download_url: downloadUrl
        });
      } else {
        setPersonalCV(null);
      }
    } catch (err) {
      console.error('❌ Error fetching current CV:', err);
      setPersonalCV(null);
    }
  };

  // 🔥 Récupérer l'historique des CVs
  const fetchCVHistory = async () => {
    try {
      console.log('📡 Fetching CV history...');
      const res = await fetch(`${API}/student/cv/`, { headers: authHeaders() });
      const data = await res.json();
      console.log('📥 CV history response:', data);
      
      if (data.success && data.history) {
        const historyWithUrls = data.history.map(cv => ({
          ...cv,
          url: `${API}/student/cv/download/${cv.id}/`
        }));
        setCvHistory(historyWithUrls);
      } else {
        setCvHistory([]);
      }
    } catch (err) {
      console.error('❌ Error fetching CV history:', err);
      setCvHistory([]);
    }
  };

  // 🔥 Récupérer les CVs des candidatures
  const fetchApplicationCVs = async () => {
    try {
      console.log('📡 Fetching applications...');
      const res = await fetch(`${API}/student/applications/`, { headers: authHeaders() });
      const data = await res.json();
      console.log('📥 Applications response:', data);
      
      if (data.success && data.applications) {
        const appsWithCV = data.applications.filter(app => app.cv_file_url);
        setApplicationCVs(appsWithCV);
      } else {
        setApplicationCVs([]);
      }
    } catch (err) {
      console.error('❌ Error fetching applications:', err);
      setApplicationCVs([]);
    }
  };

  // جلب جميع البيانات
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCurrentCV(),
        fetchCVHistory(),
        fetchApplicationCVs()
      ]);
    } catch (err) {
      console.error('❌ Erreur:', err);
      toast.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 🔥 Aperçu du CV (ouvre le modal)
  const handlePreview = (url, type, data) => {
    console.log('🔍 Preview URL:', url);
    const fullUrl = buildFullUrl(url);
    setCurrentCVUrl(fullUrl);
    setCurrentCVType(type);
    setCurrentCVData(data);
    setShowCVModal(true);
  };

  // 🔥 Téléchargement du CV
  const handleDownload = async (url, filename) => {
    if (!url) {
      toast.error('URL du CV non trouvée');
      return;
    }
    
    try {
      const accessToken = localStorage.getItem('access_token');
      let fullUrl = url;
      
      if (url && !url.startsWith('http')) {
        if (url.startsWith('/api/')) {
          fullUrl = `http://localhost:8000${url}`;
        } else if (url.startsWith('/student/')) {
          fullUrl = `http://localhost:8000/api${url}`;
        } else {
          fullUrl = `http://localhost:8000/api/${url}`;
        }
      }
      
      console.log('📥 Downloading from:', fullUrl);
      
      const res = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename || 'cv.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success('Téléchargement démarré');
    } catch (err) {
      console.error('❌ Download error:', err);
      toast.error('Erreur lors du téléchargement');
    }
  };

  // اختيار ملف للرفع
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Seuls les fichiers PDF sont acceptés');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Le fichier ne doit pas dépasser 5 Mo');
      return;
    }

    setSelectedFile(file);
    toast.success(`Fichier sélectionné: ${file.name}`);
  };

  // 🔥 رفع CV nouveau
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('cv_file', selectedFile);

    try {
      console.log('📤 Uploading file:', selectedFile.name);
      const res = await fetch(`${API}/student/cv/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token()}`
        },
        body: formData
      });

      const data = await res.json();
      console.log('📥 Upload response:', data);
      
      if (data.success) {
        toast.success('CV téléchargé avec succès');
        setSelectedFile(null);
        const fileInput = document.getElementById('cv-file-input');
        if (fileInput) fileInput.value = '';
        await fetchAllData();
      } else {
        toast.error(data.error || 'Erreur lors du téléchargement');
      }
    } catch (err) {
      console.error('❌ Erreur upload:', err);
      toast.error('Erreur de connexion');
    } finally {
      setUploading(false);
    }
  };

  // حذف CV الشخصي
  const handleDeletePersonal = async () => {
    if (!personalCV) {
      toast.error('Aucun CV à supprimer');
      return;
    }
    
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer votre CV personnel ? Cette action est irréversible.')) {
      return;
    }

    setDeleting(true);
    try {
      console.log('🗑️ Deleting CV...');
      const res = await fetch(`${API}/student/cv/delete/`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      const data = await res.json();
      console.log('📥 Delete response:', data);
      
      if (data.success) {
        toast.success('CV personnel supprimé avec succès');
        await fetchAllData();
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      console.error('❌ Erreur delete:', err);
      toast.error('Erreur de connexion');
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <>
      {sidebarOpen && (
        <StudentSidebar
          user={user}
          onLogout={handleLogout}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <div className="mycv-page">
        <nav className="mycv-navbar">
          <div className="mycv-navbar-left">
            <button className="mycv-hamburger" onClick={() => setSidebarOpen(true)}>
              <span /><span /><span />
            </button>
            <a className="mycv-logo" href="/">UnivStage</a>
          </div>
        </nav>

        <div className="mycv-container">
          {/* Header */}
          <div className="mycv-header">
            <div className="mycv-header-content">
              <FileText size={28} className="text-purple-400" />
              <div>
                <h1>Gestion des CVs</h1>
                <p>Consultez et gérez vos curriculum vitae</p>
              </div>
            </div>
          </div>

          {/* Deux colonnes */}
          <div className="mycv-two-columns">
            
            {/* ========== COLONNE DE GAUCHE ========== */}
            <div className="mycv-left-column">
              
              {/* 🔥 Carte - Mon CV actuel */}
              <div className="mycv-card">
                <div className="mycv-card-header">
                  <User size={20} />
                  <h2>Mon CV actuel</h2>
                </div>
                
                {personalCV ? (
                  <div className="mycv-current-info">
                    <div className="mycv-file-info">
                      <div className="mycv-file-icon">
                        <FileText size={32} />
                      </div>
                      <div className="mycv-file-details">
                        <p className="mycv-filename">{personalCV.filename || 'CV.pdf'}</p>
                        <p className="mycv-filesize">
                          {formatFileSize(personalCV.size)} • {formatDate(personalCV.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mycv-current-actions">
                      <button 
                        onClick={() => handlePreview(personalCV.url, 'personal', personalCV)}
                        className="mycv-btn mycv-btn-primary"
                      >
                        <Eye size={16} />
                        Aperçu
                      </button>
                      <button 
                        onClick={() => handleDownload(personalCV.url, personalCV.filename || 'cv.pdf')}
                        className="mycv-btn mycv-btn-primary"
                      >
                        <Download size={16} />
                        Télécharger
                      </button>
                      <button 
                        onClick={handleDeletePersonal}
                        disabled={deleting}
                        className="mycv-btn mycv-btn-danger"
                      >
                        {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mycv-empty">
                    <FileText size={48} className="opacity-30" />
                    <p>Aucun CV téléchargé</p>
                    <p className="text-sm">Téléchargez votre CV ci-dessous</p>
                  </div>
                )}
              </div>

              {/* 🔥 Carte - Télécharger un nouveau CV */}
              <div className="mycv-card">
                <div className="mycv-card-header">
                  <Upload size={20} />
                  <h2>Nouveau CV</h2>
                </div>
                
                <div className="mycv-upload-area">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="mycv-file-input"
                    id="cv-file-input"
                  />
                  <label htmlFor="cv-file-input" className="mycv-upload-label">
                    <Upload size={24} />
                    <span>Cliquez pour sélectionner un fichier PDF</span>
                    <span className="text-xs">PDF uniquement, max 5 Mo</span>
                  </label>
                  
                  {selectedFile && (
                    <div className="mycv-selected-file">
                      <FileText size={20} />
                      <span>{selectedFile.name}</span>
                      <button 
                        onClick={() => setSelectedFile(null)} 
                        className="mycv-remove-file"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="mycv-btn mycv-btn-success mycv-btn-full"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Téléchargement...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        {personalCV ? 'Mettre à jour mon CV' : 'Télécharger mon CV'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 🔥 Carte - Historique */}
              {cvHistory.length > 0 && (
                <div className="mycv-card">
                  <div className="mycv-card-header">
                    <Clock size={20} />
                    <h2>Historique des CVs</h2>
                  </div>
                  
                  <div className="mycv-history-list">
                    {cvHistory.map((cv, index) => (
                      <div key={cv.id || index} className="mycv-history-item">
                        <div className="mycv-history-icon">
                          <FileText size={20} />
                        </div>
                        <div className="mycv-history-info">
                          <p className="mycv-history-filename">{cv.filename}</p>
                          <p className="mycv-history-date">
                            {formatDate(cv.uploaded_at)}
                          </p>
                        </div>
                        <div className="mycv-history-actions">
                          <button 
                            onClick={() => handlePreview(cv.url, 'history', cv)}
                            className="mycv-history-btn"
                            title="Aperçu"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleDownload(cv.url, cv.filename)}
                            className="mycv-history-btn"
                            title="Télécharger"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ========== COLONNE DE DROITE ========== */}
            <div className="mycv-right-column">
              <div className="mycv-card">
                <div className="mycv-card-header">
                  <Briefcase size={20} />
                  <h2>CVs des candidatures</h2>
                </div>
                
                {applicationCVs.length === 0 ? (
                  <div className="mycv-empty">
                    <Briefcase size={48} className="opacity-30" />
                    <p>Aucun CV trouvé</p>
                    <p className="text-sm">Les CVs de vos candidatures apparaîtront ici</p>
                  </div>
                ) : (
                  <div className="mycv-applications-list">
                    {applicationCVs.map((app) => (
                      <div key={app.id} className="mycv-application-item">
                        <div className="mycv-application-icon">
                          <Briefcase size={20} />
                        </div>
                        <div className="mycv-application-info">
                          <p className="mycv-application-title">{app.offer_title}</p>
                          <p className="mycv-application-date">
                            Envoyé le {formatDate(app.applied_at)}
                          </p>
                          <p className="mycv-application-status">
                            Statut: {app.status === 'accepted_by_company' ? '✅ Accepté' : 
                                      app.status === 'rejected_by_company' ? '❌ Refusé' :
                                      app.status === 'validated_by_co_dept' ? '✓ Validé' : '⏳ En attente'}
                          </p>
                        </div>
                        <div className="mycv-application-actions">
                          <button 
                            onClick={() => handlePreview(app.cv_file_url, 'application', app)}
                            className="mycv-app-btn"
                            title="Aperçu"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleDownload(app.cv_file_url, `CV_${app.offer_title}.pdf`)}
                            className="mycv-app-btn"
                            title="Télécharger"
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal CV Viewer */}
      {showCVModal && currentCVUrl && (
        <CVViewer 
          url={currentCVUrl} 
          onClose={() => {
            setShowCVModal(false);
            setCurrentCVUrl(null);
            setCurrentCVType(null);
            setCurrentCVData(null);
          }} 
        />
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
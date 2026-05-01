// frontend/src/page/MyCV.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FileText, Download, Upload, Eye, Trash2, Loader2, 
  X, Clock, Briefcase, User, ExternalLink, Search,
  LogOut, ArrowLeft, GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
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
  
  // États pour la photo de profil
  const [profilePicture, setProfilePicture] = useState(null);
  const [profile, setProfile] = useState(null);

  // Récupérer la photo de profil
  const fetchProfilePicture = async () => {
    try {
      const res = await fetch(`${API}/student/profile/me/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        if (data.profile.profile_picture) {
          let imgUrl = data.profile.profile_picture;
          if (imgUrl && !imgUrl.startsWith('http')) {
            imgUrl = `http://localhost:8000${imgUrl}`;
          }
          setProfilePicture(imgUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching profile picture:', err);
    }
  };

  const buildFullUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('/api/')) return `http://localhost:8000${url}`;
    if (url.startsWith('/student/')) return `http://localhost:8000/api${url}`;
    return `http://localhost:8000/api/${url}`;
  };

  const fetchCurrentCV = async () => {
    try {
      const res = await fetch(`${API}/student/cv/`, { headers: authHeaders() });
      const data = await res.json();
      
      if (data.success && data.cv) {
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

  const fetchCVHistory = async () => {
    try {
      const res = await fetch(`${API}/student/cv/`, { headers: authHeaders() });
      const data = await res.json();
      
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

  const fetchApplicationCVs = async () => {
    try {
      const res = await fetch(`${API}/student/applications/`, { headers: authHeaders() });
      const data = await res.json();
      
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

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCurrentCV(),
        fetchCVHistory(),
        fetchApplicationCVs(),
        fetchProfilePicture()
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

  const handlePreview = (url) => {
    const fullUrl = buildFullUrl(url);
    setCurrentCVUrl(fullUrl);
    setShowCVModal(true);
  };

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

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Veuillez sélectionner un fichier');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('cv_file', selectedFile);

    try {
      const res = await fetch(`${API}/student/cv/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token()}`
        },
        body: formData
      });

      const data = await res.json();
      
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
      const res = await fetch(`${API}/student/cv/delete/`, {
        method: 'DELETE',
        headers: authHeaders()
      });

      const data = await res.json();
      
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

  const getUserInitials = () => {
    const name = profile?.full_name || user?.full_name || user?.username || 'U';
    return name.charAt(0).toUpperCase();
  };

  const getUserName = () => {
    return profile?.full_name || user?.full_name || user?.username || 'Student';
  };

  const getUserEmail = () => {
    return profile?.email || user?.email || '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Fixed Sidebar */}
      <div className="w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full fixed left-0 top-0 overflow-y-auto border-r border-purple-500/30">
        {/* Sidebar Header with User Info */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold overflow-hidden">
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt={getUserName()} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{getUserInitials()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">{getUserName()}</p>
              <p className="text-white/50 text-xs truncate">{getUserEmail()}</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search"
              className="w-full bg-white/10 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div>
            <p className="text-xs text-purple-300/60 uppercase tracking-wider px-3 mb-2">Control & Management</p>
            <div className="space-y-1">
              <Link 
                to="/student/profile" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10"
              >
                <User size={16} /> My Profile
              </Link>
              <Link 
                to="/student/cv" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-purple-600/30 text-purple-300 border border-purple-500/30"
              >
                <FileText size={16} /> My CV
              </Link>
              <Link 
                to="/student/applications" 
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10"
              >
                <FileText size={16} /> Application status
              </Link>
            </div>
          </div>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm text-red-300 hover:bg-red-500/20 transition"
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content area - with glassmorphic effect */}
      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Back button */}
          <button
            onClick={() => navigate('/student/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Retour au tableau de bord
          </button>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Gestion des CVs</h1>
            <p className="text-white/60">Consultez et gérez vos curriculum vitae</p>
          </div>

          {/* Two columns layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLONNE DE GAUCHE */}
            <div className="space-y-6">
              
              {/* Carte - Mon CV actuel */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center gap-3">
                  <User size={20} className="text-purple-400" />
                  <h2 className="text-white font-semibold">Mon CV actuel</h2>
                </div>
                
                {personalCV ? (
                  <div className="p-5">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <FileText size={28} className="text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{personalCV.filename || 'CV.pdf'}</p>
                        <p className="text-white/40 text-sm">
                          {formatFileSize(personalCV.size)} • {formatDate(personalCV.uploaded_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-3 flex-wrap">
                      <button 
                        onClick={() => handlePreview(personalCV.url)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition shadow-lg"
                      >
                        <Eye size={16} /> Aperçu
                      </button>
                      <button 
                        onClick={() => handleDownload(personalCV.url, personalCV.filename || 'cv.pdf')}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-semibold transition"
                      >
                        <Download size={16} /> Télécharger
                      </button>
                      <button 
                        onClick={handleDeletePersonal}
                        disabled={deleting}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                      >
                        {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        Supprimer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <FileText size={48} className="mx-auto text-white/30 mb-3" />
                    <p className="text-white/60">Aucun CV téléchargé</p>
                    <p className="text-white/40 text-sm">Téléchargez votre CV ci-dessous</p>
                  </div>
                )}
              </div>

              {/* Carte - Télécharger un nouveau CV */}
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                <div className="p-5 border-b border-white/10 flex items-center gap-3">
                  <Upload size={20} className="text-purple-400" />
                  <h2 className="text-white font-semibold">Nouveau CV</h2>
                </div>
                
                <div className="p-5">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="cv-file-input"
                  />
                  <label 
                    htmlFor="cv-file-input" 
                    className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer transition hover:border-purple-500 hover:bg-purple-500/10"
                  >
                    <Upload size={28} className="text-purple-400" />
                    <span className="text-white/80 text-sm">Cliquez pour sélectionner un fichier PDF</span>
                    <span className="text-white/40 text-xs">PDF uniquement, max 5 Mo</span>
                  </label>
                  
                  {selectedFile && (
                    <div className="flex items-center gap-3 bg-purple-500/15 rounded-lg p-3 mt-4">
                      <FileText size={20} className="text-purple-400" />
                      <span className="flex-1 text-white/80 text-sm truncate">{selectedFile.name}</span>
                      <button 
                        onClick={() => setSelectedFile(null)} 
                        className="p-1 hover:bg-white/10 rounded transition text-white/60"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className="w-full mt-5 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* Carte - Historique */}
              {cvHistory.length > 0 && (
                <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                  <div className="p-5 border-b border-white/10 flex items-center gap-3">
                    <Clock size={20} className="text-purple-400" />
                    <h2 className="text-white font-semibold">Historique des CVs</h2>
                  </div>
                  
                  <div className="divide-y divide-white/10">
                    {cvHistory.map((cv, index) => (
                      <div key={cv.id || index} className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/15 rounded-lg flex items-center justify-center">
                          <FileText size={20} className="text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium truncate">{cv.filename}</p>
                          <p className="text-white/40 text-xs">{formatDate(cv.uploaded_at)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handlePreview(cv.url)}
                            className="p-2 bg-white/10 hover:bg-purple-500/30 rounded-lg transition text-white/60 hover:text-white"
                            title="Aperçu"
                          >
                            <Eye size={16} />
                          </button>
                          <button 
                            onClick={() => handleDownload(cv.url, cv.filename)}
                            className="p-2 bg-white/10 hover:bg-purple-500/30 rounded-lg transition text-white/60 hover:text-white"
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

            {/* COLONNE DE DROITE - CVs des candidatures */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-center gap-3">
                <Briefcase size={20} className="text-purple-400" />
                <h2 className="text-white font-semibold">CVs des candidatures</h2>
              </div>
              
              {applicationCVs.length === 0 ? (
                <div className="p-8 text-center">
                  <Briefcase size={48} className="mx-auto text-white/30 mb-3" />
                  <p className="text-white/60">Aucun CV trouvé</p>
                  <p className="text-white/40 text-sm">Les CVs de vos candidatures apparaîtront ici</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {applicationCVs.map((app) => (
                    <div key={app.id} className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/15 rounded-lg flex items-center justify-center">
                        <Briefcase size={20} className="text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{app.offer_title}</p>
                        <p className="text-white/40 text-xs">Envoyé le {formatDate(app.applied_at)}</p>
                        <p className={`text-xs mt-1 ${
                          app.status === 'accepted_by_company' ? 'text-green-400' :
                          app.status === 'rejected_by_company' ? 'text-red-400' :
                          app.status === 'validated_by_co_dept' ? 'text-blue-400' : 'text-yellow-400'
                        }`}>
                          {app.status === 'accepted_by_company' ? '✅ Accepté' : 
                           app.status === 'rejected_by_company' ? '❌ Refusé' :
                           app.status === 'validated_by_co_dept' ? '✓ Validé' : '⏳ En attente'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handlePreview(app.cv_file_url)}
                          className="p-2 bg-white/10 hover:bg-purple-500/30 rounded-lg transition text-white/60 hover:text-white"
                          title="Aperçu"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleDownload(app.cv_file_url, `CV_${app.offer_title}.pdf`)}
                          className="p-2 bg-white/10 hover:bg-purple-500/30 rounded-lg transition text-white/60 hover:text-white"
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

      {/* Modal CV Viewer */}
      {showCVModal && currentCVUrl && (
        <CVViewer 
          url={currentCVUrl} 
          onClose={() => {
            setShowCVModal(false);
            setCurrentCVUrl(null);
          }} 
        />
      )}

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
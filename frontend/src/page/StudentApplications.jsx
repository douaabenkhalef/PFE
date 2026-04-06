import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, FileText, X, ExternalLink, CheckCircle, 
  XCircle, Clock, AlertCircle, Download, Eye, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import "../page/StudentDashboard.css";

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('access_token');
const authH = () => ({ Authorization: `Bearer ${token()}` });


function StatusBadge({ status }) {
  const statusConfig = {
    'pending': {
      label: 'En attente entreprise',
      icon: <Clock size={12} />,
      color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    },
    'accepted_by_company': {
      label: 'Accepté par entreprise',
      icon: <CheckCircle size={12} />,
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    'rejected_by_company': {
      label: 'Refusé par entreprise',
      icon: <XCircle size={12} />,
      color: 'bg-red-500/20 text-red-300 border-red-500/30'
    },
    'validated_by_co_dept': {
      label: ' Validé - Convention disponible',
      icon: <FileText size={12} />,
      color: 'bg-green-500/20 text-green-300 border-green-500/30'
    },
    'rejected_by_co_dept': {
      label: 'Refusé par l\'université',
      icon: <XCircle size={12} />,
      color: 'bg-red-500/20 text-red-300 border-red-500/30'
    },
    'completed': {
      label: 'Stage terminé',
      icon: <CheckCircle size={12} />,
      color: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    }
  };
  
  const config = statusConfig[status] || {
    label: status,
    icon: <AlertCircle size={12} />,
    color: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// Modal de visualisation du CV
function CVViewer({ url, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch PDF');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setBlobUrl(blobUrl);
      } catch (err) {
        console.error(err);
        setError('Impossible de charger le CV');
      } finally {
        setLoading(false);
      }
    };
    loadPdf();
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
          maxWidth: 800,
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
          position: 'relative',
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
             CV / Resume
          </span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg,#B556D7,#8E2FFB,#5D77D4)',
                color: '#fff', padding: '7px 16px', borderRadius: 8,
                fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none',
              }}
            >
              <ExternalLink size={13} /> Ouvrir dans un nouvel onglet
            </a>
            <button
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="sd-spinner" style={{ width: 40, height: 40 }} />
            <p style={{ color: '#fff', marginLeft: 16 }}>Chargement du PDF...</p>
          </div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#f87171' }}>{error}</p>
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

// Modal de détails de la candidature
function AppDetailModal({ app, onClose, onGenerateConvention }) {
  const [showCV, setShowCV] = useState(false);
  const [downloadingConvention, setDownloadingConvention] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  if (!app) return null;

  const cvUrl = app.cv_file_url
    ? `${API}${app.cv_file_url}`
    : null;

  const conventionUrl = app.convention_url
    ? `${API}${app.convention_url}`
    : null;

  const handleDownloadConvention = async () => {
    if (!conventionUrl) return;
    setDownloadingConvention(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(conventionUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `convention_${app.student_name}_${app.company_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Convention téléchargée avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.error('Erreur lors du téléchargement de la convention');
    } finally {
      setDownloadingConvention(false);
    }
  };

  const handleGenerateConvention = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API}/generate-convention/${app.id}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `convention_${app.student_name}_${app.company_name}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Convention générée avec succès !');
        if (onGenerateConvention) onGenerateConvention();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Erreur lors de la génération de la convention');
      }
    } catch (error) {
      console.error('Erreur:', error);
      toast.error('Erreur de connexion');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusMessage = () => {
    switch (app.status) {
      case 'accepted_by_company':
        return " Votre candidature a été acceptée par l'entreprise. En attente de validation par votre université.";
      case 'validated_by_co_dept':
        return " Félicitations ! Votre convention de stage a été validée par l'université. Vous pouvez la télécharger ci-dessous.";
      case 'rejected_by_co_dept':
        return ` Votre candidature a été refusée par l'université. Motif : ${app.co_dept_notes || 'Non spécifié'}`;
      case 'rejected_by_company':
        return `  Votre candidature a été refusée par l'entreprise. Motif : ${app.company_notes || 'Non spécifié'}`;
      default:
        return null;
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <>
      {showCV && cvUrl && (
        <CVViewer url={cvUrl} onClose={() => setShowCV(false)} />
      )}

      <div className="app-modal-overlay" onClick={onClose}>
        <div className="app-modal" onClick={e => e.stopPropagation()}>
          <button className="app-modal-close" onClick={onClose}><X size={18} /></button>
          
          <h3>{app.offer_title || '—'}</h3>
          <p className="app-modal-sub">
            {app.company_name || '—'}
            {app.applied_at && ` · Candidature envoyée le ${new Date(app.applied_at).toLocaleDateString()}`}
          </p>
          
          <div style={{ marginBottom: 18 }}>
            <StatusBadge status={app.status} />
          </div>

          {statusMessage && (
            <div className={`p-3 rounded-lg mb-4 text-sm ${
              app.status === 'validated_by_co_dept' ? 'bg-green-500/10 border border-green-500/30 text-green-300' :
              app.status === 'accepted_by_company' ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300' :
              'bg-red-500/10 border border-red-500/30 text-red-300'
            }`}>
              {statusMessage}
            </div>
          )}

          <div className="app-modal-grid">
            <div className="app-modal-field">
              <label>Type de stage</label>
              <span>{app.offer_type || '—'}</span>
            </div>
            <div className="app-modal-field">
              <label>Wilaya</label>
              <span>{app.offer_wilaya || '—'}</span>
            </div>
            <div className="app-modal-field">
              <label>Durée</label>
              <span>{app.offer_duration || '—'}</span>
            </div>
            <div className="app-modal-field">
              <label>Date de début</label>
              <span>{app.offer_start_date || '—'}</span>
            </div>
            <div className="app-modal-field">
              <label>Date de candidature</label>
              <span>{app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}</span>
            </div>
            <div className="app-modal-field">
              <label>Réponse entreprise</label>
              <span>{app.company_response_date ? new Date(app.company_response_date).toLocaleDateString() : 'En attente'}</span>
            </div>
          </div>

          {app.cover_letter && (
            <div className="app-modal-letter">
              <label>Lettre de motivation</label>
              <p>{app.cover_letter}</p>
            </div>
          )}

          {cvUrl ? (
            <div style={{ marginBottom: 14 }}>
              <button className="app-modal-cv-btn" onClick={() => setShowCV(true)}>
                <FileText size={15} /> Voir mon CV
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
              Aucun CV attaché à cette candidature.
            </p>
          )}

          {/* Bouton Générer Convention */}
          {app.status === 'accepted_by_company' && (
            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-300 text-sm font-medium mb-3 flex items-center gap-2">
                <FileText size={16} />
                La convention n'a pas encore été générée
              </p>
              <button
                onClick={handleGenerateConvention}
                disabled={generating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={14} />}
                Générer ma convention
              </button>
            </div>
          )}

          {}
          {app.status === 'validated_by_co_dept' && conventionUrl && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-300 text-sm font-medium mb-3 flex items-center gap-2">
                <FileText size={16} />
                Convention de stage disponible
              </p>
              <button
                onClick={handleDownloadConvention}
                disabled={downloadingConvention}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                {downloadingConvention ? <Loader2 size={16} className="animate-spin" /> : <Download size={14} />}
                Télécharger ma convention
              </button>
            </div>
          )}

          {app.status === 'rejected_by_company' && app.company_notes && (
            <div className="app-modal-notes">
              <label>Motif du refus (entreprise)</label>
              <p>{app.company_notes}</p>
            </div>
          )}

          {app.status === 'rejected_by_co_dept' && app.co_dept_notes && (
            <div className="app-modal-notes" style={{ background: 'rgba(248,113,113,0.08)', borderColor: 'rgba(248,113,113,0.25)' }}>
              <label style={{ color: 'rgba(248,113,113,0.70)' }}>Motif du refus (université)</label>
              <p>{app.co_dept_notes}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Composant principal
export default function StudentApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const getStats = () => {
    const stats = {
      all: applications.length,
      pending: 0,
      accepted_by_company: 0,
      validated_by_co_dept: 0,
      rejected: 0
    };
    applications.forEach(app => {
      if (app.status === 'pending') stats.pending++;
      else if (app.status === 'accepted_by_company') stats.accepted_by_company++;
      else if (app.status === 'validated_by_co_dept') stats.validated_by_co_dept++;
      else if (app.status.includes('rejected')) stats.rejected++;
    });
    return stats;
  };

  const stats = getStats();

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/student/applications/`, { headers: authH() });
      const data = await res.json();
      if (data.success) {
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des candidatures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    const interval = setInterval(fetchApplications, 30000);
    return () => clearInterval(interval);
  }, []);

  const getFilteredApplications = () => {
    if (filter === 'all') return applications;
    if (filter === 'pending') return applications.filter(a => a.status === 'pending');
    if (filter === 'accepted_by_company') return applications.filter(a => a.status === 'accepted_by_company');
    if (filter === 'validated_by_co_dept') return applications.filter(a => a.status === 'validated_by_co_dept');
    if (filter === 'rejected') return applications.filter(a => a.status.includes('rejected'));
    return applications;
  };

  const filteredApps = getFilteredApplications();

  return (
    <>
      {selected && <AppDetailModal app={selected} onClose={() => setSelected(null)} onGenerateConvention={fetchApplications} />}
      
      <div style={{ minHeight: '100vh', background: 'transparent', fontFamily: 'Poppins, sans-serif' }}>
        <nav style={{
          background: 'transparent',
          borderBottom: '1px solid rgba(255,255,255,0.55)',
          padding: '0 4%',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}>
          <button 
            onClick={() => navigate('/student/dashboard')} 
            style={{
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.88rem', fontFamily: 'Poppins, sans-serif',
            }}
          >
            <ArrowLeft size={18} /> Retour au tableau de bord
          </button>
          <span style={{ color: 'rgba(255,255,255,0.30)' }}>|</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Mes candidatures</span>
        </nav>

        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 5%' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Mes candidatures</h1>
          <p style={{ color: 'rgba(255,255,255,0.50)', marginBottom: 24 }}>
            Suivez l'état de vos candidatures aux offres de stage
          </p>

          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Toutes ({stats.all})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              En attente ({stats.pending})
            </button>
            <button
              onClick={() => setFilter('accepted_by_company')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'accepted_by_company' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Acceptées entreprise ({stats.accepted_by_company})
            </button>
            <button
              onClick={() => setFilter('validated_by_co_dept')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'validated_by_co_dept' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Validées ({stats.validated_by_co_dept})
            </button>
            <button
              onClick={() => setFilter('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Refusées ({stats.rejected})
            </button>
          </div>

          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <p>Chargement de vos candidatures...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.04)', 
              border: '1px solid rgba(141,35,212,0.25)',
              borderRadius: 18, 
              padding: '60px 20px', 
              textAlign: 'center',
            }}>
              <FileText size={48} style={{ color: 'rgba(247,90,250,0.30)', margin: '0 auto 14px' }} />
              <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>
                {filter === 'all' ? "Vous n'avez pas encore postulé à des stages." : "Aucune candidature dans cette catégorie."}
              </p>
              <button 
                onClick={() => navigate('/student/dashboard')} 
                className="app-modal-cv-btn"
                style={{ background: 'linear-gradient(135deg,#B556D7,#8E2FFB,#5D77D4)' }}
              >
                Parcourir les offres
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead>
                  <tr>
                    {['Offre', 'Entreprise', 'Type', 'Date candidature', 'Statut', 'Action'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '10px 16px', fontSize: '0.70rem',
                        fontWeight: 700, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map(app => (
                    <tr 
                      key={app.id} 
                      style={{
                        background: 'rgba(255,255,255,0.04)', borderRadius: 12, transition: 'background 0.2s',
                      }} 
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(141,35,212,0.12)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    >
                      <td style={{ padding: '14px 16px', color: '#fff', fontWeight: 600, fontSize: '0.85rem', borderRadius: '12px 0 0 12px' }}>
                        {app.offer_title || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.65)', fontSize: '0.82rem' }}>
                        {app.company_name || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
                        {app.offer_type || '—'}
                      </td>
                      <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem' }}>
                        {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <StatusBadge status={app.status} />
                      </td>
                      <td style={{ padding: '14px 16px', borderRadius: '0 12px 12px 0' }}>
                        <button 
                          onClick={() => setSelected(app)} 
                          style={{
                            background: 'linear-gradient(135deg,#B556D7,#8E2FFB,#5D77D4)', color: '#fff',
                            border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: '0.75rem',
                            fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', transition: 'opacity 0.2s',
                            display: 'inline-flex', alignItems: 'center', gap: '6px'
                          }} 
                          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                          <Eye size={14} /> Détails
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {applications.length > 0 && (
            <div style={{
              marginTop: 32,
              padding: 16,
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.50)', marginBottom: 8 }}>
                 <strong>Comprendre les statuts :</strong>
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: '0.7rem' }}>
                <div className="flex items-center gap-1"><StatusBadge status="pending" /> <span style={{ color: 'rgba(255,255,255,0.60)' }}>En attente de réponse entreprise</span></div>
                <div className="flex items-center gap-1"><StatusBadge status="accepted_by_company" /> <span style={{ color: 'rgba(255,255,255,0.60)' }}>Accepté, en attente validation université</span></div>
                <div className="flex items-center gap-1"><StatusBadge status="validated_by_co_dept" /> <span style={{ color: 'rgba(255,255,255,0.60)' }}>Validé, convention disponible</span></div>
                <div className="flex items-center gap-1"><StatusBadge status="rejected_by_company" /> <span style={{ color: 'rgba(255,255,255,0.60)' }}>Refusé par l'entreprise</span></div>
                <div className="flex items-center gap-1"><StatusBadge status="rejected_by_co_dept" /> <span style={{ color: 'rgba(255,255,255,0.60)' }}>Refusé par l'université</span></div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
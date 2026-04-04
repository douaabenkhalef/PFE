import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, X, ExternalLink } from 'lucide-react';
import "../page/StudentDashboard.css";

const API = 'http://localhost:8000/api';
const token = () => localStorage.getItem('access_token');
const authH = () => ({ Authorization: `Bearer ${token()}` });

function StatusBadge({ status }) {
  return (
    <span className={`app-status-badge ${status}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// CV Viewer avec z-index élevé et fond opaque
function CVViewer({ url, onClose }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);

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
      className="app-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 9999, background: 'rgba(0,0,0,0.85)' }}
    >
      <div
        style={{
          background: '#0e0c27',
          border: '1px solid rgba(141,35,212,0.60)',
          borderRadius: 16,
          width: '90%',
          maxWidth: 780,
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
          position: 'relative',
          zIndex: 10000,
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
              <ExternalLink size={13} /> Open in new tab
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
            <p style={{ color: '#fff' }}>Loading PDF...</p>
          </div>
        ) : blobUrl ? (
          <iframe
            src={blobUrl}
            title="CV PDF"
            style={{ flex: 1, border: 'none', width: '100%', background: '#fff' }}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: '#fff' }}>Failed to load PDF.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AppDetailModal({ app, onClose }) {
  const [showCV, setShowCV] = useState(false);
  if (!app) return null;

  const cvUrl = app.cv_file_url
    ? `${API}${app.cv_file_url}`
    : null;

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
            {app.applied_at && ` · Applied ${new Date(app.applied_at).toLocaleDateString()}`}
          </p>
          <div style={{ marginBottom: 18 }}>
            <StatusBadge status={app.status} />
          </div>
          <div className="app-modal-grid">
            <div className="app-modal-field"><label>Type</label><span>{app.offer_type || '—'}</span></div>
            <div className="app-modal-field"><label>Wilaya</label><span>{app.offer_wilaya || '—'}</span></div>
            <div className="app-modal-field"><label>Duration</label><span>{app.offer_duration || '—'}</span></div>
            <div className="app-modal-field"><label>Applied at</label><span>{app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}</span></div>
          </div>
          {app.cover_letter && (
            <div className="app-modal-letter"><label>Cover Letter</label><p>{app.cover_letter}</p></div>
          )}
          {cvUrl ? (
            <div style={{ marginBottom: 14 }}>
              <button className="app-modal-cv-btn" onClick={() => setShowCV(true)}>
                <FileText size={15} /> View CV (PDF)
              </button>
            </div>
          ) : (
            <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
              No CV attached to this application.
            </p>
          )}
          {app.company_notes && (
            <div className="app-modal-notes"><label>Company Response</label><p>{app.company_notes}</p></div>
          )}
        </div>
      </div>
    </>
  );
}

export default function StudentApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API}/student/applications/`, { headers: authH() });
        const data = await res.json();
        if (data.success) setApplications(data.applications || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      {selected && <AppDetailModal app={selected} onClose={() => setSelected(null)} />}
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
          <button onClick={() => navigate('/student/dashboard')} style={{
            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.88rem', fontFamily: 'Poppins, sans-serif',
          }}>
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
          <span style={{ color: 'rgba(255,255,255,0.30)' }}>|</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>My Applications</span>
        </nav>
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 5%' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: 24 }}>My Applications</h1>
          {loading ? (
            <div className="sd-loading"><div className="sd-spinner" /><p>Loading applications…</p></div>
          ) : applications.length === 0 ? (
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(141,35,212,0.25)',
              borderRadius: 18, padding: '60px 20px', textAlign: 'center',
            }}>
              <FileText size={48} style={{ color: 'rgba(247,90,250,0.30)', margin: '0 auto 14px' }} />
              <p style={{ color: 'rgba(255,255,255,0.45)', marginBottom: 20 }}>You have not applied to any internships yet.</p>
              <button onClick={() => navigate('/student/dashboard')} className="app-modal-cv-btn">Browse Internships</button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead>
                  <tr>
                    {['Offer', 'Company', 'Type', 'Applied At', 'Status', 'Action'].map(h => (
                      <th key={h} style={{
                        textAlign: 'left', padding: '10px 16px', fontSize: '0.70rem',
                        fontWeight: 700, color: 'rgba(255,255,255,0.40)', textTransform: 'uppercase', letterSpacing: '0.5px',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.map(app => (
                    <tr key={app.id} style={{
                      background: 'rgba(255,255,255,0.04)', borderRadius: 12, transition: 'background 0.2s',
                    }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(141,35,212,0.12)'}
                       onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
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
                      <td style={{ padding: '14px 16px' }}><StatusBadge status={app.status} /></td>
                      <td style={{ padding: '14px 16px', borderRadius: '0 12px 12px 0' }}>
                        <button onClick={() => setSelected(app)} style={{
                          background: 'linear-gradient(135deg,#B556D7,#8E2FFB,#5D77D4)', color: '#fff',
                          border: 'none', padding: '7px 16px', borderRadius: 8, fontSize: '0.75rem',
                          fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', transition: 'opacity 0.2s',
                        }} onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                           onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
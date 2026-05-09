// frontend/src/page/StudentApplications.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, FileText, X, ExternalLink, CheckCircle, 
  XCircle, Clock, AlertCircle, Download, Eye, Loader2,
  Search, LogOut, User, ClipboardList
} from 'lucide-react';
import toast from 'react-hot-toast';
import "./StudentDashboard.css";
import "./StudentApplications.css";

const API = 'https://pfe-l31r.onrender.com/api';
const token = () => localStorage.getItem('access_token');
const authH = () => ({ Authorization: `Bearer ${token()}` });
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token()}`
});

function StatusBadge({ status }) {
  const statusConfig = {
    'pending': {
      label: 'Awaiting company',
      icon: <Clock size={12} />,
      color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    },
    'accepted_by_company': {
      label: 'Accepted by company',
      icon: <CheckCircle size={12} />,
      color: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    },
    'rejected_by_company': {
      label: 'Rejected by company',
      icon: <XCircle size={12} />,
      color: 'bg-red-500/20 text-red-300 border-red-500/30'
    },
    'validated_by_co_dept': {
      label: 'Validated - Convention available',
      icon: <FileText size={12} />,
      color: 'bg-green-500/20 text-green-300 border-green-500/30'
    },
    'rejected_by_co_dept': {
      label: 'Rejected by university',
      icon: <XCircle size={12} />,
      color: 'bg-red-500/20 text-red-300 border-red-500/30'
    },
    'completed': {
      label: 'Internship completed',
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

// ✅ CVViewer component - downloads PDF and opens in new tab
function CVViewer({ applicationId, onClose }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndOpenCV = async () => {
      try {
        const accessToken = localStorage.getItem('access_token');
        
        if (!accessToken) {
          toast.error('Session expired. Please log in again.');
          setError(true);
          setLoading(false);
          return;
        }
        
        const response = await fetch(`${API}/student/application/${applicationId}/cv/`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          toast.error('Session expired. Please log in again.');
          window.location.href = '/login';
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Open in new tab
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head>
                <title>My CV</title>
                <style>
                  body { margin: 0; padding: 0; }
                  embed, object, iframe { width: 100%; height: 100vh; border: none; }
                </style>
              </head>
              <body>
                <embed src="${blobUrl}" type="application/pdf" width="100%" height="100%" />
              </body>
            </html>
          `);
          newWindow.document.title = 'My CV';
        }
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        setLoading(false);
        onClose();
      } catch (err) {
        console.error('Error loading CV:', err);
        setError(true);
        setLoading(false);
      }
    };
    
    fetchAndOpenCV();
  }, [applicationId, onClose]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]" onClick={onClose}>
        <div className="bg-[#0e0c27] rounded-2xl p-8 flex flex-col items-center" onClick={e => e.stopPropagation()}>
          <Loader2 size={40} className="animate-spin text-purple-400 mb-4" />
          <p className="text-white/70">Loading CV...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[10000]" onClick={onClose}>
        <div className="bg-[#0e0c27] rounded-2xl p-8 max-w-md text-center" onClick={e => e.stopPropagation()}>
          <FileText size={48} className="mx-auto mb-4 text-red-400 opacity-50" />
          <h3 className="text-white font-semibold text-lg mb-2">Unable to load CV</h3>
          <p className="text-white/60 text-sm mb-4">The file could not be loaded or your session has expired.</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// AppDetailModal with correct CV viewer
function AppDetailModal({ app, onClose, onGenerateConvention }) {
  const [showCV, setShowCV] = useState(false);
  const [downloadingConvention, setDownloadingConvention] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  if (!app) return null;

  const conventionUrl = app.convention_url ? 
    `https://pfe-l31r.onrender.com/api/co-dept/download-convention/${app.id}/` : null;

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
      a.download = `convention_${app.student_name || 'internship'}_${app.company_name || 'company'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Convention downloaded successfully');
    } catch (error) {
      console.error('Error during download:', error);
      toast.error('Error downloading convention');
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
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `convention_${app.student_name || 'internship'}_${app.company_name || 'company'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Convention generated successfully!');
        if (onGenerateConvention) onGenerateConvention();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Error generating convention');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Connection error');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusMessage = () => {
    switch (app.status) {
      case 'accepted_by_company':
        return "✅ Your application has been accepted by the company. Waiting for university validation.";
      case 'validated_by_co_dept':
        return "🎉 Congratulations! Your internship agreement has been validated by the university. You can download it below.";
      case 'rejected_by_co_dept':
        return `❌ Your application has been rejected by the university. Reason: ${app.co_dept_notes || 'Not specified'}`;
      case 'rejected_by_company':
        return `❌ Your application has been rejected by the company. Reason: ${app.company_notes || 'Not specified'}`;
      default:
        return null;
    }
  };

  const statusMessage = getStatusMessage();

  const handleViewCV = () => {
    setShowCV(true);
  };

  return (
    <>
      {showCV && (
        <CVViewer 
          applicationId={app.id} 
          onClose={() => setShowCV(false)} 
        />
      )}

      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" onClick={onClose}>
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-[#1e293b] border-b border-slate-700 p-5 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">{app.offer_title || '—'}</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 space-y-5">
            <p className="text-purple-400">
              {app.company_name || '—'}
              {app.applied_at && ` · Application sent on ${new Date(app.applied_at).toLocaleDateString()}`}
            </p>
            
            <div>
              <StatusBadge status={app.status} />
            </div>

            {statusMessage && (
              <div className={`p-3 rounded-lg text-sm ${
                app.status === 'validated_by_co_dept' ? 'bg-green-500/10 border border-green-500/30 text-green-300' :
                app.status === 'accepted_by_company' ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300' :
                'bg-red-500/10 border border-red-500/30 text-red-300'
              }`}>
                {statusMessage}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider">Internship type</label>
                <p className="text-white">{app.offer_type || '—'}</p>
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider">Wilaya</label>
                <p className="text-white">{app.offer_wilaya || '—'}</p>
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider">Duration</label>
                <p className="text-white">{app.offer_duration || '—'}</p>
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider">Start date</label>
                <p className="text-white">{app.offer_start_date || '—'}</p>
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider">Application date</label>
                <p className="text-white">{app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider">Company response</label>
                <p className="text-white">{app.company_response_date ? new Date(app.company_response_date).toLocaleDateString() : 'Pending'}</p>
              </div>
            </div>

            {app.cover_letter && (
              <div>
                <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">Cover letter</label>
                <p className="text-white/80 text-sm bg-white/5 p-3 rounded-lg">{app.cover_letter}</p>
              </div>
            )}

            <button 
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition"
              onClick={handleViewCV}
            >
              <Eye size={15} /> View my CV
            </button>

            {app.status === 'accepted_by_company' && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  Convention has not yet been generated
                </p>
                <button
                  onClick={handleGenerateConvention}
                  disabled={generating}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={14} />}
                  Generate my convention
                </button>
              </div>
            )}

            {app.status === 'validated_by_co_dept' && conventionUrl && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-green-300 text-sm font-medium mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  Internship agreement available
                </p>
                <button
                  onClick={handleDownloadConvention}
                  disabled={downloadingConvention}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  {downloadingConvention ? <Loader2 size={16} className="animate-spin" /> : <Download size={14} />}
                  Download my convention
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Main component
export default function StudentApplications() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  
  const [profilePicture, setProfilePicture] = useState(null);
  const [profile, setProfile] = useState(null);

  const fetchProfilePicture = async () => {
    try {
      const res = await fetch(`${API}/student/profile/me/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        if (data.profile.profile_picture) {
          let imgUrl = data.profile.profile_picture;
          if (imgUrl && !imgUrl.startsWith('http')) {
            imgUrl = `https://pfe-l31r.onrender.com${imgUrl}`;
          }
          setProfilePicture(imgUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching profile picture:', err);
    }
  };

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
        console.log("📋 Applications data:", data.applications);
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error loading applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchProfilePicture();
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {selected && <AppDetailModal app={selected} onClose={() => setSelected(null)} onGenerateConvention={fetchApplications} />}
      
      <div className="min-h-screen flex">
        <div className="w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full fixed left-0 top-0 overflow-y-auto border-r border-purple-500/30">
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
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10"
                >
                  <FileText size={16} /> My CV
                </Link>
                <Link 
                  to="/student/applications" 
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-purple-600/30 text-purple-300 border border-purple-500/30"
                >
                  <ClipboardList size={16} /> Application status
                </Link>
              </div>
            </div>
          </nav>

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

        <div className="ml-64 flex-1 min-h-screen">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">My Applications</h1>
              <p className="text-white/60">Track the status of your internship applications</p>
            </div>

            <div className="flex gap-2 mb-6 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'all' ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                All ({stats.all})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setFilter('accepted_by_company')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'accepted_by_company' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Accepted ({stats.accepted_by_company})
              </button>
              <button
                onClick={() => setFilter('validated_by_co_dept')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'validated_by_co_dept' ? 'bg-green-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Validated ({stats.validated_by_co_dept})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                Rejected ({stats.rejected})
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-12 text-center">
                <FileText size={48} className="mx-auto text-white/30 mb-4" />
                <p className="text-white/60 mb-4">
                  {filter === 'all' ? "You haven't applied for any internships yet." : "No applications in this category."}
                </p>
                <button 
                  onClick={() => navigate('/student/dashboard')} 
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-semibold transition"
                >
                  Browse offers
                </button>
              </div>
            ) : (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Offer</th>
                        <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Company</th>
                        <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Type</th>
                        <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Application date</th>
                        <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Status</th>
                        <th className="text-left p-4 text-white/40 text-xs font-semibold uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApps.map(app => (
                        <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="p-4 text-white font-medium text-sm">{app.offer_title || '—'}</td>
                          <td className="p-4 text-white/70 text-sm">{app.company_name || '—'}</td>
                          <td className="p-4 text-white/50 text-sm">{app.offer_type || '—'}</td>
                          <td className="p-4 text-white/50 text-sm">
                            {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="p-4">
                            <StatusBadge status={app.status} />
                          </td>
                          <td className="p-4">
                            <button 
                              onClick={() => setSelected(app)} 
                              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition"
                            >
                              <Eye size={14} /> Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
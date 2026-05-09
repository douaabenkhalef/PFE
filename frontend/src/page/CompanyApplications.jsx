import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  Eye, CheckCircle, XCircle, Clock,
  User, Mail, MapPin, BookOpen, Award, Code, Github,
  Globe, FileText, Loader2, AlertCircle, CheckCircle2, X,
  Download, Building2, Calendar, ArrowLeft,
  Search, Briefcase, UserCog, Activity, LogOut, Moon, Sun
} from 'lucide-react';
import toast from 'react-hot-toast';
import './StudentDashboard.css';
import UserAvatar from '../components/UserAvatar';

const API = 'https://pfe-l31r.onrender.com/api';
const auth = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
});
const authJson = () => ({
  ...auth(),
  'Content-Type': 'application/json',
});

// Moon and Sun icons for theme toggle
const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

function Msg({ msg, onClose }) {
  if (!msg) return null;
  const ok = msg.type === 'success';
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border mb-5 text-sm ${
      ok ? 'bg-green-500/10 border-green-500/40 text-green-300'
         : 'bg-red-500/10 border-red-500/40 text-red-300'
    }`}>
      {ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
           : <AlertCircle  size={17} className="mt-0.5 shrink-0" />}
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100"><X size={15} /></button>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    accepted_by_company:  'bg-blue-500/20  text-blue-300  border-blue-500/30',
    rejected_by_company:  'bg-red-500/20    text-red-300    border-red-500/30',
    validated_by_co_dept: 'bg-green-500/20   text-green-300   border-green-500/30',
    rejected_by_co_dept: 'bg-red-500/20 text-red-300 border-red-500/30',
    completed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };
  const labels = {
    pending: 'Pending',
    accepted_by_company: 'Accepted (pending validation)',
    rejected_by_company: 'Rejected',
    validated_by_co_dept: 'Validated',
    rejected_by_co_dept: 'Rejected by university',
    completed: 'Completed',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status] || 'bg-slate-500/20 text-slate-300'}`}>
      {labels[status] || status}
    </span>
  );
}

function ApplicationModal({ app, onClose, onAccept, onReject, onGenerateConvention }) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [cvBlobUrl, setCvBlobUrl] = useState(null);
  const [loadingCv, setLoadingCv] = useState(false);
  const [conventionUrl, setConventionUrl] = useState(null);

  if (!app) return null;

  const alreadyResponded = app.status !== 'pending' && app.status !== 'accepted_by_company';

  useEffect(() => {
    if (app.convention_pdf_url) {
      setConventionUrl(app.convention_pdf_url);
    }
    return () => {
      if (cvBlobUrl) URL.revokeObjectURL(cvBlobUrl);
    };
  }, [cvBlobUrl, app.convention_pdf_url]);

  const loadPdf = async (url) => {
    setLoadingCv(true);
    try {
      const token = localStorage.getItem('access_token');
      const fullUrl = `https://pfe-l31r.onrender.com/api/co-dept/application/${app.id}/cv/`;
      const res = await fetch(fullUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch PDF');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setCvBlobUrl(blobUrl);
    } catch (err) {
      console.error(err);
      toast.error('Error loading CV');
      setCvBlobUrl(null);
    } finally {
      setLoadingCv(false);
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    await onAccept(app.id);
    setSubmitting(false);
    setShowAcceptConfirm(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please enter a rejection reason');
      return;
    }
    setSubmitting(true);
    await onReject(app.id, rejectReason.trim());
    setSubmitting(false);
    setShowRejectForm(false);
    setRejectReason('');
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

  const handleDownloadConvention = async () => {
    if (!conventionUrl) return;
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
      toast.success('Convention downloaded');
    } catch (error) {
      toast.error('Error downloading convention');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">{app.offer_title}</h2>
            <p className="text-slate-400 text-sm mt-1">
              Application by <span className="text-white font-medium">{app.student_name}</span>
              {' · '}
              {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={app.status} />
            <button onClick={onClose} className="text-slate-500 hover:text-white transition ml-2">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {[
              ['Type', app.offer_type],
              ['Wilaya', app.offer_wilaya],
              ['Duration', app.offer_duration],
            ].map(([label, val]) => (
              <div key={label} className="bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className="text-sm text-white font-medium">{val || '—'}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={15} /> Student Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-300"><Mail size={14} className="text-slate-500" />{app.student_email || '—'}</div>
              <div className="flex items-center gap-2 text-slate-300"><MapPin size={14} className="text-slate-500" />{app.student_wilaya || '—'}</div>
              <div className="flex items-center gap-2 text-slate-300"><BookOpen size={14} className="text-slate-500" />{app.student_university || '—'}</div>
              <div className="flex items-center gap-2 text-slate-300"><Award size={14} className="text-slate-500" />{app.student_major || '—'} · {app.student_education_level || '—'}</div>
              <div className="flex items-center gap-2 text-slate-300"><Calendar size={14} className="text-slate-500" />Graduation: {app.student_graduation_year || '—'}</div>
              {app.student_github && (
                <div className="flex items-center gap-2 text-slate-300"><Github size={14} className="text-slate-500" /><a href={app.student_github} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline truncate">{app.student_github}</a></div>
              )}
              {app.student_portfolio && (
                <div className="flex items-center gap-2 text-slate-300"><Globe size={14} className="text-slate-500" /><a href={app.student_portfolio} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline truncate">{app.student_portfolio}</a></div>
              )}
            </div>
            {app.student_skills?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Code size={13} /> Skills</p>
                <div className="flex flex-wrap gap-2">
                  {app.student_skills.map((s) => (
                    <span key={s} className="bg-indigo-900/60 text-indigo-300 text-xs px-2.5 py-1 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {app.cover_letter && (
            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={15} /> Cover Letter
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{app.cover_letter}</p>
            </div>
          )}

          {app.cv_file_url && (
            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={15} /> CV
              </h3>
              {!cvBlobUrl && !loadingCv && (
                <button onClick={() => loadPdf(`https://pfe-l31r.onrender.com${app.cv_file_url}`)} className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition">
                  Load CV
                </button>
              )}
              {loadingCv && <p className="text-slate-300 text-sm">Loading...</p>}
              {cvBlobUrl && (
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.3)', marginBottom: 10 }}>
                  <iframe src={cvBlobUrl} title="CV PDF" style={{ width: '100%', height: 420, border: 'none', background: '#fff' }} />
                </div>
              )}
            </div>
          )}

          {app.status === 'accepted_by_company' && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-300 text-sm font-medium mb-3 flex items-center gap-2">
                <FileText size={16} />
                Generate internship agreement
              </p>
              <button
                onClick={handleGenerateConvention}
                disabled={generating}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                {generating ? <Loader2 size={16} className="animate-spin" /> : <FileText size={14} />}
                Generate agreement
              </button>
            </div>
          )}

          {conventionUrl && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
              <p className="text-green-300 text-sm font-medium mb-3 flex items-center gap-2">
                <FileText size={16} />
                Agreement available
              </p>
              <button
                onClick={handleDownloadConvention}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
              >
                <Download size={14} />
                Download agreement
              </button>
            </div>
          )}

          {app.status === 'rejected_by_company' && app.company_notes && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-xs text-red-400 font-semibold mb-1">Rejection reason</p>
              <p className="text-sm text-red-300">{app.company_notes}</p>
            </div>
          )}

          {!alreadyResponded && app.status === 'pending' && (
            <div className="border-t border-slate-700 pt-5">
              {showAcceptConfirm ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-green-300 text-sm font-medium mb-3">
                    Confirm acceptance of <strong>{app.student_name}</strong>?
                  </p>
                  <div className="flex gap-3">
                    <button onClick={handleAccept} disabled={submitting} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                      Yes, accept
                    </button>
                    <button onClick={() => setShowAcceptConfirm(false)} className="px-5 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition">Cancel</button>
                  </div>
                </div>
              ) : showRejectForm ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-red-300 text-sm font-medium mb-3">Rejection reason <span className="text-red-400">*</span></p>
                  <textarea className="w-full bg-slate-800 border border-slate-600 focus:border-red-500 rounded-lg px-3 py-2 text-sm text-white outline-none resize-none min-h-[80px] mb-3" placeholder="Explain why this application is being rejected..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  <div className="flex gap-3">
                    <button onClick={handleReject} disabled={submitting || !rejectReason.trim()} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition">
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                      Confirm rejection
                    </button>
                    <button onClick={() => { setShowRejectForm(false); setRejectReason(''); }} className="px-5 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setShowAcceptConfirm(true)} className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-600/30 px-5 py-2.5 rounded-lg text-sm font-semibold transition">
                    <CheckCircle size={16} /> Accept
                  </button>
                  <button onClick={() => setShowRejectForm(true)} className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 px-5 py-2.5 rounded-lg text-sm font-semibold transition">
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CompanyApplications() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [isDarkMode, setIsDarkMode] = useState(true);

  const isCompanyManager = user?.sub_role === 'company_manager';

  // Load theme from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'false') {
      setIsDarkMode(false);
      document.body.classList.add('light-mode');
    } else {
      setIsDarkMode(true);
      document.body.classList.remove('light-mode');
    }
  }, []);

  // Toggle theme function
  const toggleTheme = () => {
    if (isDarkMode) {
      document.body.classList.add('light-mode');
      localStorage.setItem('darkMode', 'false');
      setIsDarkMode(false);
    } else {
      document.body.classList.remove('light-mode');
      localStorage.setItem('darkMode', 'true');
      setIsDarkMode(true);
    }
  };

  const showMsg = (type, text) => {
    setMsg({ type, text });
    if (type === 'success') setTimeout(() => setMsg(null), 4000);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/company/applications/`, { headers: auth() });
      const data = await res.json();
      if (data.success) setApplications(data.applications || []);
      else showMsg('error', data.error || 'Error loading applications');
    } catch (e) {
      showMsg('error', `Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, []);

  const handleAccept = async (appId) => {
    try {
      const res = await fetch(`${API}/company/applications/${appId}/respond/`, {
        method: 'POST', headers: authJson(),
        body: JSON.stringify({ status: 'accepted' }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg('success', 'Application accepted. Waiting for university validation.');
        setSelected(null);
        fetchApplications();
      } else {
        showMsg('error', data.error || 'Error accepting application');
      }
    } catch (e) {
      showMsg('error', `Network error: ${e.message}`);
    }
  };

  const handleReject = async (appId, reason) => {
    try {
      const res = await fetch(`${API}/company/applications/${appId}/respond/`, {
        method: 'POST', headers: authJson(),
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg('success', 'Application rejected.');
        setSelected(null);
        fetchApplications();
      } else {
        showMsg('error', data.error || 'Error rejecting application');
      }
    } catch (e) {
      showMsg('error', `Network error: ${e.message}`);
    }
  };

  const filtered = filter === 'all' ? applications : applications.filter((a) => a.status === filter);
  const counts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    accepted_by_company: applications.filter((a) => a.status === 'accepted_by_company').length,
    rejected_by_company: applications.filter((a) => a.status === 'rejected_by_company').length,
    validated_by_co_dept: applications.filter((a) => a.status === 'validated_by_co_dept').length,
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const dashboardPath = isCompanyManager ? '/company-manager/dashboard' : '/company/dashboard';

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-gradient-to-b from-[#1a0840] to-[#0e0c27] h-full fixed left-0 top-0 overflow-y-auto border-r border-purple-500/30">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                <UserAvatar /> 
            </div>
            <div>
              <p className="text-white font-medium text-sm">{user?.full_name || user?.email}</p>
              <p className="text-white/50 text-xs">{user?.email}</p>
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
              <Link to="/company/profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <User size={16} /> My Profile
              </Link>
              <Link to="/company/company-profile" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <Building2 size={16} /> Company Profile
              </Link>
              <Link to="/company/manage-offers" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                <Briefcase size={16} /> Manage Offers
              </Link>
              <Link to="/company/applications" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-purple-600/30 text-purple-300 border border-purple-500/30">
                <FileText size={16} /> Student Applications
              </Link>
              {isCompanyManager && (
                <>
                  <Link to="/company-manager/manage-hiring-managers" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                    <UserCog size={16} /> Manage Hiring Managers
                  </Link>
                  <Link to="/company-manager/activity-logs" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
                    <Activity size={16} /> Control HM Activity
                  </Link>
                </>
              )}
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

      {/* Main content area */}
      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <button
            onClick={() => navigate(dashboardPath)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <Msg msg={msg} onClose={() => setMsg(null)} />

          <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>All ({counts.all})</button>
              <button onClick={() => setFilter('pending')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>Pending ({counts.pending})</button>
              <button onClick={() => setFilter('accepted_by_company')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'accepted_by_company' ? 'bg-blue-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>Accepted ({counts.accepted_by_company})</button>
              <button onClick={() => setFilter('validated_by_co_dept')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'validated_by_co_dept' ? 'bg-green-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>Validated ({counts.validated_by_co_dept})</button>
              <button onClick={() => setFilter('rejected_by_company')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'rejected_by_company' ? 'bg-red-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>Rejected ({counts.rejected_by_company})</button>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 bg-purple-600/40 hover:bg-purple-600/60 text-white px-4 py-2 rounded-lg text-sm transition"
            >
              {isDarkMode ? <SunIcon size={14} /> : <MoonIcon size={14} />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24 text-white/50"><Loader2 size={24} className="animate-spin mr-3" /> Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-16 text-center border border-white/10"><Clock size={40} className="mx-auto mb-3 text-white/20" /><p className="text-white/50">No applications found.</p></div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/10 text-white/50 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Offer</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((app) => (
                      <tr key={app.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3"><p className="font-semibold text-white">{app.student_name}</p><p className="text-white/40 text-xs">{app.student_email}</p></td>
                        <td className="px-4 py-3"><p className="text-white">{app.offer_title}</p><p className="text-white/40 text-xs">{app.offer_type}</p></td>
                        <td className="px-4 py-3 text-white/60">{app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                        <td className="px-4 py-3"><button onClick={() => setSelected(app)} className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition"><Eye size={14} /> Details</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {selected && (
        <ApplicationModal
          app={selected}
          onClose={() => setSelected(null)}
          onAccept={handleAccept}
          onReject={handleReject}
          onGenerateConvention={fetchApplications}
        />
      )}

      <style>{`
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 768px) {
          .w-64 {
            width: 220px !important;
          }
          .ml-64 {
            margin-left: 220px !important;
          }
          .flex.justify-between.items-center {
            flex-direction: column;
            align-items: flex-start !important;
          }
          .overflow-x-auto {
            overflow-x: auto;
          }
          table {
            min-width: 600px;
          }
          .px-4 {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .grid-cols-3 {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        
        @media (max-width: 580px) {
          .w-64 {
            width: 200px !important;
          }
          .ml-64 {
            margin-left: 200px !important;
          }
          .grid-cols-3 {
            grid-template-columns: 1fr;
          }
          .flex.gap-2 {
            gap: 0.5rem;
          }
          .px-4.py-2 {
            padding: 0.4rem 0.75rem;
            font-size: 0.7rem;
          }
        }
        
        @media (max-width: 480px) {
          .w-64 {
            width: 180px !important;
          }
          .ml-64 {
            margin-left: 180px !important;
          }
          .py-8 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .w-64 {
          background: linear-gradient(180deg, #ffffff 0%, #f5f0ff 100%) !important;
          border-right: 1px solid rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .text-white,
        body.light-mode .text-white/50,
        body.light-mode .text-white/60,
        body.light-mode .text-white/70,
        body.light-mode .text-white/90 {
          color: #1a1a2e !important;
        }
        body.light-mode .text-white/40,
        body.light-mode .text-white/30 {
          color: #999 !important;
        }
        body.light-mode .text-slate-400,
        body.light-mode .text-slate-500,
        body.light-mode .text-slate-300 {
          color: #666 !important;
        }
        body.light-mode .text-purple-300/60 {
          color: #8D23D4 !important;
          opacity: 0.7;
        }
        body.light-mode .bg-white/10,
        body.light-mode .bg-white/5 {
          background: rgba(141, 35, 212, 0.08) !important;
        }
        body.light-mode .bg-white/5.rounded-xl {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .border-white/10,
        body.light-mode .border-white/20 {
          border-color: rgba(141, 35, 212, 0.15) !important;
        }
        body.light-mode .bg-slate-800,
        body.light-mode .bg-slate-800/60 {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        body.light-mode .bg-indigo-900/60 {
          background: rgba(141, 35, 212, 0.1) !important;
        }
        body.light-mode .text-indigo-300 {
          color: #8D23D4 !important;
        }
        body.light-mode .text-indigo-400 {
          color: #8D23D4 !important;
        }
        body.light-mode .bg-purple-600/30 {
          background: rgba(141, 35, 212, 0.15) !important;
        }
        body.light-mode .border-purple-500/30 {
          border-color: rgba(141, 35, 212, 0.3) !important;
        }
        body.light-mode .text-purple-300 {
          color: #8D23D4 !important;
        }
        body.light-mode .bg-red-500/20 {
          background: rgba(220, 38, 38, 0.1) !important;
        }
        body.light-mode .text-red-300 {
          color: #dc2626 !important;
        }
        body.light-mode .bg-green-500/20 {
          background: rgba(5, 150, 105, 0.1) !important;
        }
        body.light-mode .text-green-300 {
          color: #059669 !important;
        }
        body.light-mode .bg-blue-500/20 {
          background: rgba(37, 99, 235, 0.1) !important;
        }
        body.light-mode .text-blue-300 {
          color: #2563eb !important;
        }
        body.light-mode .bg-yellow-500/20 {
          background: rgba(217, 119, 6, 0.1) !important;
        }
        body.light-mode .text-yellow-300 {
          color: #d97706 !important;
        }
        body.light-mode input,
        body.light-mode select,
        body.light-mode textarea {
          color: #1a1a2e !important;
          background: rgba(0, 0, 0, 0.05) !important;
        }
        body.light-mode input::placeholder,
        body.light-mode textarea::placeholder {
          color: #999 !important;
        }
        body.light-mode select option {
          background: white !important;
          color: #1a1a2e !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] {
          background: white !important;
          border-color: rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] .text-white {
          color: #1a1a2e !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] .text-slate-400,
        body.light-mode .bg-\\[\\#1e293b\\] .text-slate-500 {
          color: #666 !important;
        }
        body.light-mode .border-slate-700 {
          border-color: rgba(141, 35, 212, 0.15) !important;
        }
      `}</style>
    </div>
  );
}
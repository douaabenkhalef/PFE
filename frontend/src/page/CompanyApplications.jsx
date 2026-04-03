import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Eye, CheckCircle, XCircle, Clock,
  User, Mail, MapPin, BookOpen, Award, Code, Github,
  Globe, FileText, Loader2, AlertCircle, CheckCircle2, X,
} from 'lucide-react';

const API = 'http://localhost:8000/api';
const auth = () => ({
  Authorization: `Bearer ${localStorage.getItem('access_token')}`,
});
const authJson = () => ({
  ...auth(),
  'Content-Type': 'application/json',
});

// ── Inline message ────────────────────────────────────────────────────────────
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

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    accepted:  'bg-green-500/20  text-green-300  border-green-500/30',
    rejected:  'bg-red-500/20    text-red-300    border-red-500/30',
    validated: 'bg-blue-500/20   text-blue-300   border-blue-500/30',
    completed: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${map[status] || 'bg-slate-500/20 text-slate-300'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function ApplicationModal({ app, onClose, onAccept, onReject }) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!app) return null;

  const alreadyResponded = app.status !== 'pending';

  const handleAccept = async () => {
    setSubmitting(true);
    await onAccept(app.id);
    setSubmitting(false);
    setShowAcceptConfirm(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setSubmitting(true);
    await onReject(app.id, rejectReason.trim());
    setSubmitting(false);
    setShowRejectForm(false);
    setRejectReason('');
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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

          {/* Offer info strip */}
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

          {/* Student profile */}
          <div className="bg-slate-800/60 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User size={15} /> Student Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Mail size={14} className="text-slate-500 shrink-0" />
                <span>{app.student_email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin size={14} className="text-slate-500 shrink-0" />
                <span>{app.student_wilaya || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <BookOpen size={14} className="text-slate-500 shrink-0" />
                <span>{app.student_university || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Award size={14} className="text-slate-500 shrink-0" />
                <span>{app.student_major || '—'} · {app.student_education_level || '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Award size={14} className="text-slate-500 shrink-0" />
                <span>Graduation: {app.student_graduation_year || '—'}</span>
              </div>
              {app.student_github && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Github size={14} className="text-slate-500 shrink-0" />
                  <a href={app.student_github} target="_blank" rel="noreferrer"
                    className="text-indigo-400 hover:underline truncate">{app.student_github}</a>
                </div>
              )}
              {app.student_portfolio && (
                <div className="flex items-center gap-2 text-slate-300">
                  <Globe size={14} className="text-slate-500 shrink-0" />
                  <a href={app.student_portfolio} target="_blank" rel="noreferrer"
                    className="text-indigo-400 hover:underline truncate">{app.student_portfolio}</a>
                </div>
              )}
            </div>

            {/* Skills */}
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

          {/* Cover letter */}
          {app.cover_letter && (
            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={15} /> Cover Letter
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{app.cover_letter}</p>
            </div>
          )}

          {/* CV */}
          {app.cv_file_url && (
            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText size={15} /> CV / Resume
              </h3>
              <a
                href={`${API}${app.cv_file_url}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition"
              >
                <FileText size={15} /> View / Download CV
              </a>
            </div>
          )}

          {/* Rejection reason display */}
          {app.status === 'rejected' && app.company_notes && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-xs text-red-400 font-semibold mb-1">Rejection Reason</p>
              <p className="text-sm text-red-300">{app.company_notes}</p>
            </div>
          )}

          {/* Action buttons — only for pending applications */}
          {!alreadyResponded && (
            <div className="border-t border-slate-700 pt-5">
              {/* Accept confirmation */}
              {showAcceptConfirm ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <p className="text-green-300 text-sm font-medium mb-3">
                    Confirm acceptance of <strong>{app.student_name}</strong>'s application?
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAccept}
                      disabled={submitting}
                      className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                      Yes, Accept
                    </button>
                    <button
                      onClick={() => setShowAcceptConfirm(false)}
                      className="px-5 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : showRejectForm ? (
                /* Reject form */
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <p className="text-red-300 text-sm font-medium mb-3">Reason for rejection <span className="text-red-400">*</span></p>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-600 focus:border-red-500 rounded-lg px-3 py-2 text-sm text-white outline-none resize-none min-h-[80px] mb-3"
                    placeholder="Explain why this application is being rejected..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      disabled={submitting || !rejectReason.trim()}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-semibold transition"
                    >
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                      Confirm Rejection
                    </button>
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectReason(''); }}
                      className="px-5 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Default action bar */
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAcceptConfirm(true)}
                    className="flex items-center gap-2 bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-600/30 px-5 py-2.5 rounded-lg text-sm font-semibold transition"
                  >
                    <CheckCircle size={16} /> Accept Application
                  </button>
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 px-5 py-2.5 rounded-lg text-sm font-semibold transition"
                  >
                    <XCircle size={16} /> Reject Application
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CompanyApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [msg, setMsg]                   = useState(null);
  const [selected, setSelected]         = useState(null); // open in modal
  const [filter, setFilter]             = useState('all'); // all | pending | accepted | rejected

  const showMsg = (type, text) => {
    setMsg({ type, text });
    if (type === 'success') setTimeout(() => setMsg(null), 4000);
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/company/applications/`, { headers: auth() });
      const data = await res.json();
      if (data.success) setApplications(data.applications || []);
      else showMsg('error', data.error || 'Failed to load applications.');
    } catch (e) {
      showMsg('error', `Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApplications(); }, []);

  const handleAccept = async (appId) => {
    try {
      const res  = await fetch(`${API}/company/applications/${appId}/respond/`, {
        method: 'POST', headers: authJson(),
        body: JSON.stringify({ status: 'accepted' }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg('success', 'Application accepted. The student has been notified.');
        setSelected(null);
        fetchApplications();
      } else {
        showMsg('error', data.error || 'Failed to accept application.');
      }
    } catch (e) {
      showMsg('error', `Network error: ${e.message}`);
    }
  };

  const handleReject = async (appId, reason) => {
    try {
      const res  = await fetch(`${API}/company/applications/${appId}/respond/`, {
        method: 'POST', headers: authJson(),
        body: JSON.stringify({ status: 'rejected', rejection_reason: reason }),
      });
      const data = await res.json();
      if (data.success) {
        showMsg('success', 'Application rejected. The student has been notified.');
        setSelected(null);
        fetchApplications();
      } else {
        showMsg('error', data.error || 'Failed to reject application.');
      }
    } catch (e) {
      showMsg('error', `Network error: ${e.message}`);
    }
  };

  const filtered = filter === 'all'
    ? applications
    : applications.filter((a) => a.status === filter);

  const counts = {
    all:      applications.length,
    pending:  applications.filter((a) => a.status === 'pending').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900">
      {/* Navbar */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 gap-4">
            <Link
              to={user?.sub_role === 'company_manager' ? '/company-manager/dashboard' : '/company/dashboard'}
              className="flex items-center gap-2 text-white/70 hover:text-white transition text-sm"
            >
              <ArrowLeft size={16} /> Back
            </Link>
            <span className="text-white/30">|</span>
            <h1 className="text-lg font-bold text-white">Applications Received</h1>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Msg msg={msg} onClose={() => setMsg(null)} />

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'pending', 'accepted', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? 'bg-white/20 text-white'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="ml-2 text-xs opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24 text-white/50">
            <Loader2 size={24} className="animate-spin mr-3" /> Loading applications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-16 text-center border border-white/10">
            <Clock size={40} className="mx-auto mb-3 text-white/20" />
            <p className="text-white/50">No applications found.</p>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/10 text-white/50 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Student</th>
                  <th className="px-4 py-3 text-left">Offer</th>
                  <th className="px-4 py-3 text-left">Applied</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((app) => (
                  <tr key={app.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{app.student_name}</p>
                      <p className="text-white/40 text-xs">{app.student_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white">{app.offer_title}</p>
                      <p className="text-white/40 text-xs">{app.offer_type}</p>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(app)}
                        className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition"
                      >
                        <Eye size={14} /> View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Detail modal */}
      {selected && (
        <ApplicationModal
          app={selected}
          onClose={() => setSelected(null)}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
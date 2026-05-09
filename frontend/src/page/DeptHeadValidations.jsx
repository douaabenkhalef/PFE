// frontend/src/page/DeptHeadValidations.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Eye, FileText, Building2, GraduationCap, MapPin, Calendar, Code,
  Mail, User, BookOpen, Award, Github, Globe,
  Loader2, AlertCircle, X, PenTool, Download, Stamp,
  CheckCircle, XCircle, FileSignature, Clock, CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminSidebarInline } from '../components/AdminSidebar';
import ChatWidget from '../components/ChatWidget';
import PrivateChat from '../components/PrivateChat';
import SignaturePad from '../components/SignaturePad';
import StampPad from '../components/StampPad';
import './StudentDashboard.css';

const API = 'https://pfe-l31r.onrender.com/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token')}`
});

// StatusBadge component
function StatusBadge({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'accepted_by_company':
        return { label: 'Pending validation', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
      case 'validated_by_co_dept':
        return { label: 'Validated - Ready to sign', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
      case 'rejected_by_co_dept':
        return { label: 'Rejected', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
      case 'fully_signed':
        return { label: 'Fully signed', color: 'bg-green-500/20 text-green-300 border-green-500/30' };
      default:
        return { label: status || 'Pending', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
    }
  };
  const config = getStatusConfig();
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      {config.label}
    </span>
  );
}

// DonutChart component
const DonutChart = ({ percentage, color, trackColor, size = 80, stroke = 8 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setPct(percentage), 200);
    return () => clearTimeout(timer);
  }, [percentage]);

  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
};

// StatsCards component - RESPONSIVE (5 columns on PC, adjusts on smaller screens)
const StatsCards = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="stats-grid-responsive">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="stats-skeleton-card">
            <div className="skeleton-title"></div>
            <div className="skeleton-chart"></div>
          </div>
        ))}
      </div>
    );
  }

  const donutConfigs = [
    {
      title: "Total",
      value: stats.total,
      percentage: 100,
      color: "#8b5cf6",
      trackColor: "#2d1d5e",
      icon: FileSignature,
      iconColor: "text-purple-400",
      bgColor: "bg-purple-500/20",
    },
    {
      title: "Pending",
      value: stats.pending,
      percentage: stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0,
      color: "#fbbf24",
      trackColor: "#3d2a00",
      icon: Clock,
      iconColor: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
    },
    {
      title: "Validated",
      value: stats.validated,
      percentage: stats.total > 0 ? Math.round((stats.validated / stats.total) * 100) : 0,
      color: "#34d399",
      trackColor: "#063d28",
      icon: CheckCircle2,
      iconColor: "text-green-400",
      bgColor: "bg-green-500/20",
    },
    {
      title: "Rejected",
      value: stats.rejected,
      percentage: stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0,
      color: "#f97316",
      trackColor: "#3b1200",
      icon: XCircle,
      iconColor: "text-orange-400",
      bgColor: "bg-orange-500/20",
    },
    {
      title: "Signed",
      value: stats.signed,
      percentage: stats.total > 0 ? Math.round((stats.signed / stats.total) * 100) : 0,
      color: "#8b5cf6",
      trackColor: "#2d1d5e",
      icon: CheckCircle,
      iconColor: "text-purple-400",
      bgColor: "bg-purple-500/20",
    },
  ];

  return (
    <div className="stats-grid-responsive">
      {donutConfigs.map((config, idx) => {
        const IconComponent = config.icon;
        return (
          <div key={idx} className="stats-card">
            <div className="stats-card-header">
              <span className="stats-card-title">{config.title}</span>
              <div className={`stats-card-icon ${config.bgColor}`}>
                <IconComponent size={16} className={config.iconColor} />
              </div>
            </div>

            <div className="stats-card-chart">
              <div className="donut-wrapper">
                <DonutChart
                  percentage={config.percentage}
                  color={config.color}
                  trackColor={config.trackColor}
                  size={100}
                  stroke={10}
                />
                <div className="donut-center">
                  <span className="donut-value">{config.value}</span>
                </div>
              </div>
            </div>

            <div className="stats-card-legend">
              <div className="legend-item">
                <span className="legend-dot" style={{ background: config.color }} />
                <span className="legend-label">{config.title}</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ background: config.trackColor }} />
                <span className="legend-label">Remaining</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// DetailsModal component (unchanged - keeping all functionality)
const DetailsModal = ({ application, onClose, onValidate, onReject, onAddSignature, onPermissionError }) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showStampModal, setShowStampModal] = useState(false);
  const [cvUrl, setCvUrl] = useState(null);
  const [loadingCv, setLoadingCv] = useState(false);
  const [conventionUrl, setConventionUrl] = useState(null);
  const [loadingConvention, setLoadingConvention] = useState(false);
  const [signatureInfo, setSignatureInfo] = useState({ university_signed: false });
  const [stampInfo, setStampInfo] = useState({ has_stamp: false });

  const loadCv = async () => {
    if (!application.cv_file_url) return;
    setLoadingCv(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`https://pfe-l31r.onrender.com${application.cv_file_url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setCvUrl(url);
    } catch (err) {
      toast.error("Error loading CV");
    } finally {
      setLoadingCv(false);
    }
  };

  const loadConvention = async () => {
    if (!application.convention_url) return;
    setLoadingConvention(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`https://pfe-l31r.onrender.com${application.convention_url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setConventionUrl(url);
    } catch (err) {
      console.error("Error loading convention:", err);
    } finally {
      setLoadingConvention(false);
    }
  };

  const handleValidate = async () => {
    setSubmitting(true);
    try {
      await onValidate(application.id);
      onClose();
    } catch (err) {}
    finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please enter a rejection reason");
      return;
    }
    setSubmitting(true);
    try {
      await onReject(application.id, rejectReason);
      onClose();
    } catch (err) {}
    finally {
      setSubmitting(false);
      setShowRejectForm(false);
      setRejectReason("");
    }
  };

  const handleSignatureSave = async (signatureData) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/signature/university/${application.id}/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ signature: signatureData }),
      });
      const data = await res.json();

      if (res.status === 403) {
        const errorMsg = "You don't have permission to sign this convention.";
        if (onPermissionError) onPermissionError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (data.success) {
        toast.success("Signature added successfully!");
        setSignatureInfo({ university_signed: true });
        if (onAddSignature) onAddSignature();
        setTimeout(() => loadConvention(), 500);
      } else {
        toast.error(data.error || "Error adding signature");
      }
    } catch (err) {
      toast.error("Connection error");
    } finally {
      setSubmitting(false);
      setShowSignatureModal(false);
    }
  };

  const handleStampSave = async (stampData) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/stamp/university/${application.id}/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ stamp: stampData }),
      });
      const data = await res.json();

      if (res.status === 403) {
        const errorMsg = "You don't have permission to add the stamp.";
        if (onPermissionError) onPermissionError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (data.success) {
        toast.success("Stamp added successfully!");
        setStampInfo({ has_stamp: true });
        if (onAddSignature) onAddSignature();
        setTimeout(() => loadConvention(), 500);
      } else {
        toast.error(data.error || "Error adding stamp");
      }
    } catch (err) {
      toast.error("Connection error");
    } finally {
      setSubmitting(false);
      setShowStampModal(false);
    }
  };

  const handleDownloadConvention = async () => {
    if (!conventionUrl) return;
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(conventionUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `convention_${application.student?.full_name || "internship"}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Convention downloaded successfully");
    } catch (error) {
      toast.error("Error downloading convention");
    }
  };

  useEffect(() => {
    if (application.cv_file_url) loadCv();
    if (application.status === "validated_by_co_dept" && application.convention_url) {
      loadConvention();
    }
  }, []);

  if (!application) return null;

  const isSigned = signatureInfo.university_signed;
  const hasStamp = stampInfo.has_stamp;

  return (
    <>
      {showSignatureModal && (
        <SignaturePad onSave={handleSignatureSave} onClose={() => setShowSignatureModal(false)} title="University Signature" />
      )}
      {showStampModal && (
        <StampPad onSave={handleStampSave} onClose={() => setShowStampModal(false)} title="Official University Stamp" />
      )}

      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-[#1e293b] border-b border-slate-700 p-5 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">{application.offer?.title || "N/A"}</h2>
              <p className="text-slate-400 text-sm mt-1">
                Application by <span className="text-white font-medium">{application.student?.full_name || "N/A"}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={application.status} />
              <button onClick={onClose} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Type</p>
                <p className="text-sm text-white">{application.offer?.internship_type || "—"}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Wilaya</p>
                <p className="text-sm text-white">{application.offer?.wilaya || "—"}</p>
              </div>
              <div className="bg-slate-800 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Duration</p>
                <p className="text-sm text-white">{application.offer?.duration || "—"}</p>
              </div>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <User size={15} /> Student Profile
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Mail size={14} />{application.student?.email || "—"}</div>
                <div className="flex items-center gap-2"><MapPin size={14} />{application.student?.wilaya || "—"}</div>
                <div className="flex items-center gap-2"><BookOpen size={14} />{application.student?.university || "—"}</div>
                <div className="flex items-center gap-2"><Award size={14} />{application.student?.major || "—"} · {application.student?.education_level || "—"}</div>
                <div className="flex items-center gap-2"><Calendar size={14} />Graduation: {application.student?.graduation_year || "—"}</div>
              </div>
              {application.student?.skills?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {application.student.skills.map(s => <span key={s} className="bg-indigo-900/60 text-indigo-300 text-xs px-2.5 py-1 rounded-full">{s}</span>)}
                  </div>
                </div>
              )}
            </div>

            {application.cv_file_url && (
              <div className="bg-slate-800/60 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <FileText size={15} /> CV
                </h3>
                {!cvUrl && !loadingCv && (
                  <button onClick={loadCv} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm">
                    Load CV
                  </button>
                )}
                {loadingCv && <p className="text-slate-300 text-sm">Loading...</p>}
                {cvUrl && <iframe src={cvUrl} title="CV" className="w-full h-96 rounded-lg border border-slate-600 mt-3" />}
              </div>
            )}

            {application.status === "validated_by_co_dept" && application.convention_url && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-green-300 mb-3 flex items-center gap-2">
                  <FileText size={15} /> Internship Agreement
                </h3>
                {!conventionUrl && !loadingConvention && (
                  <button onClick={loadConvention} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm">
                    Load agreement
                  </button>
                )}
                {loadingConvention && <p className="text-green-300 text-sm">Loading...</p>}
                {conventionUrl && (
                  <>
                    <iframe src={conventionUrl} title="Convention" className="w-full h-96 rounded-lg border border-green-500/30 mt-3" />
                    <button onClick={handleDownloadConvention} className="mt-3 flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm">
                      <Download size={14} /> Download agreement
                    </button>
                  </>
                )}
              </div>
            )}

            {application.status === "rejected_by_co_dept" && application.co_dept_notes && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-xs text-red-400 font-semibold mb-1">Rejection reason</p>
                <p className="text-sm text-red-300">{application.co_dept_notes}</p>
              </div>
            )}

            {application.status === "accepted_by_company" && (
              <div className="border-t border-slate-700 pt-5">
                {showRejectForm ? (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                    <p className="text-red-300 text-sm font-medium mb-3">Rejection reason <span className="text-red-400">*</span></p>
                    <textarea
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white resize-none min-h-[80px] mb-3"
                      placeholder="Explain why this request is being rejected..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-3">
                      <button onClick={handleRejectSubmit} disabled={submitting} className="bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                        Confirm rejection
                      </button>
                      <button onClick={() => { setShowRejectForm(false); setRejectReason(""); }} className="px-5 py-2 rounded-lg text-sm text-slate-400 hover:text-white">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={handleValidate} disabled={submitting} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold">
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={16} />}
                      Validate and generate agreement
                    </button>
                    <button onClick={() => setShowRejectForm(true)} className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 px-5 py-2.5 rounded-lg text-sm font-semibold">
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {application.status === "validated_by_co_dept" && (
              <div className="border-t border-slate-700 pt-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Signature and Stamp</h3>
                <div className="flex flex-wrap gap-3">
                  {!isSigned && (
                    <button onClick={() => setShowSignatureModal(true)} disabled={submitting} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
                      <PenTool size={16} /> Sign agreement
                    </button>
                  )}
                  {!hasStamp && (
                    <button onClick={() => setShowStampModal(true)} disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
                      <Stamp size={16} /> Add stamp
                    </button>
                  )}
                </div>
                {isSigned && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                    <p className="text-green-400 text-sm font-medium">✅ Signature added</p>
                  </div>
                )}
                {hasStamp && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-blue-400 text-sm font-medium">🏛️ Stamp added</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// Main Component - DeptHeadValidations
export default function DeptHeadValidations() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingApps, setPendingApps] = useState([]);
  const [validatedApps, setValidatedApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApp, setSelectedApp] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [signatureStatuses, setSignatureStatuses] = useState({});
  const [signedApps, setSignedApps] = useState([]);

  // Fetch signature status for a specific application
  const fetchSignatureStatus = async (appId) => {
    try {
      const res = await fetch(`${API}/signature/status/${appId}/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setSignatureStatuses(prev => ({
          ...prev,
          [appId]: data.university_signed || false
        }));
        return data.university_signed || false;
      }
      return false;
    } catch (err) {
      console.error("Error fetching signature status:", err);
      return false;
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const [pendingRes, validatedRes] = await Promise.all([
        fetch(`${API}/dept-head/pending-validations/`, { headers: authHeaders() }),
        fetch(`${API}/dept-head/validated-validations/`, { headers: authHeaders() })
      ]);
      
      const pendingData = await pendingRes.json();
      const validatedData = await validatedRes.json();
      
      if (pendingData.success) {
        const appsWithUrl = (pendingData.applications || []).map((app) => ({
          ...app,
          convention_url: app.status === 'accepted_by_company'
            ? null
            : `/api/co-dept/download-convention/${app.id}/`
        }));
        setPendingApps(appsWithUrl);
      }
      
      if (validatedData.success) {
        const appsWithUrl = (validatedData.applications || []).map((app) => ({
          ...app,
          convention_url: `/api/co-dept/download-convention/${app.id}/`
        }));
        
        // Separate validated conventions into signed vs not signed
        const signed = [];
        const notSigned = [];
        
        for (const app of appsWithUrl) {
          const isSigned = await fetchSignatureStatus(app.id);
          if (isSigned) {
            signed.push(app);
          } else {
            notSigned.push(app);
          }
        }
        
        setValidatedApps(notSigned);
        setSignedApps(signed);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Calculate statistics
  const stats = {
    total: pendingApps.length + validatedApps.length + signedApps.length,
    pending: pendingApps.filter((a) => a.status === 'accepted_by_company').length,
    validated: validatedApps.length,
    rejected: pendingApps.filter((a) => a.status === 'rejected_by_co_dept').length,
    signed: signedApps.length,
  };

  const handleValidate = async (applicationId) => {
    try {
      const res = await fetch(`${API}/dept-head/validate-application/${applicationId}/`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();

      if (res.status === 403) {
        const errorMsg = data.error || data.detail || "You don't have permission to validate this convention.";
        setPermissionError(errorMsg);
        setTimeout(() => setPermissionError(null), 5000);
        toast.error(errorMsg);
        return;
      }

      if (data.success) {
        toast.success('Convention validated and generated successfully!');
        await fetchApplications();
        setSelectedApp(null);
      } else {
        toast.error(data.error || 'Error during validation');
      }
    } catch (err) {
      toast.error('Connection error');
    }
  };

  const handleReject = async (applicationId, reason) => {
    try {
      const res = await fetch(`${API}/dept-head/reject-application/${applicationId}/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rejection_reason: reason }),
      });
      const data = await res.json();

      if (res.status === 403) {
        const errorMsg = data.error || data.detail || "You don't have permission to reject this convention.";
        setPermissionError(errorMsg);
        setTimeout(() => setPermissionError(null), 5000);
        toast.error(errorMsg);
        return;
      }

      if (data.success) {
        toast.success('Application rejected');
        await fetchApplications();
        setSelectedApp(null);
      } else {
        toast.error(data.error || 'Error during rejection');
      }
    } catch (err) {
      toast.error('Connection error');
    }
  };

  const handleAddSignature = async () => {
    await fetchApplications();
  };

  const handlePermissionError = (errorMsg) => {
    setPermissionError(errorMsg);
    setTimeout(() => setPermissionError(null), 5000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getCurrentApps = () => {
    switch (activeTab) {
      case 'pending':
        return pendingApps;
      case 'validated':
        return validatedApps;
      case 'signed':
        return signedApps;
      default:
        return pendingApps;
    }
  };

  const currentApps = getCurrentApps();
  const counts = {
    pending: pendingApps.filter(a => a.status === 'accepted_by_company').length,
    validated: validatedApps.length,
    signed: signedApps.length,
  };

  return (
    <div className="min-h-screen flex">
      <AdminSidebarInline user={user} onLogout={handleLogout} />

      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back button */}
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          {/* Permission error banner */}
          {permissionError && (
            <div className="flex items-center gap-3 bg-orange-500/10 backdrop-blur-lg border border-orange-500/30 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <div>
                <p className="text-orange-300 font-medium">Permission denied</p>
                <p className="text-orange-400/80 text-sm">{permissionError}</p>
                <p className="text-orange-400/60 text-xs mt-1">💡 Please contact your supervisor to request necessary permissions.</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Convention Requests</h1>
            <p className="text-white/60">Manage internship agreements pending validation, ready to sign, and already signed</p>
          </div>

          {/* Statistics Cards - Responsive */}
          <StatsCards stats={stats} loading={loading} />

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-white/20 pb-2 flex-wrap">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'pending'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Pending conventions ({counts.pending})
            </button>
            <button
              onClick={() => setActiveTab('validated')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'validated'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Ready to sign ({counts.validated})
            </button>
            <button
              onClick={() => setActiveTab('signed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'signed'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Signed ({counts.signed})
            </button>
          </div>

          {/* Applications Table */}
          {loading ? (
            <div className="flex items-center justify-center py-24 text-white/50"><Loader2 size={24} className="animate-spin mr-3" /> Loading conventions...</div>
          ) : currentApps.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-16 text-center border border-white/10">
              <FileSignature size={48} className="mx-auto mb-3 text-white/20" />
              <p className="text-white/50">
                {activeTab === 'pending' ? 'No conventions pending validation.' : 
                 activeTab === 'validated' ? 'No conventions ready to sign.' : 
                 'No signed conventions.'}
              </p>
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-white/10 text-white/50 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Student</th>
                      <th className="px-4 py-3 text-left">Offer</th>
                      <th className="px-4 py-3 text-left">Company</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {currentApps.map((app) => (
                      <tr key={app.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-white">{app.student?.full_name || 'N/A'}</p>
                          <p className="text-white/40 text-xs">{app.student?.email || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white">{app.offer?.title || 'N/A'}</p>
                          <p className="text-white/40 text-xs">{app.offer?.internship_type || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-white">{app.company?.company_name || 'N/A'}</p>
                          <p className="text-white/40 text-xs">{app.company?.location || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3 text-white/60">
                          {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={app.status} />
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedApp(app)} className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs font-medium transition">
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

      <ChatWidget university={user?.university || "University"} />

      {selectedApp && (
        <DetailsModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onValidate={handleValidate}
          onReject={handleReject}
          onAddSignature={handleAddSignature}
          onPermissionError={handlePermissionError}
        />
      )}

      <style>{`
        /* ===== RESPONSIVE STATS GRID - 5 columns on PC ===== */
        .stats-grid-responsive {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }

        .stats-card {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 20px;
          padding: 16px;
          transition: all 0.3s ease;
        }

        .stats-card:hover {
          border-color: rgba(139,92,246,0.5);
          transform: translateY(-4px);
        }

        .stats-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .stats-card-title {
          font-size: 12px;
          font-weight: 700;
          color: rgba(255,255,255,0.8);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .stats-card-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stats-card-chart {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .donut-wrapper {
          position: relative;
        }

        .donut-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .donut-value {
          font-size: 24px;
          font-weight: 800;
          color: white;
          line-height: 1;
        }

        .stats-card-legend {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .legend-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }

        .legend-label {
          font-size: 11px;
          color: rgba(255,255,255,0.55);
        }

        /* Skeleton loading */
        .stats-skeleton-card {
          background: rgba(255,255,255,0.1);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 16px;
          animation: pulse 1.5s infinite;
        }
        
        .skeleton-title {
          height: 12px;
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
          width: 60%;
          margin-bottom: 20px;
        }
        
        .skeleton-chart {
          height: 100px;
          background: rgba(255,255,255,0.15);
          border-radius: 50%;
          width: 100px;
          margin: 0 auto;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* ===== RESPONSIVE BREAKPOINTS ===== */
        
        /* Desktop Large (≥ 1400px) - 5 columns */
        @media (min-width: 1400px) {
          .stats-grid-responsive {
            grid-template-columns: repeat(5, 1fr);
            gap: 24px;
          }
        }

        /* Laptop (1024px - 1399px) - 3 columns */
        @media (max-width: 1399px) and (min-width: 1025px) {
          .stats-grid-responsive {
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
        }

        /* Tablet (768px - 1024px) - 2 columns */
        @media (max-width: 1024px) {
          .stats-grid-responsive {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .ml-64 {
            margin-left: 220px !important;
          }
          .grid-cols-3 {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        /* Mobile (480px - 768px) - 1 column */
        @media (max-width: 768px) {
          .stats-grid-responsive {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .ml-64 {
            margin-left: 0 !important;
          }
          .flex.gap-2 {
            gap: 0.5rem;
          }
          .px-4.py-2 {
            padding: 0.4rem 0.75rem;
            font-size: 0.7rem;
          }
          .overflow-x-auto {
            overflow-x: auto;
          }
          table {
            min-width: 600px;
          }
          .grid-cols-3 {
            grid-template-columns: 1fr;
          }
        }

        /* Mobile Small (< 480px) */
        @media (max-width: 480px) {
          .stats-grid-responsive {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .py-8 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
          .px-4 {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .text-2xl.font-bold {
            font-size: 1.1rem;
          }
          .text-xl.font-bold {
            font-size: 1rem;
          }
          .donut-value {
            font-size: 18px;
          }
          .stats-card-title {
            font-size: 10px;
          }
        }

        /* ===== LIGHT MODE STYLES (preserved from original) ===== */
        body.light-mode .stats-card,
        body.light-mode .bg-white\\/5 {
          background: rgba(255, 255, 255, 0.95) !important;
          border-color: rgba(141, 35, 212, 0.25) !important;
        }
        body.light-mode .stats-card-title,
        body.light-mode .donut-value,
        body.light-mode .legend-label {
          color: #1a1a2e !important;
        }
        body.light-mode .legend-label {
          color: #666 !important;
        }
        body.light-mode .bg-white\\/10,
        body.light-mode .bg-white\\/10.backdrop-blur-lg {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(141, 35, 212, 0.25) !important;
        }
        body.light-mode .text-white,
        body.light-mode .text-white\\/70,
        body.light-mode .text-white\\/80,
        body.light-mode .text-white\\/90 {
          color: #1a1a2e !important;
        }
        body.light-mode .text-white\\/50,
        body.light-mode .text-white\\/60,
        body.light-mode .text-white\\/40,
        body.light-mode .text-white\\/30 {
          color: #666 !important;
        }
        body.light-mode .text-purple-400 {
          color: #8D23D4 !important;
        }
        body.light-mode .border-white\\/20 {
          border-color: rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .bg-slate-800,
        body.light-mode .bg-slate-800\\/60 {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        body.light-mode .bg-slate-800 .text-white,
        body.light-mode .bg-slate-800 .text-slate-300 {
          color: #1a1a2e !important;
        }
        body.light-mode .bg-slate-800 .text-slate-500 {
          color: #999 !important;
        }
        body.light-mode .border-slate-700 {
          border-color: rgba(141, 35, 212, 0.15) !important;
        }
        body.light-mode .bg-indigo-900\\/60 {
          background: rgba(141, 35, 212, 0.1) !important;
        }
        body.light-mode .text-indigo-300,
        body.light-mode .text-indigo-400 {
          color: #8D23D4 !important;
        }
        body.light-mode .bg-green-500\\/10,
        body.light-mode .bg-red-500\\/10,
        body.light-mode .bg-purple-500\\/20,
        body.light-mode .bg-yellow-500\\/20,
        body.light-mode .bg-orange-500\\/20,
        body.light-mode .bg-blue-500\\/10 {
          background: rgba(141, 35, 212, 0.08) !important;
        }
        body.light-mode .text-green-300 {
          color: #059669 !important;
        }
        body.light-mode .text-red-300 {
          color: #dc2626 !important;
        }
        body.light-mode .text-yellow-300 {
          color: #d97706 !important;
        }
        body.light-mode .text-orange-400 {
          color: #ea580c !important;
        }
        body.light-mode .text-blue-400 {
          color: #2563eb !important;
        }
        body.light-mode .bg-green-600,
        body.light-mode .bg-purple-600,
        body.light-mode .bg-indigo-600,
        body.light-mode .bg-blue-600,
        body.light-mode .bg-red-600 {
          background: currentColor !important;
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
        body.light-mode .bg-\\[\\#1e293b\\] .text-slate-300 {
          color: #555 !important;
        }
        body.light-mode input,
        body.light-mode textarea,
        body.light-mode select {
          color: #1a1a2e !important;
        }
        body.light-mode input::placeholder,
        body.light-mode textarea::placeholder {
          color: #999 !important;
        }
        body.light-mode select option {
          background: white !important;
          color: #1a1a2e !important;
        }
      `}</style>
    </div>
  );
}
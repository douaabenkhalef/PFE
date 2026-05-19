// frontend/src/page/CoDeptValidations.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Eye, FileText, Building2, GraduationCap, MapPin, Calendar, Code,
  Mail, User, BookOpen, Award, Github, Globe,
  Loader2, AlertCircle, X, PenTool, Download, Stamp,
  CheckCircle, XCircle, FileSignature, Clock, CheckCircle2,
  ArrowLeft, Lock, Moon, Sun
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminSidebarInline } from '../components/AdminSidebar';
import ChatWidget from '../components/ChatWidget';
import SignaturePad from '../components/SignaturePad';
import StampPad from '../components/StampPad';
import './StudentDashboard.css';

const API = 'https://pfe-l31r.onrender.com/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('access_token')}`
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

// StatusBadge component
function StatusBadge({ status, isSigned = false }) {
  const getStatusConfig = () => {
    if (isSigned) {
      return { label: 'Signed', color: 'bg-green-500/20 text-green-300 border-green-500/30' };
    }
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

// StatsCards component
const StatsCards = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/10 backdrop-blur-lg rounded-2xl p-5 border border-white/20 animate-pulse">
            <div className="h-12 bg-white/20 rounded w-20 mb-2"></div>
            <div className="h-6 bg-white/20 rounded w-32"></div>
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
      title: "Ready to sign",
      value: stats.readyToSign,
      percentage: stats.total > 0 ? Math.round((stats.readyToSign / stats.total) * 100) : 0,
      color: "#34d399",
      trackColor: "#063d28",
      icon: CheckCircle2,
      iconColor: "text-green-400",
      bgColor: "bg-green-500/20",
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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {donutConfigs.map((config, idx) => {
        const IconComponent = config.icon;
        return (
          <div
            key={idx}
            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-5 hover:border-purple-500/50 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                {config.title}
              </span>
              <div className={`w-8 h-8 ${config.bgColor} rounded-full flex items-center justify-center`}>
                <IconComponent size={16} className={config.iconColor} />
              </div>
            </div>

            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <DonutChart
                  percentage={config.percentage}
                  color={config.color}
                  trackColor={config.trackColor}
                  size={100}
                  stroke={10}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{config.value}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 text-center">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: config.color }} />
                <span className="text-xs text-white/50">{config.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: config.trackColor }} />
                <span className="text-xs text-white/50">Remaining</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// DetailsModal component
const DetailsModal = ({ 
  application, 
  onClose, 
  onValidate, 
  onReject, 
  onAddSignature, 
  onPermissionError,
  userPermissions 
}) => {
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

  const hasManagePermissions = userPermissions?.can_manage_conventions !== false;
  const canSign = userPermissions?.can_add_signature !== false;
  const canAddStamp = userPermissions?.can_add_stamp !== false;

  const handleValidateClick = () => {
    if (!hasManagePermissions) {
      const errorMsg = "You don't have permission to validate conventions. Please contact the Department Head.";
      if (onPermissionError) onPermissionError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    handleValidate();
  };

  const handleRejectClick = () => {
    if (!hasManagePermissions) {
      const errorMsg = "You don't have permission to reject conventions. Please contact the Department Head.";
      if (onPermissionError) onPermissionError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    setShowRejectForm(true);
  };

  const handleSignatureClick = () => {
    if (!canSign) {
      const errorMsg = "You don't have permission to add a signature. Please contact the Department Head.";
      if (onPermissionError) onPermissionError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    setShowSignatureModal(true);
  };

  const handleStampClick = () => {
    if (!canAddStamp) {
      const errorMsg = "You don't have permission to add the stamp. Please contact the Department Head.";
      if (onPermissionError) onPermissionError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    setShowStampModal(true);
  };

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
    } catch (err) {
      // Error handled in parent
    } finally {
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
    } catch (err) {
      // Error handled in parent
    } finally {
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
              <StatusBadge status={application.status} isSigned={isSigned} />
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
                    {application.student.skills.map((s) => (
                      <span key={s} className="bg-indigo-900/60 text-indigo-300 text-xs px-2.5 py-1 rounded-full">{s}</span>
                    ))}
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
                  <div>
                    <iframe src={conventionUrl} title="Convention" className="w-full h-96 rounded-lg border border-green-500/30 mt-3" />
                    <button onClick={handleDownloadConvention} className="mt-3 flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm">
                      <Download size={14} /> Download agreement
                    </button>
                  </div>
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
                    <textarea className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white resize-none min-h-[80px] mb-3" placeholder="Explain why this request is being rejected..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
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
                    {hasManagePermissions ? (
                      <>
                        <button onClick={handleValidateClick} disabled={submitting} className="bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold">
                          {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={16} />}
                          Validate and generate agreement
                        </button>
                        <button onClick={handleRejectClick} className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-600/30 px-5 py-2.5 rounded-lg text-sm font-semibold">
                          <XCircle size={16} /> Reject
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-center gap-2 bg-red-500/20 text-red-300 px-5 py-2.5 rounded-lg text-sm">
                        <Lock size={16} /> You don't have permission to manage conventions.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {application.status === "validated_by_co_dept" && !isSigned && (
              <div className="border-t border-slate-700 pt-5 space-y-4">
                <h3 className="text-sm font-semibold text-white">Signature and Stamp</h3>
                <div className="flex flex-wrap gap-3">
                  {!isSigned && (
                    canSign ? (
                      <button onClick={handleSignatureClick} disabled={submitting} className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
                        <PenTool size={16} /> Sign agreement
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm">
                        <Lock size={14} /> Permission required to sign
                      </div>
                    )
                  )}
                  {!hasStamp && (
                    canAddStamp ? (
                      <button onClick={handleStampClick} disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
                        <Stamp size={16} /> Add stamp
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm">
                        <Lock size={14} /> Permission required for stamp
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

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
        </div>
      </div>
    </>
  );
};

// Main Component - CoDeptValidations
export default function CoDeptValidations() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [allApps, setAllApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApp, setSelectedApp] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  const [signatureStatuses, setSignatureStatuses] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(true);

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

  // Fetch user permissions
  const fetchUserPermissions = async () => {
    try {
      const response = await fetch(`${API}/auth/me/`, { headers: authHeaders() });
      const data = await response.json();
      if (data.success && data.user?.permissions) {
        setUserPermissions(data.user.permissions);
      }
    } catch (err) {
      console.error("Error fetching permissions:", err);
    }
  };

  // Fetch signature status for a convention
  const fetchSignatureStatus = async (appId) => {
    try {
      const res = await fetch(`${API}/signature/status/${appId}/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setSignatureStatuses(prev => ({
          ...prev,
          [appId]: data.university_signed || false
        }));
      }
    } catch (err) {
      console.error("Error fetching signature status:", err);
    }
  };

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // Fetch pending and validated conventions
      const pendingRes = await fetch(`${API}/co-dept/pending-validations/`, { headers: authHeaders() });
      const pendingData = await pendingRes.json();
      
      let allConventions = [];
      
      if (pendingData.success) {
        const appsWithUrl = (pendingData.applications || []).map((app) => ({
          ...app,
          convention_url: app.status === 'validated_by_co_dept'
            ? `/api/co-dept/download-convention/${app.id}/`
            : null
        }));
        allConventions = [...appsWithUrl];
        
        // Fetch signature statuses
        for (const app of appsWithUrl) {
          if (app.status === 'validated_by_co_dept') {
            await fetchSignatureStatus(app.id);
          }
        }
      }
      
      setAllApps(allConventions);
      
    } catch (err) {
      console.error("Error:", err);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchUserPermissions();
  }, []);

  // Calculate statistics
  const pendingApps = allApps.filter(a => a.status === 'accepted_by_company');
  const readyToSignApps = allApps.filter(a => a.status === 'validated_by_co_dept' && !signatureStatuses[a.id]);
  const signedApps = allApps.filter(a => a.status === 'validated_by_co_dept' && signatureStatuses[a.id]);

  const stats = {
    total: allApps.length,
    pending: pendingApps.length,
    readyToSign: readyToSignApps.length,
    signed: signedApps.length,
  };

  // Filter according to active tab
  const getCurrentApps = () => {
    switch (activeTab) {
      case 'pending':
        return pendingApps;
      case 'readyToSign':
        return readyToSignApps;
      case 'signed':
        return signedApps;
      default:
        return pendingApps;
    }
  };

  const currentApps = getCurrentApps();
  const counts = {
    pending: pendingApps.length,
    readyToSign: readyToSignApps.length,
    signed: signedApps.length,
  };

  const handleValidate = async (applicationId) => {
    if (userPermissions && userPermissions.can_manage_conventions === false) {
      const errorMsg = "You don't have permission to validate conventions. Please contact the Department Head.";
      setPermissionError(errorMsg);
      setTimeout(() => setPermissionError(null), 5000);
      toast.error(errorMsg);
      return;
    }

    try {
      const res = await fetch(`${API}/co-dept/validate-application/${applicationId}/`, {
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
        
        // ========== 🔥 DISPATCH EVENT FOR STATS UPDATE ==========
        // This event will be caught by AdminDashboard and ManageStudents to refresh stats
        window.dispatchEvent(new CustomEvent('placementStatsUpdated', { 
          detail: { 
            applicationId: applicationId,
            studentId: selectedApp?.student?.id,
            message: 'Student marked as placed successfully'
          } 
        }));
        console.log('📢 Event placementStatsUpdated dispatched for application:', applicationId);
        // ========================================================
        
      } else {
        toast.error(data.error || 'Error during validation');
      }
    } catch (err) {
      toast.error('Connection error');
    }
  };

  const handleReject = async (applicationId, reason) => {
    if (userPermissions && userPermissions.can_manage_conventions === false) {
      const errorMsg = "You don't have permission to reject conventions. Please contact the Department Head.";
      setPermissionError(errorMsg);
      setTimeout(() => setPermissionError(null), 5000);
      toast.error(errorMsg);
      return;
    }

    try {
      const res = await fetch(`${API}/co-dept/reject-application/${applicationId}/`, {
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

  return (
    <div className="min-h-screen flex">
      <AdminSidebarInline user={user} onLogout={handleLogout} />

      <div className="ml-64 flex-1 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate('/co-dept-head/dashboard')}
              className="flex items-center gap-2 text-white/70 hover:text-white transition"
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>
            <button onClick={toggleTheme} className="flex items-center gap-2 bg-purple-600/40 hover:bg-purple-600/60 text-white px-4 py-2 rounded-lg text-sm transition">
              {isDarkMode ? <SunIcon size={14} /> : <MoonIcon size={14} />}
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          {permissionError && (
            <div className="flex items-center gap-3 bg-orange-500/10 backdrop-blur-lg border border-orange-500/30 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
              <div>
                <p className="text-orange-300 font-medium">Permission denied</p>
                <p className="text-orange-400/80 text-sm">{permissionError}</p>
                <p className="text-orange-400/60 text-xs mt-1">💡 Please contact your Department Head to request the necessary permissions.</p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Convention Requests</h1>
            <p className="text-white/60">Manage internship agreements</p>
          </div>

          {/* Statistics Cards */}
          <StatsCards stats={stats} loading={loading} />

          {/* Three tabs */}
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
              onClick={() => setActiveTab('readyToSign')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === 'readyToSign'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              Ready to sign ({counts.readyToSign})
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

          {loading ? (
            <div className="flex items-center justify-center py-24 text-white/50">
              <Loader2 size={24} className="animate-spin mr-3" /> Loading conventions...
            </div>
          ) : currentApps.length === 0 ? (
            <div className="bg-white/5 rounded-xl p-16 text-center border border-white/10">
              <FileSignature size={48} className="mx-auto mb-3 text-white/20" />
              <p className="text-white/50">
                {activeTab === 'pending' ? 'No conventions pending validation.' : 
                 activeTab === 'readyToSign' ? 'No conventions ready to sign.' : 
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
                          <StatusBadge status={app.status} isSigned={activeTab === 'signed'} />
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

      
      {selectedApp && (
        <DetailsModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onValidate={handleValidate}
          onReject={handleReject}
          onAddSignature={handleAddSignature}
          onPermissionError={handlePermissionError}
          userPermissions={userPermissions}
        />
      )}

      <style>{`
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 768px) {
          .ml-64 {
            margin-left: 220px !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .flex.justify-between.items-center {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.75rem;
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
          .ml-64 {
            margin-left: 200px !important;
          }
          .stats-grid {
            grid-template-columns: 1fr !important;
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
          .ml-64 {
            margin-left: 180px !important;
          }
          .py-8 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .bg-white\\/10 {
          background: rgba(255, 255, 255, 0.9) !important;
          border-color: rgba(141, 35, 212, 0.25) !important;
        }
        body.light-mode .bg-white\\/10.backdrop-blur-lg {
          background: rgba(255, 255, 255, 0.95) !important;
        }
        body.light-mode .text-white,
        body.light-mode .text-white\\/50,
        body.light-mode .text-white\\/60,
        body.light-mode .text-white\\/70,
        body.light-mode .text-white\\/90 {
          color: #1a1a2e !important;
        }
        body.light-mode .text-white\\/40,
        body.light-mode .text-white\\/30,
        body.light-mode .text-white\\/20 {
          color: #999 !important;
        }
        body.light-mode .text-slate-300,
        body.light-mode .text-slate-400,
        body.light-mode .text-slate-500 {
          color: #666 !important;
        }
        body.light-mode .bg-slate-800 {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        body.light-mode .bg-slate-800/60 {
          background: rgba(0, 0, 0, 0.03) !important;
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
        body.light-mode .border-slate-700 {
          border-color: rgba(141, 35, 212, 0.15) !important;
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
        body.light-mode .bg-green-500/10 {
          background: rgba(5, 150, 105, 0.1) !important;
        }
        body.light-mode .bg-yellow-500/20 {
          background: rgba(217, 119, 6, 0.1) !important;
        }
        body.light-mode .bg-purple-500/20 {
          background: rgba(141, 35, 212, 0.1) !important;
        }
        body.light-mode .bg-red-500/20 {
          background: rgba(220, 38, 38, 0.1) !important;
        }
        body.light-mode .bg-orange-500/10 {
          background: rgba(249, 115, 22, 0.1) !important;
        }
        body.light-mode .text-green-300 {
          color: #059669 !important;
        }
        body.light-mode .text-yellow-300 {
          color: #d97706 !important;
        }
        body.light-mode .text-purple-300 {
          color: #8D23D4 !important;
        }
        body.light-mode .text-red-300 {
          color: #dc2626 !important;
        }
        body.light-mode .text-orange-300 {
          color: #ea580c !important;
        }
        body.light-mode .bg-green-600 {
          background: #059669 !important;
        }
        body.light-mode .bg-purple-600 {
          background: #8D23D4 !important;
        }
        body.light-mode .bg-indigo-600 {
          background: #8D23D4 !important;
        }
        body.light-mode .bg-blue-600 {
          background: #2563eb !important;
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
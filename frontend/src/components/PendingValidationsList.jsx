// frontend/src/components/PendingValidationsList.jsx
import React, { useState, useEffect } from "react";
import {
  Eye,
  FileText,
  Building2,
  GraduationCap,
  MapPin,
  Calendar,
  Code,
  Mail,
  User,
  BookOpen,
  Award,
  Github,
  Globe,
  Loader2,
  AlertCircle,
  X,
  PenTool,
  Download,
  Stamp,
  CheckCircle,
  XCircle,
  FileSignature,
  Clock,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import SignaturePad from "./SignaturePad";
import StampPad from "./StampPad";

const API = "https://pfe-l31r.onrender.com/api";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

// StatusBadge component
function StatusBadge({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case "accepted_by_company":
        return { label: "Pending validation", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
      case "validated_by_co_dept":
        return { label: "Validated - Ready to sign", color: "bg-purple-500/20 text-purple-300 border-purple-500/30" };
      case "rejected_by_co_dept":
        return { label: "Rejected", color: "bg-red-500/20 text-red-300 border-red-500/30" };
      case "fully_signed":
        return { label: "Fully signed", color: "bg-green-500/20 text-green-300 border-green-500/30" };
      default:
        return { label: status || "Pending", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" };
    }
  };
  
  const config = getStatusConfig();
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
      {config.label}
    </span>
  );
}

// DonutChart component - same as dashboard
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
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
};

// StatsCards component - same style as dashboard
const StatsCards = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stats-card-skeleton">
            <div className="stats-card-skeleton-content"></div>
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
  ];

  return (
    <div className="stats-cards-grid">
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
              <div className="stats-card-chart-container">
                <DonutChart
                  percentage={config.percentage}
                  color={config.color}
                  trackColor={config.trackColor}
                  size={100}
                  stroke={10}
                />
                <div className="stats-card-chart-value">
                  <span className="stats-card-chart-number">{config.value}</span>
                </div>
              </div>
            </div>

            <div className="stats-card-legend">
              <div className="stats-card-legend-item">
                <span className="stats-card-legend-dot" style={{ background: config.color }} />
                <span className="stats-card-legend-label">{config.title}</span>
              </div>
              <div className="stats-card-legend-item">
                <span className="stats-card-legend-dot" style={{ background: config.trackColor }} />
                <span className="stats-card-legend-label">Remaining</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// DetailsModal component
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
    } catch (err) {
      // Error already handled in parent
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
      // Error already handled in parent
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

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div>
              <h2 className="modal-title">{application.offer?.title || "N/A"}</h2>
              <p className="modal-subtitle">
                Application by <span className="modal-subtitle-name">{application.student?.full_name || "N/A"}</span>
              </p>
            </div>
            <div className="modal-header-right">
              <StatusBadge status={application.status} />
              <button onClick={onClose} className="modal-close">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="modal-body">
            {/* Offer Info */}
            <div className="offer-info-grid">
              <div className="offer-info-card">
                <p className="offer-info-label">Type</p>
                <p className="offer-info-value">{application.offer?.internship_type || "—"}</p>
              </div>
              <div className="offer-info-card">
                <p className="offer-info-label">Wilaya</p>
                <p className="offer-info-value">{application.offer?.wilaya || "—"}</p>
              </div>
              <div className="offer-info-card">
                <p className="offer-info-label">Duration</p>
                <p className="offer-info-value">{application.offer?.duration || "—"}</p>
              </div>
            </div>

            {/* Student Profile */}
            <div className="student-profile-card">
              <h3 className="student-profile-title">
                <User size={15} /> Student Profile
              </h3>
              <div className="student-profile-info">
                <div className="student-profile-row"><Mail size={14} />{application.student?.email || "—"}</div>
                <div className="student-profile-row"><MapPin size={14} />{application.student?.wilaya || "—"}</div>
                <div className="student-profile-row"><BookOpen size={14} />{application.student?.university || "—"}</div>
                <div className="student-profile-row"><Award size={14} />{application.student?.major || "—"} · {application.student?.education_level || "—"}</div>
                <div className="student-profile-row"><Calendar size={14} />Graduation: {application.student?.graduation_year || "—"}</div>
              </div>
              {application.student?.skills?.length > 0 && (
                <div className="student-skills">
                  <p className="student-skills-label">Skills</p>
                  <div className="student-skills-list">
                    {application.student.skills.map((s) => (
                      <span key={s} className="student-skill-tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CV */}
            {application.cv_file_url && (
              <div className="cv-card">
                <h3 className="cv-title">
                  <FileText size={15} /> CV
                </h3>
                {!cvUrl && !loadingCv && (
                  <button onClick={loadCv} className="cv-load-btn">Load CV</button>
                )}
                {loadingCv && <p className="cv-loading">Loading...</p>}
                {cvUrl && <iframe src={cvUrl} title="CV" className="cv-iframe" />}
              </div>
            )}

            {/* Convention PDF */}
            {application.status === "validated_by_co_dept" && application.convention_url && (
              <div className="convention-card">
                <h3 className="convention-title">
                  <FileText size={15} /> Internship Agreement
                </h3>
                {!conventionUrl && !loadingConvention && (
                  <button onClick={loadConvention} className="convention-load-btn">Load agreement</button>
                )}
                {loadingConvention && <p className="convention-loading">Loading...</p>}
                {conventionUrl && (
                  <>
                    <iframe src={conventionUrl} title="Convention" className="convention-iframe" />
                    <button onClick={handleDownloadConvention} className="convention-download-btn">
                      <Download size={14} /> Download agreement
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Rejection reason */}
            {application.status === "rejected_by_co_dept" && application.co_dept_notes && (
              <div className="rejection-card">
                <p className="rejection-label">Rejection reason</p>
                <p className="rejection-text">{application.co_dept_notes}</p>
              </div>
            )}

            {/* Validation/Rejection Actions */}
            {application.status === "accepted_by_company" && (
              <div className="actions-section">
                {showRejectForm ? (
                  <div className="reject-form">
                    <p className="reject-form-title">Rejection reason <span className="reject-form-required">*</span></p>
                    <textarea
                      className="reject-form-textarea"
                      placeholder="Explain why this request is being rejected..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <div className="reject-form-actions">
                      <button onClick={handleRejectSubmit} disabled={submitting} className="reject-confirm-btn">
                        {submitting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                        Confirm rejection
                      </button>
                      <button onClick={() => { setShowRejectForm(false); setRejectReason(""); }} className="reject-cancel-btn">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="action-buttons">
                    <button onClick={handleValidate} disabled={submitting} className="validate-btn">
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={16} />}
                      Validate and generate agreement
                    </button>
                    <button onClick={() => setShowRejectForm(true)} className="reject-btn">
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Signature & Stamp Actions */}
            {application.status === "validated_by_co_dept" && (
              <div className="signature-section">
                <h3 className="signature-title">Signature and Stamp</h3>
                <div className="signature-buttons">
                  {!isSigned && (
                    <button onClick={() => setShowSignatureModal(true)} disabled={submitting} className="signature-btn">
                      <PenTool size={16} /> Sign agreement
                    </button>
                  )}
                  {!hasStamp && (
                    <button onClick={() => setShowStampModal(true)} disabled={submitting} className="stamp-btn">
                      <Stamp size={16} /> Add stamp
                    </button>
                  )}
                </div>
                {isSigned && (
                  <div className="signature-success">
                    <p className="signature-success-text">✅ Signature added</p>
                  </div>
                )}
                {hasStamp && (
                  <div className="stamp-success">
                    <p className="stamp-success-text">🏛️ Stamp added</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 50;
        }
        .modal-container {
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 16px;
          width: 100%;
          max-width: 672px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-header {
          position: sticky;
          top: 0;
          background: #1e293b;
          border-bottom: 1px solid #475569;
          padding: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }
        .modal-subtitle {
          color: #94a3b8;
          font-size: 0.875rem;
          margin-top: 4px;
        }
        .modal-subtitle-name {
          color: white;
          font-weight: 500;
        }
        .modal-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .modal-close {
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          transition: color 0.2s;
        }
        .modal-close:hover {
          color: white;
        }
        .modal-body {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        
        /* Offer Info */
        .offer-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .offer-info-card {
          background: #1e293b;
          border-radius: 8px;
          padding: 12px;
        }
        .offer-info-label {
          font-size: 0.7rem;
          color: #64748b;
          margin-bottom: 4px;
        }
        .offer-info-value {
          font-size: 0.875rem;
          color: white;
          font-weight: 500;
        }
        
        /* Student Profile */
        .student-profile-card {
          background: rgba(51, 65, 85, 0.6);
          border-radius: 12px;
          padding: 20px;
        }
        .student-profile-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .student-profile-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.875rem;
        }
        .student-profile-row {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #cbd5e1;
        }
        .student-profile-row svg {
          color: #64748b;
        }
        .student-skills {
          margin-top: 16px;
        }
        .student-skills-label {
          font-size: 0.7rem;
          color: #64748b;
          margin-bottom: 8px;
        }
        .student-skills-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .student-skill-tag {
          background: rgba(99, 102, 241, 0.6);
          color: #c7d2fe;
          font-size: 0.7rem;
          padding: 4px 10px;
          border-radius: 20px;
        }
        
        /* CV Section */
        .cv-card {
          background: rgba(51, 65, 85, 0.6);
          border-radius: 12px;
          padding: 20px;
        }
        .cv-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cv-load-btn {
          background: #4f46e5;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          color: white;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .cv-load-btn:hover {
          background: #6366f1;
        }
        .cv-loading {
          color: #94a3b8;
          font-size: 0.875rem;
        }
        .cv-iframe {
          width: 100%;
          height: 384px;
          border-radius: 8px;
          border: 1px solid #475569;
          margin-top: 12px;
        }
        
        /* Convention Section */
        .convention-card {
          background: rgba(51, 65, 85, 0.6);
          border-radius: 12px;
          padding: 20px;
        }
        .convention-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #86efac;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .convention-load-btn {
          background: #16a34a;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          color: white;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .convention-load-btn:hover {
          background: #22c55e;
        }
        .convention-loading {
          color: #86efac;
          font-size: 0.875rem;
        }
        .convention-iframe {
          width: 100%;
          height: 384px;
          border-radius: 8px;
          border: 1px solid #22c55e;
          margin-top: 12px;
        }
        .convention-download-btn {
          margin-top: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          background: #16a34a;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          color: white;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
        }
        .convention-download-btn:hover {
          background: #22c55e;
        }
        
        /* Rejection Card */
        .rejection-card {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 16px;
        }
        .rejection-label {
          font-size: 0.7rem;
          color: #f87171;
          font-weight: 600;
          margin-bottom: 4px;
        }
        .rejection-text {
          font-size: 0.875rem;
          color: #fca5a5;
        }
        
        /* Action Buttons */
        .actions-section {
          border-top: 1px solid #475569;
          padding-top: 20px;
        }
        .reject-form {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 16px;
        }
        .reject-form-title {
          color: #fca5a5;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 12px;
        }
        .reject-form-required {
          color: #f87171;
        }
        .reject-form-textarea {
          width: 100%;
          background: #1e293b;
          border: 1px solid #475569;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.875rem;
          color: white;
          resize: none;
          min-height: 80px;
          margin-bottom: 12px;
          outline: none;
        }
        .reject-form-textarea:focus {
          border-color: #f87171;
        }
        .reject-form-actions {
          display: flex;
          gap: 12px;
        }
        .reject-confirm-btn {
          background: #dc2626;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .reject-confirm-btn:hover:not(:disabled) {
          background: #ef4444;
        }
        .reject-confirm-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .reject-cancel-btn {
          background: transparent;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 0.875rem;
          color: #94a3b8;
          border: none;
          cursor: pointer;
          transition: color 0.2s;
        }
        .reject-cancel-btn:hover {
          color: white;
        }
        .action-buttons {
          display: flex;
          gap: 12px;
        }
        .validate-btn {
          background: #16a34a;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .validate-btn:hover:not(:disabled) {
          background: #22c55e;
        }
        .validate-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .reject-btn {
          background: rgba(220, 38, 38, 0.2);
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #fca5a5;
          border: 1px solid rgba(220, 38, 38, 0.3);
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .reject-btn:hover {
          background: rgba(220, 38, 38, 0.3);
        }
        
        /* Signature Section */
        .signature-section {
          border-top: 1px solid #475569;
          padding-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .signature-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
        }
        .signature-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .signature-btn {
          background: #9333ea;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .signature-btn:hover:not(:disabled) {
          background: #a855f7;
        }
        .stamp-btn {
          background: #2563eb;
          padding: 8px 20px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          border: none;
          cursor: pointer;
          transition: background 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stamp-btn:hover:not(:disabled) {
          background: #3b82f6;
        }
        .signature-success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 12px;
          padding: 16px;
        }
        .signature-success-text {
          color: #4ade80;
          font-size: 0.875rem;
          font-weight: 500;
        }
        .stamp-success {
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.3);
          border-radius: 12px;
          padding: 16px;
        }
        .stamp-success-text {
          color: #60a5fa;
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 768px) {
          .offer-info-grid {
            grid-template-columns: 1fr;
          }
          .action-buttons {
            flex-direction: column;
          }
          .signature-buttons {
            flex-direction: column;
          }
          .reject-form-actions {
            flex-direction: column;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .modal-container {
          background: white;
          border-color: #e2e8f0;
        }
        body.light-mode .modal-header {
          background: white;
          border-color: #e2e8f0;
        }
        body.light-mode .modal-title {
          color: #1a1a2e;
        }
        body.light-mode .modal-subtitle {
          color: #64748b;
        }
        body.light-mode .modal-subtitle-name {
          color: #1a1a2e;
        }
        body.light-mode .modal-close {
          color: #94a3b8;
        }
        body.light-mode .modal-close:hover {
          color: #1a1a2e;
        }
        body.light-mode .offer-info-card {
          background: #f8fafc;
        }
        body.light-mode .offer-info-value {
          color: #1a1a2e;
        }
        body.light-mode .student-profile-card {
          background: #f8fafc;
        }
        body.light-mode .student-profile-title {
          color: #334155;
        }
        body.light-mode .student-profile-row {
          color: #334155;
        }
        body.light-mode .student-skill-tag {
          background: rgba(99, 102, 241, 0.1);
          color: #4f46e5;
        }
        body.light-mode .cv-card {
          background: #f8fafc;
        }
        body.light-mode .cv-title {
          color: #334155;
        }
        body.light-mode .convention-card {
          background: #f8fafc;
        }
        body.light-mode .convention-title {
          color: #059669;
        }
        body.light-mode .reject-form-textarea {
          background: #f8fafc;
          color: #1a1a2e;
          border-color: #cbd5e1;
        }
        body.light-mode .reject-cancel-btn {
          color: #64748b;
        }
        body.light-mode .reject-cancel-btn:hover {
          color: #1a1a2e;
        }
        body.light-mode .modal-close {
          color: #94a3b8;
        }
      `}</style>
    </>
  );
};

// Main PendingValidationsList component
export default function PendingValidationsList({
  fetchEndpoint,
  validateEndpoint,
  rejectEndpoint,
  downloadConventionEndpoint = "co-dept",
  title = "Convention Validations",
  emptyMessage = "No pending conventions",
  onPermissionError,
}) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [filter, setFilter] = useState("all");

  // Calculate statistics
  const stats = {
    total: applications.length,
    pending: applications.filter((a) => a.status === "accepted_by_company").length,
    validated: applications.filter((a) => a.status === "validated_by_co_dept").length,
    rejected: applications.filter((a) => a.status === "rejected_by_co_dept").length,
  };

  const fetchPendingValidations = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}${fetchEndpoint}`, { headers: authHeaders() });
      const data = await response.json();
      if (data.success) {
        const appsWithUrl = (data.applications || []).map((app) => ({
          ...app,
          convention_url: app.status === "validated_by_co_dept"
            ? app.convention_url || `/api/${downloadConventionEndpoint}/download-convention/${app.id}/`
            : null,
        }));
        setApplications(appsWithUrl);
      } else {
        toast.error(data.error || "Error loading applications");
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingValidations();
  }, []);

  const handleValidate = async (applicationId) => {
    try {
      const response = await fetch(`${API}${validateEndpoint}${applicationId}/`, {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await response.json();

      if (response.status === 403) {
        const errorMsg = "You don't have permission to validate this convention.";
        if (onPermissionError) onPermissionError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (data.success) {
        toast.success("Convention validated and generated successfully!");
        await fetchPendingValidations();
        setSelectedApp(null);
      } else {
        toast.error(data.error || "Error during validation");
      }
    } catch (err) {
      console.error("Validation error:", err);
      toast.error("Connection error");
    }
  };

  const handleReject = async (applicationId, reason) => {
    try {
      const response = await fetch(`${API}${rejectEndpoint}${applicationId}/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ rejection_reason: reason }),
      });
      const data = await response.json();

      if (response.status === 403) {
        const errorMsg = "You don't have permission to reject this convention.";
        if (onPermissionError) onPermissionError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      if (data.success) {
        toast.success("Application rejected");
        await fetchPendingValidations();
        setSelectedApp(null);
      } else {
        toast.error(data.error || "Error during rejection");
      }
    } catch (err) {
      console.error("Rejection error:", err);
      toast.error("Connection error");
    }
  };

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  return (
    <div>
      {/* Stats Cards with Donut Charts - same style as dashboard */}
      <StatsCards stats={stats} loading={loading} />

      {/* Filter buttons */}
      <div className="filter-container">
        <button
          onClick={() => setFilter("all")}
          className={`filter-btn ${filter === "all" ? "active" : ""}`}
        >
          All ({stats.total})
        </button>
        <button
          onClick={() => setFilter("accepted_by_company")}
          className={`filter-btn pending ${filter === "accepted_by_company" ? "active" : ""}`}
        >
          Pending ({stats.pending})
        </button>
        <button
          onClick={() => setFilter("validated_by_co_dept")}
          className={`filter-btn validated ${filter === "validated_by_co_dept" ? "active" : ""}`}
        >
          Validated ({stats.validated})
        </button>
        <button
          onClick={() => setFilter("rejected_by_co_dept")}
          className={`filter-btn rejected ${filter === "rejected_by_co_dept" ? "active" : ""}`}
        >
          Rejected ({stats.rejected})
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <Loader2 size={32} className="loading-spinner" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-container">
          <FileSignature size={48} className="empty-icon" />
          <p className="empty-text">{emptyMessage}</p>
        </div>
      ) : (
        <div className="table-container">
          <div className="table-wrapper">
            <table className="applications-table">
              <thead className="table-header">
                <tr>
                  <th className="table-cell">Student</th>
                  <th className="table-cell">Offer</th>
                  <th className="table-cell">Company</th>
                  <th className="table-cell">Date</th>
                  <th className="table-cell">Status</th>
                  <th className="table-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filtered.map((app) => (
                  <tr key={app.id} className="table-row">
                    <td className="table-cell">
                      <p className="student-name">{app.student?.full_name || "N/A"}</p>
                      <p className="student-email">{app.student?.email || "N/A"}</p>
                    </td>
                    <td className="table-cell">
                      <p className="offer-title">{app.offer?.title || "N/A"}</p>
                      <p className="offer-type">{app.offer?.internship_type || "N/A"}</p>
                    </td>
                    <td className="table-cell">
                      <p className="company-name">{app.company?.company_name || "N/A"}</p>
                      <p className="company-location">{app.company?.location || "N/A"}</p>
                    </td>
                    <td className="table-cell date-cell">
                      {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="table-cell">
                      <button onClick={() => setSelectedApp(app)} className="details-btn">
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

      {selectedApp && (
        <DetailsModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onValidate={handleValidate}
          onReject={handleReject}
          onAddSignature={fetchPendingValidations}
          onPermissionError={onPermissionError}
        />
      )}

      <style>{`
        /* ===== PENDING VALIDATIONS LIST STYLES ===== */
        
        /* Stats Cards Grid */
        .stats-cards-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin-bottom: 32px;
        }
        .stats-card {
          background: rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 16px;
          padding: 20px;
          transition: all 0.3s ease;
        }
        .stats-card:hover {
          border-color: rgba(139, 92, 246, 0.5);
        }
        .stats-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .stats-card-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.6);
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
        .stats-card-chart-container {
          position: relative;
        }
        .stats-card-chart-value {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .stats-card-chart-number {
          font-size: 1.5rem;
          font-weight: 800;
          color: white;
          line-height: 1;
        }
        .stats-card-legend {
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        .stats-card-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .stats-card-legend-dot {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          display: inline-block;
        }
        .stats-card-legend-label {
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.55);
        }
        .stats-card-skeleton {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 20px;
          animation: pulse 1.5s infinite;
        }
        .stats-card-skeleton-content {
          height: 120px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 8px;
        }
        
        /* Filter Buttons */
        .filter-container {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
          padding: 16px 16px 0 16px;
          background: rgba(255, 255, 255, 0.05);
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
        }
        .filter-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.5);
          border: none;
          cursor: pointer;
        }
        .filter-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .filter-btn.active {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        .filter-btn.pending.active {
          background: #ca8a04;
        }
        .filter-btn.validated.active {
          background: #9333ea;
        }
        .filter-btn.rejected.active {
          background: #dc2626;
        }
        
        /* Loading & Empty States */
        .loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          background: rgba(255, 255, 255, 0.05);
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .loading-spinner {
          animation: spin 1s linear infinite;
          color: #a855f7;
        }
        .empty-container {
          padding: 64px;
          text-align: center;
          background: rgba(255, 255, 255, 0.05);
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
        }
        .empty-icon {
          margin: 0 auto 12px;
          color: rgba(255, 255, 255, 0.2);
        }
        .empty-text {
          color: rgba(255, 255, 255, 0.5);
        }
        
        /* Table Styles */
        .table-container {
          background: rgba(255, 255, 255, 0.05);
          border-bottom-left-radius: 12px;
          border-bottom-right-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }
        .table-wrapper {
          overflow-x: auto;
        }
        .applications-table {
          width: 100%;
          font-size: 0.875rem;
        }
        .table-header {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.7rem;
          text-transform: uppercase;
        }
        .table-cell {
          padding: 12px 16px;
          text-align: left;
        }
        .table-body .table-row {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: background 0.2s;
        }
        .table-body .table-row:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .student-name {
          font-weight: 600;
          color: white;
          margin: 0;
        }
        .student-email {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.7rem;
          margin: 0;
        }
        .offer-title {
          color: white;
          margin: 0;
        }
        .offer-type {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.7rem;
          margin: 0;
        }
        .company-name {
          color: white;
          margin: 0;
        }
        .company-location {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.7rem;
          margin: 0;
        }
        .date-cell {
          color: rgba(255, 255, 255, 0.6);
        }
        .details-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #818cf8;
          font-size: 0.7rem;
          font-weight: 500;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 0.2s;
        }
        .details-btn:hover {
          color: #a78bfa;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        /* Responsive */
        @media (max-width: 1024px) {
          .stats-cards-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .stats-cards-grid {
            grid-template-columns: 1fr;
          }
          .filter-container {
            justify-content: center;
          }
        }
        
        /* Light Mode */
        body.light-mode .stats-card {
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(141, 35, 212, 0.25);
        }
        body.light-mode .stats-card-title {
          color: #1a1a2e;
        }
        body.light-mode .stats-card-legend-label {
          color: #666;
        }
        body.light-mode .stats-card-chart-number {
          color: #1a1a2e;
        }
        body.light-mode .filter-container {
          background: rgba(141, 35, 212, 0.05);
        }
        body.light-mode .filter-btn {
          background: rgba(141, 35, 212, 0.08);
          color: #555;
        }
        body.light-mode .filter-btn:hover {
          background: rgba(141, 35, 212, 0.15);
          color: #1a1a2e;
        }
        body.light-mode .filter-btn.active {
          background: rgba(141, 35, 212, 0.2);
          color: #1a1a2e;
        }
        body.light-mode .table-container {
          background: rgba(255, 255, 255, 0.9);
          border-color: rgba(141, 35, 212, 0.2);
        }
        body.light-mode .student-name,
        body.light-mode .offer-title,
        body.light-mode .company-name {
          color: #1a1a2e;
        }
        body.light-mode .student-email,
        body.light-mode .offer-type,
        body.light-mode .company-location,
        body.light-mode .date-cell {
          color: #666;
        }
        body.light-mode .table-header {
          background: rgba(141, 35, 212, 0.08);
          color: #666;
        }
        body.light-mode .table-body .table-row:hover {
          background: rgba(141, 35, 212, 0.05);
        }
        body.light-mode .empty-container {
          background: rgba(255, 255, 255, 0.9);
        }
        body.light-mode .empty-text {
          color: #666;
        }
        body.light-mode .empty-icon {
          color: #ccc;
        }
      `}</style>
    </div>
  );
}
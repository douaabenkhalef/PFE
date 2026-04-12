// frontend/src/components/PendingValidationsList.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, CheckCircle, XCircle, Eye, FileText, 
  Building2, GraduationCap, MapPin, Calendar, Code,
  Mail, User, BookOpen, Award, Github, Globe,
  ArrowLeft, Loader2, AlertCircle, CheckCircle2, X,
  PenTool, Download, Stamp
} from 'lucide-react';
import toast from 'react-hot-toast';
import SignaturePad from './SignaturePad';
import StampPad from './StampPad';

const API = 'http://localhost:8000/api';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

const StatusBadge = ({ status }) => {
  const statusMap = {
    'pending': { label: 'En attente entreprise', color: 'bg-yellow-500/20 text-yellow-300' },
    'accepted_by_company': { label: 'Accepté par entreprise', color: 'bg-blue-500/20 text-blue-300' },
    'validated_by_co_dept': { label: 'Validé - En attente signature', color: 'bg-purple-500/20 text-purple-300' },
    'rejected_by_co_dept': { label: 'Refusé', color: 'bg-red-500/20 text-red-300' },
    'rejected_by_company': { label: 'Refusé par entreprise', color: 'bg-red-500/20 text-red-300' },
    'fully_signed': { label: 'Complètement signé', color: 'bg-green-500/20 text-green-300' }
  };
  const s = statusMap[status] || { label: status, color: 'bg-gray-500/20 text-gray-300' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
      {s.label}
    </span>
  );
};

const InlineFormError = ({ messages, onClose }) => {
  if (!messages || messages.length === 0) return null;
  const messageArray = Array.isArray(messages) ? messages : [messages];
  
  const isPermissionError = messageArray.some(msg => 
    msg?.toLowerCase().includes('permission') || 
    msg?.toLowerCase().includes('pas les droits') ||
    msg?.toLowerCase().includes('pas autorisé') ||
    msg?.toLowerCase().includes('non autorisé')
  );
  
  return (
    <div className={`rounded-lg p-4 mb-4 ${
      isPermissionError 
        ? 'bg-orange-500/10 border border-orange-500/30' 
        : 'bg-red-500/10 border border-red-500/30'
    }`}>
      <div className="flex items-start gap-3">
        {isPermissionError ? (
          <ShieldIcon className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          {messageArray.map((msg, index) => (
            <p key={index} className={`text-sm ${isPermissionError ? 'text-orange-300' : 'text-red-300'}`}>
              {msg}
            </p>
          ))}
          {isPermissionError && (
            <p className="text-orange-300/70 text-xs mt-2">
              💡 Veuillez contacter votre Department Head pour demander les permissions nécessaires.
            </p>
          )}
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className={`${isPermissionError ? 'text-orange-400/70 hover:text-orange-300' : 'text-red-400/70 hover:text-red-300'} transition ml-2`}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

// Helper icon component
const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 8v4" />
    <circle cx="12" cy="16" r="0.5" fill="currentColor" />
  </svg>
);

const DetailsModal = ({ 
  application, 
  onClose, 
  onValidate, 
  onReject, 
  onAddSignature, 
  initialSignatureStatus, 
  initialStampStatus,
  onPermissionError
}) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showStampModal, setShowStampModal] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [cvUrl, setCvUrl] = useState(null);
  const [loadingCv, setLoadingCv] = useState(false);
  const [conventionUrl, setConventionUrl] = useState(null);
  const [loadingConvention, setLoadingConvention] = useState(false);
  const [signatureInfo, setSignatureInfo] = useState(initialSignatureStatus || {
    university_signed: false,
    university_signed_by: null,
    university_signature_date: null
  });
  const [stampInfo, setStampInfo] = useState(initialStampStatus || {
    has_stamp: false,
    stamp_added_by: null,
    stamp_date: null
  });

  const showError = (errorMsg) => {
    console.log("🔴 showError called:", errorMsg);
    setModalError(errorMsg);
    setTimeout(() => setModalError(null), 5000);
    if (onPermissionError) {
      console.log("🔴 Calling onPermissionError from showError");
      onPermissionError(errorMsg);
    }
  };

  useEffect(() => {
    checkSignatureStatus();
    checkStampStatus();
    if (application.status === 'validated_by_co_dept' && application.convention_url) {
      loadConvention();
    }
  }, []);

  const checkSignatureStatus = async () => {
    try {
      const res = await fetch(`${API}/signature/status/${application.id}/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setSignatureInfo({
          university_signed: data.university_signed,
          university_signed_by: data.university_signed_by,
          university_signature_date: data.university_signature_date,
          company_signed: data.company_signed,
          student_signed: data.student_signed,
          signature_status: data.signature_status
        });
      }
    } catch (err) {
      console.error("Erreur chargement statut signature:", err);
    }
  };

  const checkStampStatus = async () => {
    try {
      const res = await fetch(`${API}/stamp/status/${application.id}/`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        setStampInfo({
          has_stamp: data.has_stamp,
          stamp_added_by: data.stamp_added_by,
          stamp_date: data.stamp_date
        });
      }
    } catch (err) {
      console.error("Erreur chargement statut cachet:", err);
    }
  };

  const loadCV = async () => {
    if (!application.cv_file_url) return;
    setLoadingCv(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000${application.cv_file_url}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setCvUrl(url);
    } catch (err) {
      toast.error('Erreur lors du chargement du CV');
    } finally {
      setLoadingCv(false);
    }
  };

  const loadConvention = async () => {
    if (!application.convention_url) return;
    setLoadingConvention(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000${application.convention_url}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        console.log("Convention non encore disponible");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setConventionUrl(url);
    } catch (err) {
      console.error("Erreur lors du chargement de la convention:", err);
    } finally {
      setLoadingConvention(false);
    }
  };

  const handleValidate = async () => {
    console.log("🔵 handleValidate called in DetailsModal");
    setModalError(null);
    setSubmitting(true);
    try {
      await onValidate(application.id);
    } catch (err) {
      console.log("🔴 Error caught in handleValidate:", err.message);
      showError(err.message || "Vous n'avez pas les permissions pour valider cette convention.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      showError('Veuillez entrer une raison de refus');
      return;
    }
    setModalError(null);
    setSubmitting(true);
    try {
      await onReject(application.id, rejectReason);
    } catch (err) {
      showError(err.message || "Vous n'avez pas les permissions pour refuser cette convention.");
    } finally {
      setSubmitting(false);
      setShowRejectForm(false);
      setRejectReason('');
    }
  };

  const handleSignatureSave = async (signatureData) => {
    setModalError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/signature/university/${application.id}/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ signature: signatureData })
      });
      const data = await res.json();
      
      if (res.status === 403) {
        const errorMsg = data.error || data.detail || "Vous n'avez pas les permissions pour signer cette convention. Veuillez contacter le Department Head.";
        console.log("🔴 Signature permission error:", errorMsg);
        showError(errorMsg);
        setShowSignatureModal(false);
        return;
      }
      
      if (data.success) {
        toast.success('Signature ajoutée avec succès !');
        setShowSignatureModal(false);
        setSignatureInfo({
          university_signed: true,
          university_signed_by: data.signed_by || 'Université',
          university_signature_date: new Date().toLocaleString()
        });
        setTimeout(() => loadConvention(), 1000);
        if (onAddSignature) onAddSignature();
      } else {
        showError(data.error || 'Erreur lors de l\'ajout de la signature');
      }
    } catch (err) {
      showError('Erreur de connexion au serveur');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStampSave = async (stampData) => {
    setModalError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/stamp/university/${application.id}/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ stamp: stampData })
      });
      const data = await res.json();
      
      if (res.status === 403) {
        const errorMsg = data.error || data.detail || "Vous n'avez pas les permissions pour ajouter le cachet. Veuillez contacter le Department Head.";
        console.log("🔴 Stamp permission error:", errorMsg);
        showError(errorMsg);
        setShowStampModal(false);
        return;
      }
      
      if (data.success) {
        toast.success('Cachet ajouté avec succès !');
        setShowStampModal(false);
        setStampInfo({
          has_stamp: true,
          stamp_added_by: data.added_by,
          stamp_date: new Date().toLocaleString()
        });
        setTimeout(() => loadConvention(), 1000);
        if (onAddSignature) onAddSignature();
      } else {
        showError(data.error || 'Erreur lors de l\'ajout du cachet');
      }
    } catch (err) {
      showError('Erreur de connexion au serveur');
    } finally {
      setSubmitting(false);
    }
  };

  const isSigned = signatureInfo.university_signed;
  const hasStamp = stampInfo.has_stamp;

  return (
    <>
      {showSignatureModal && (
        <SignaturePad onSave={handleSignatureSave} onClose={() => setShowSignatureModal(false)} title="Signature de l'université" />
      )}
      {showStampModal && (
        <StampPad onSave={handleStampSave} onClose={() => setShowStampModal(false)} title="Cachet officiel de l'université" />
      )}

      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-[#1e293b] border-b border-slate-700 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white">{application.offer.title}</h2>
                <p className="text-slate-400 text-sm mt-1">Candidature de <span className="text-white font-medium">{application.student.full_name}</span></p>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={24} /></button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <StatusBadge status={application.status} />
              {isSigned && <StatusBadge status="fully_signed" />}
              {hasStamp && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300">Cachet apposé</span>}
            </div>
          </div>

          <div className="p-6 space-y-6">
            <InlineFormError messages={modalError} onClose={() => setModalError(null)} />

            {/* Infos offre */}
            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 size={15} /> Offre de stage
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-xs text-slate-500">Entreprise</p><p className="text-sm text-white font-medium">{application.company.company_name}</p></div>
                <div><p className="text-xs text-slate-500">Wilaya</p><p className="text-sm text-white">{application.offer.wilaya}</p></div>
                <div><p className="text-xs text-slate-500">Type</p><p className="text-sm text-white">{application.offer.internship_type}</p></div>
                <div><p className="text-xs text-slate-500">Durée</p><p className="text-sm text-white">{application.offer.duration}</p></div>
              </div>
              <div className="mt-4"><p className="text-xs text-slate-500 mb-2">Description</p><p className="text-sm text-slate-300">{application.offer.description}</p></div>
              {application.offer.required_skills?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Code size={12} /> Compétences requises</p>
                  <div className="flex flex-wrap gap-2">
                    {application.offer.required_skills.map(skill => (
                      <span key={skill} className="bg-indigo-900/60 text-indigo-300 text-xs px-2.5 py-1 rounded-full">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Infos étudiant */}
            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <GraduationCap size={15} /> Profil étudiant
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2"><User size={14} className="text-slate-500" /><span className="text-white">{application.student.full_name}</span></div>
                <div className="flex items-center gap-2"><Mail size={14} className="text-slate-500" /><span className="text-white">{application.student.email}</span></div>
                <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-500" /><span className="text-white">{application.student.wilaya}</span></div>
                <div className="flex items-center gap-2"><BookOpen size={14} className="text-slate-500" /><span className="text-white">{application.student.university}</span></div>
                <div className="flex items-center gap-2"><Award size={14} className="text-slate-500" /><span className="text-white">{application.student.major} - {application.student.education_level}</span></div>
                <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-500" /><span className="text-white">Promotion {application.student.graduation_year}</span></div>
              </div>
              {application.student.skills?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Code size={12} /> Compétences</p>
                  <div className="flex flex-wrap gap-2">
                    {application.student.skills.map(skill => (
                      <span key={skill} className="bg-purple-900/60 text-purple-300 text-xs px-2.5 py-1 rounded-full">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              {(application.student.github || application.student.portfolio) && (
                <div className="mt-4 flex gap-4">
                  {application.student.github && <a href={application.student.github} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 text-sm hover:underline"><Github size={14} /> GitHub</a>}
                  {application.student.portfolio && <a href={application.student.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 text-sm hover:underline"><Globe size={14} /> Portfolio</a>}
                </div>
              )}
            </div>

            {/* CV */}
            {application.cv_file_url && (
              <div className="bg-slate-800/60 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText size={15} /> CV de l'étudiant
                </h3>
                {!cvUrl && !loadingCv && <button onClick={loadCV} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm">Charger le CV</button>}
                {loadingCv && <p className="text-slate-400">Chargement...</p>}
                {cvUrl && <iframe src={cvUrl} title="CV" className="w-full h-96 rounded-lg border border-slate-600" />}
              </div>
            )}

            {/* Convention PDF */}
            {application.status === 'validated_by_co_dept' && application.convention_url && (
              <div className="bg-slate-800/60 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText size={15} /> Convention de stage
                </h3>
                {!conventionUrl && !loadingConvention && <button onClick={loadConvention} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm">Charger la convention</button>}
                {loadingConvention && <p className="text-slate-400">Chargement...</p>}
                {conventionUrl && (
                  <div>
                    <iframe src={conventionUrl} title="Convention" className="w-full h-96 rounded-lg border border-slate-600 mb-3" />
                    <a href={conventionUrl} download={`convention_${application.student.full_name}_${application.company.company_name}.pdf`} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm transition">
                      <Download size={14} /> Télécharger la convention
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Signature status */}
            {isSigned && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                <p className="text-green-400 text-sm font-medium flex items-center gap-2"><CheckCircle size={16} /> Convention signée par l'université</p>
                <p className="text-green-300/70 text-xs mt-1">Signée par {signatureInfo.university_signed_by} le {signatureInfo.university_signature_date}</p>
              </div>
            )}

            {/* Stamp status */}
            {hasStamp && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-400 text-sm font-medium flex items-center gap-2"><Stamp size={16} /> Cachet officiel apposé</p>
                <p className="text-blue-300/70 text-xs mt-1">Ajouté par {stampInfo.stamp_added_by} le {stampInfo.stamp_date}</p>
              </div>
            )}

            {/* Lettre de motivation */}
            {application.cover_letter && (
              <div className="bg-slate-800/60 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">📝 Lettre de motivation</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{application.cover_letter}</p>
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-slate-700 pt-6">
              {application.status === 'accepted_by_company' && (
                <>
                  {showRejectForm ? (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                      <p className="text-red-300 text-sm font-medium mb-3">Motif du refus <span className="text-red-400">*</span></p>
                      <textarea className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none min-h-[100px] focus:outline-none focus:border-red-500" placeholder="Expliquez pourquoi cette demande est refusée..." value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                      <div className="flex gap-3 mt-4">
                        <button onClick={handleRejectSubmit} disabled={submitting} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
                          {submitting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Confirmer le refus
                        </button>
                        <button onClick={() => { setShowRejectForm(false); setRejectReason(''); }} className="px-5 py-2 rounded-lg text-sm text-slate-400 hover:text-white">Annuler</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <button onClick={handleValidate} disabled={submitting} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-semibold">
                        {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Valider et générer la convention
                      </button>
                      <button onClick={() => setShowRejectForm(true)} className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-6 py-3 rounded-lg font-semibold">
                        <XCircle size={18} /> Refuser
                      </button>
                    </div>
                  )}
                </>
              )}

              {application.status === 'validated_by_co_dept' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {!isSigned ? (
                      <button onClick={() => setShowSignatureModal(true)} disabled={submitting} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold transition">
                        <PenTool size={18} /> Signer la convention
                      </button>
                    ) : (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex-1">
                        <p className="text-green-400 text-sm font-medium flex items-center gap-2"><CheckCircle size={16} /> Convention déjà signée</p>
                      </div>
                    )}
                    {!hasStamp ? (
                      <button onClick={() => setShowStampModal(true)} disabled={submitting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold transition">
                        <Stamp size={18} /> Ajouter le cachet
                      </button>
                    ) : (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex-1">
                        <p className="text-blue-400 text-sm font-medium flex items-center gap-2"><Stamp size={16} /> Cachet déjà apposé</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Composant principal réutilisable
export default function PendingValidationsList({ 
  fetchEndpoint, 
  validateEndpoint, 
  rejectEndpoint,
  downloadConventionEndpoint = 'co-dept',
  title = "Validations des conventions",
  emptyMessage = "Aucune convention en attente",
  onBack,
  backUrl,
  onPermissionError
}) {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [signatureStatuses, setSignatureStatuses] = useState({});
  const [stampStatuses, setStampStatuses] = useState({});
  const [stats, setStats] = useState({ pending: 0, total: 0, validated: 0 });

  const fetchPendingValidations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}${fetchEndpoint}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) {
        const appsWithUrl = (data.applications || []).map(app => ({
          ...app,
          convention_url: app.status === 'validated_by_co_dept' 
            ? (app.convention_url || `/api/${downloadConventionEndpoint}/download-convention/${app.id}/`)
            : null
        }));
        setApplications(appsWithUrl);
        setStats({
          pending: appsWithUrl.filter(a => a.status === 'accepted_by_company').length,
          validated: appsWithUrl.filter(a => a.status === 'validated_by_co_dept').length,
          total: appsWithUrl.length
        });
        
        for (const app of appsWithUrl) {
          if (app.status === 'validated_by_co_dept') {
            try {
              const sigRes = await fetch(`${API}/signature/status/${app.id}/`, { headers: authHeaders() });
              const sigData = await sigRes.json();
              if (sigData.success) {
                setSignatureStatuses(prev => ({ ...prev, [app.id]: sigData }));
              }
            } catch (err) { console.error("Erreur chargement signature:", err); }
            
            try {
              const stampRes = await fetch(`${API}/stamp/status/${app.id}/`, { headers: authHeaders() });
              const stampData = await stampRes.json();
              if (stampData.success) {
                setStampStatuses(prev => ({ ...prev, [app.id]: stampData }));
              }
            } catch (err) { console.error("Erreur chargement cachet:", err); }
          }
        }
      } else {
        toast.error(data.error || 'Erreur de chargement');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingValidations();
  }, []);

  const handleValidate = async (applicationId) => {
    console.log("🔵 handleValidate called for application:", applicationId);
    console.log("🔵 validateEndpoint:", validateEndpoint);
    console.log("🔵 onPermissionError exists?", !!onPermissionError);
    
    try {
      const res = await fetch(`${API}${validateEndpoint}${applicationId}/`, {
        method: 'POST',
        headers: authHeaders()
      });
      
      const data = await res.json();
      
      console.log("🔍 Response status:", res.status);
      console.log("🔍 Response data:", data);
      
      if (res.status === 403) {
        const errorMsg = data.error || data.detail || data.message || "Vous n'avez pas les permissions pour valider cette convention. Veuillez contacter le Department Head.";
        console.log("🔴 403 detected, calling onPermissionError with:", errorMsg);
        if (onPermissionError) {
          onPermissionError(errorMsg);
        } else {
          console.log("🔴 WARNING: onPermissionError is not defined!");
        }
        throw new Error(errorMsg);
      }
      
      if (data.success) {
        toast.success('Convention validée et générée avec succès !');
        await fetchPendingValidations();
        setSelectedApp(null);
      } else {
        const errorMsg = data.error || data.detail || data.message || 'Erreur lors de la validation';
        console.log("🔴 Validation error:", errorMsg);
        if (onPermissionError) onPermissionError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error("❌ Erreur dans handleValidate:", err);
      throw err;
    }
  };

  const handleReject = async (applicationId, reason) => {
    console.log("🔵 handleReject called for application:", applicationId);
    
    try {
      const res = await fetch(`${API}${rejectEndpoint}${applicationId}/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rejection_reason: reason })
      });
      
      const data = await res.json();
      
      console.log("🔍 Reject response status:", res.status);
      console.log("🔍 Reject response data:", data);
      
      if (res.status === 403) {
        const errorMsg = data.error || data.detail || data.message || "Vous n'avez pas les permissions pour refuser cette convention. Veuillez contacter le Department Head.";
        console.log("🔴 403 detected in reject, calling onPermissionError with:", errorMsg);
        if (onPermissionError) {
          onPermissionError(errorMsg);
        }
        throw new Error(errorMsg);
      }
      
      if (data.success) {
        toast.success('Candidature refusée');
        await fetchPendingValidations();
        setSelectedApp(null);
      } else {
        const errorMsg = data.error || data.detail || data.message || 'Erreur lors du refus';
        console.log("🔴 Reject error:", errorMsg);
        if (onPermissionError) onPermissionError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error("❌ Erreur dans handleReject:", err);
      throw err;
    }
  };

  const pendingCount = stats.pending;
  const validatedCount = stats.validated;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              {onBack && <button onClick={() => onBack()} className="flex items-center gap-2 text-white/70 hover:text-white transition"><ArrowLeft size={18} /> Retour</button>}
              {backUrl && <button onClick={() => navigate(backUrl)} className="flex items-center gap-2 text-white/70 hover:text-white transition"><ArrowLeft size={18} /> Retour</button>}
              {title && <><span className="text-white/30">|</span><h1 className="text-xl font-bold text-white">{title}</h1></>}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div><p className="text-white/60 text-sm">En attente de validation</p><p className="text-3xl font-bold text-white">{pendingCount}</p></div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center"><Clock className="w-6 h-6 text-yellow-400" /></div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div><p className="text-white/60 text-sm">Validées (prêtes à signer)</p><p className="text-3xl font-bold text-white">{validatedCount}</p></div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center"><PenTool className="w-6 h-6 text-purple-400" /></div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div><p className="text-white/60 text-sm">Total traitées</p><p className="text-3xl font-bold text-white">{stats.total}</p></div>
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center"><FileText className="w-6 h-6 text-green-400" /></div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-purple-400" /></div>
        ) : applications.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">{emptyMessage}</h3>
            <p className="text-white/60">Toutes les conventions ont été traitées.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const sigStatus = signatureStatuses[app.id];
              const stampStatus = stampStatuses[app.id];
              const isSigned = sigStatus?.university_signed || false;
              const hasStamp = stampStatus?.has_stamp || false;
              
              return (
                <div key={app.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-white">{app.offer.title}</h3>
                        <StatusBadge status={app.status} />
                        {isSigned && <StatusBadge status="fully_signed" />}
                        {hasStamp && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300">Cachet apposé</span>}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div><p className="text-white/60">Étudiant</p><p className="text-white font-medium">{app.student.full_name}</p><p className="text-white/40 text-xs">{app.student.email}</p></div>
                        <div><p className="text-white/60">Entreprise</p><p className="text-white font-medium">{app.company.company_name}</p><p className="text-white/40 text-xs">{app.company.location}</p></div>
                        <div>
                          <p className="text-white/60">Candidature</p>
                          <p className="text-white">Acceptée le {app.company_response_date}</p>
                          {isSigned && sigStatus?.university_signature_date && <p className="text-green-400 text-xs">✓ Signée le {sigStatus.university_signature_date}</p>}
                          {hasStamp && stampStatus?.stamp_date && <p className="text-blue-400 text-xs">✓ Cachet le {stampStatus.stamp_date}</p>}
                          {app.status === 'validated_by_co_dept' && !isSigned && <p className="text-purple-400 text-xs">✎ En attente de signature</p>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedApp({ ...app, convention_url: app.convention_url })} className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition">
                      <Eye size={16} /> Voir détails
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {selectedApp && (
        <DetailsModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onValidate={handleValidate}
          onReject={handleReject}
          onAddSignature={fetchPendingValidations}
          initialSignatureStatus={signatureStatuses[selectedApp.id]}
          initialStampStatus={stampStatuses[selectedApp.id]}
          onPermissionError={onPermissionError}
        />
      )}
    </div>
  );
}
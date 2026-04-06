import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  CheckCircle, XCircle, Clock, Mail, User, Shield, 
  GraduationCap, FileText, Eye, Check, X, Loader2,
  Building2, MapPin, Calendar, Code, BookOpen, Award, Github, Globe
} from "lucide-react";
import toast from "react-hot-toast";

const API = 'http://localhost:8000/api';
const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('access_token')}`
});

// Modal pour voir les détails d'une candidature
const ApplicationDetailsModal = ({ application, onClose, onValidate, onReject }) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [cvUrl, setCvUrl] = useState(null);
  const [loadingCv, setLoadingCv] = useState(false);
  const [conventionUrl, setConventionUrl] = useState(null);
  const [loadingConvention, setLoadingConvention] = useState(false);
  const [showConventionModal, setShowConventionModal] = useState(false);

  if (!application) return null;

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

  const handleValidate = async () => {
    setSubmitting(true);
    const success = await onValidate(application.id);
    if (success) {
      setIsValidated(true);
    }
    setSubmitting(false);
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast.error('Veuillez entrer une raison de refus');
      return;
    }
    setSubmitting(true);
    await onReject(application.id, rejectReason);
    setSubmitting(false);
    setShowRejectForm(false);
    setRejectReason('');
  };

  const handleGenerateConvention = async () => {
    setGenerating(true);
    setLoadingConvention(true);
    setShowConventionModal(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:8000/api/generate-convention/${application.id}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setConventionUrl(url);
        toast.success('Convention générée avec succès !');
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Erreur lors de la génération de la convention');
        setShowConventionModal(false);
      }
    } catch (error) {
      toast.error('Erreur de connexion');
      setShowConventionModal(false);
    } finally {
      setGenerating(false);
      setLoadingConvention(false);
    }
  };

  const closeConventionModal = () => {
    if (conventionUrl) {
      URL.revokeObjectURL(conventionUrl);
      setConventionUrl(null);
    }
    setShowConventionModal(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="sticky top-0 bg-[#1e293b] border-b border-slate-700 p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white">{application.offer?.title || 'Stage'}</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Candidature de <span className="text-white font-medium">{application.student?.full_name}</span>
                </p>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Infos étudiant */}
            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <GraduationCap size={15} /> Profil étudiant
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-xs text-slate-500">Nom complet</p><p className="text-white font-medium">{application.student?.full_name}</p></div>
                <div><p className="text-xs text-slate-500">Email</p><p className="text-white">{application.student?.email}</p></div>
                <div><p className="text-xs text-slate-500">Wilaya</p><p className="text-white">{application.student?.wilaya}</p></div>
                <div><p className="text-xs text-slate-500">Université</p><p className="text-white">{application.student?.university}</p></div>
                <div><p className="text-xs text-slate-500">Filière</p><p className="text-white">{application.student?.major} - {application.student?.education_level}</p></div>
                <div><p className="text-xs text-slate-500">Promotion</p><p className="text-white">{application.student?.graduation_year}</p></div>
              </div>
              {application.student?.skills?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500 mb-2 flex items-center gap-1"><Code size={12} /> Compétences</p>
                  <div className="flex flex-wrap gap-2">
                    {application.student.skills.map(skill => (
                      <span key={skill} className="bg-purple-900/60 text-purple-300 text-xs px-2.5 py-1 rounded-full">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              {(application.student?.github || application.student?.portfolio) && (
                <div className="mt-4 flex gap-4">
                  {application.student.github && (
                    <a href={application.student.github} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 text-sm hover:underline">
                      <Github size={14} /> GitHub
                    </a>
                  )}
                  {application.student.portfolio && (
                    <a href={application.student.portfolio} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 text-sm hover:underline">
                      <Globe size={14} /> Portfolio
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Infos offre */}
            <div className="bg-slate-800/60 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 size={15} /> Offre de stage
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><p className="text-xs text-slate-500">Titre</p><p className="text-white font-medium">{application.offer?.title}</p></div>
                <div><p className="text-xs text-slate-500">Entreprise</p><p className="text-white">{application.company?.company_name}</p></div>
                <div><p className="text-xs text-slate-500">Wilaya</p><p className="text-white">{application.offer?.wilaya}</p></div>
                <div><p className="text-xs text-slate-500">Type</p><p className="text-white">{application.offer?.internship_type}</p></div>
                <div><p className="text-xs text-slate-500">Durée</p><p className="text-white">{application.offer?.duration}</p></div>
                <div><p className="text-xs text-slate-500">Date début</p><p className="text-white">{application.offer?.start_date}</p></div>
              </div>
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">Description</p>
                <p className="text-sm text-slate-300">{application.offer?.description}</p>
              </div>
              {application.offer?.required_skills?.length > 0 && (
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

            {/* Lettre de motivation */}
            {application.cover_letter && (
              <div className="bg-slate-800/60 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">📝 Lettre de motivation</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{application.cover_letter}</p>
              </div>
            )}

            {/* CV */}
            {application.cv_file_url && (
              <div className="bg-slate-800/60 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText size={15} /> CV de l'étudiant
                </h3>
                {!cvUrl && !loadingCv && (
                  <button onClick={loadCV} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm">Charger le CV</button>
                )}
                {loadingCv && <p className="text-slate-400">Chargement...</p>}
                {cvUrl && (
                  <div className="mt-3">
                    <iframe src={cvUrl} title="CV" className="w-full h-96 rounded-lg border border-slate-600" />
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="border-t border-slate-700 pt-6">
              {showRejectForm ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                  <p className="text-red-300 text-sm font-medium mb-3">Motif du refus <span className="text-red-400">*</span></p>
                  <textarea
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-white text-sm resize-none min-h-[100px] focus:outline-none focus:border-red-500"
                    placeholder="Expliquez pourquoi cette demande est refusée..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-3 mt-4">
                    <button onClick={handleRejectSubmit} disabled={submitting} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold">
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Confirmer le refus
                    </button>
                    <button onClick={() => { setShowRejectForm(false); setRejectReason(''); }} className="px-5 py-2 rounded-lg text-sm text-slate-400 hover:text-white">Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-4">
                  {!isValidated ? (
                    <button onClick={handleValidate} disabled={submitting} className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-semibold">
                      {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} Valider la convention
                    </button>
                  ) : (
                    <button onClick={handleGenerateConvention} disabled={generating} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold">
                      {generating ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
                      Générer Convention
                    </button>
                  )}
                  <button onClick={() => setShowRejectForm(true)} className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-6 py-3 rounded-lg font-semibold">
                    <XCircle size={18} /> Refuser
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal pour afficher la convention générée */}
      {showConventionModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={closeConventionModal}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-[#1e293b] border-b border-slate-700 p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Convention de stage</h3>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
                  {application.student?.full_name} - {application.company?.company_name}
                </span>
              </div>
              <button onClick={closeConventionModal} className="text-slate-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              {loadingConvention ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 size={40} className="animate-spin text-blue-400 mb-4" />
                  <p className="text-slate-300">Génération de la convention en cours...</p>
                </div>
              ) : conventionUrl ? (
                <iframe src={conventionUrl} title="Convention de stage" className="w-full h-[70vh] rounded-lg border border-slate-600" />
              ) : (
                <div className="text-center py-20">
                  <p className="text-red-400">Erreur lors du chargement de la convention</p>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-[#1e293b] border-t border-slate-700 p-4 flex justify-end gap-3">
              {conventionUrl && (
                <a
                  href={conventionUrl}
                  download={`convention_${application.student?.full_name}_${application.company?.company_name}.pdf`}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  <FileText size={16} />
                  Télécharger PDF
                </a>
              )}
              <button onClick={closeConventionModal} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [pendingCoDeptHeads, setPendingCoDeptHeads] = useState([]);
  const [pendingValidations, setPendingValidations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingValidations, setLoadingValidations] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('co_dept_heads');
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    fetchPendingCoDeptHeads();
    fetchPendingValidations();
  }, []);

  const fetchPendingCoDeptHeads = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/admin/pending-co-dept-heads/`, { headers: authHeaders() });
      const data = await response.json();
      if (data.success) {
        setPendingCoDeptHeads(data.co_dept_heads);
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingValidations = async () => {
    setLoadingValidations(true);
    try {
      const response = await fetch(`${API}/dept-head/pending-validations/`, { headers: authHeaders() });
      const data = await response.json();
      if (data.success) {
        setPendingValidations(data.applications || []);
        console.log(" Conventions en attente:", data.applications.length);
      } else {
        console.error("Erreur:", data.error);
      }
    } catch (error) {
      console.error("Erreur chargement validations:", error);
    } finally {
      setLoadingValidations(false);
    }
  };

  const handleApproveCoDept = async (headId, headName) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API}/admin/approve-co-dept-head/${headId}/`, {
        method: "POST",
        headers: authHeaders()
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Co Department Head ${headName} a été approuvé`);
        fetchPendingCoDeptHeads();
      } else {
        toast.error(data.message || "Erreur lors de l'approbation");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectCoDept = async (headId, headName) => {
    setProcessing(true);
    try {
      const response = await fetch(`${API}/admin/reject-co-dept-head/${headId}/`, {
        method: "POST",
        headers: authHeaders()
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Co Department Head ${headName} a été refusé`);
        fetchPendingCoDeptHeads();
      } else {
        toast.error(data.message || "Erreur lors du refus");
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setProcessing(false);
    }
  };

  const handleValidateApplication = async (applicationId) => {
    try {
      const response = await fetch(`${API}/dept-head/validate-application/${applicationId}/`, {
        method: 'POST',
        headers: authHeaders()
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Convention validée avec succès !');
        fetchPendingValidations();
        return true;
      } else {
        toast.error(data.error || 'Erreur lors de la validation');
        return false;
      }
    } catch (error) {
      toast.error('Erreur de connexion');
      return false;
    }
  };

  const handleRejectApplication = async (applicationId, reason) => {
    try {
      const response = await fetch(`${API}/dept-head/reject-application/${applicationId}/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ rejection_reason: reason })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Candidature refusée');
        fetchPendingValidations();
        setSelectedApp(null);
      } else {
        toast.error(data.error || 'Erreur lors du refus');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (user?.sub_role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Accès non autorisé</h1>
          <p className="text-white/60">Seul le Department Head peut accéder à ce dashboard.</p>
          <button onClick={handleLogout} className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition">Retour à l'accueil</button>
        </div>
      </div>
    );
  }

  const pendingValidationsCount = pendingValidations.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">Department Head Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white/80">{user?.full_name || user?.email}</span>
              <span className="text-white/60 text-sm bg-white/10 px-3 py-1 rounded-full">{user?.university || "Université"}</span>
              <button onClick={handleLogout} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition">Logout</button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-2 border-b border-white/20">
          <button
            onClick={() => setActiveTab('co_dept_heads')}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg flex items-center gap-2 ${
              activeTab === 'co_dept_heads'
                ? 'bg-purple-600 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Co Department Heads
            {pendingCoDeptHeads.length > 0 && (
              <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingCoDeptHeads.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('validations')}
            className={`px-6 py-3 text-sm font-medium transition-all rounded-t-lg flex items-center gap-2 ${
              activeTab === 'validations'
                ? 'bg-purple-600 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" />
            Conventions à valider
            {pendingValidationsCount > 0 && (
              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingValidationsCount}</span>
            )}
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'co_dept_heads' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Co Department Heads en attente</h2>
              <p className="text-white/60">Approuvez ou refusez les demandes d'inscription des Co Department Heads</p>
            </div>

            {pendingCoDeptHeads.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Aucune demande en attente</h3>
                <p className="text-white/60">Tous les co department heads ont été traités.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingCoDeptHeads.map((head) => (
                  <div key={head.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <GraduationCap className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{head.username}</h3>
                          <p className="text-white/60 text-sm">{head.full_name}</p>
                        </div>
                      </div>
                      <Clock className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-white/60 text-sm">
                        <Mail className="w-4 h-4" />
                        <span>{head.email}</span>
                      </div>
                      {head.university && (
                        <p className="text-white/60 text-sm flex items-center gap-2">
                          <GraduationCap className="w-4 h-4" />
                          {head.university}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 mt-4">
                      <button onClick={() => handleApproveCoDept(head.id, head.username)} disabled={processing} className="flex-1 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Approuver
                      </button>
                      <button onClick={() => handleRejectCoDept(head.id, head.username)} disabled={processing} className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition flex items-center justify-center gap-2">
                        <XCircle className="w-4 h-4" /> Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'validations' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Conventions de stage en attente</h2>
              <p className="text-white/60">Validez ou refusez les conventions après acceptation par l'entreprise</p>
            </div>

            {loadingValidations ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="animate-spin text-purple-400" />
              </div>
            ) : pendingValidations.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 text-center border border-white/20">
                <FileText className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Aucune convention en attente</h3>
                <p className="text-white/60">Toutes les conventions ont été traitées.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingValidations.map((app) => (
                  <div key={app.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-500 transition-all">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{app.offer?.title || app.offer_title}</h3>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Accepté par entreprise
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-white/60">Étudiant</p>
                            <p className="text-white font-medium">{app.student?.full_name}</p>
                            <p className="text-white/40 text-xs">{app.student?.email}</p>
                          </div>
                          <div>
                            <p className="text-white/60">Entreprise</p>
                            <p className="text-white font-medium">{app.company?.company_name}</p>
                            <p className="text-white/40 text-xs">{app.company?.location}</p>
                          </div>
                          <div>
                            <p className="text-white/60">Stage</p>
                            <p className="text-white">{app.offer?.title}</p>
                            <p className="text-white/40 text-xs">{app.offer?.duration} · {app.offer?.wilaya}</p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg transition"
                      >
                        <Eye size={16} />
                        Voir détails
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {selectedApp && (
        <ApplicationDetailsModal
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onValidate={handleValidateApplication}
          onReject={handleRejectApplication}
        />
      )}
    </div>
  );
};

export default AdminDashboard;
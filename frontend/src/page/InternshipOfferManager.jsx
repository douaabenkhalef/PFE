import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Plus, Eye, Pencil, Trash2,
  X, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Search,
  User, Building2, Briefcase, FileText, UserCog, Activity, LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';
import './StudentDashboard.css';
import UserAvatar from '../components/UserAvatar';

const BASE_URL = 'https://pfe-l31r.onrender.com/api';
const BACKEND  = 'https://pfe-l31r.onrender.com';
const imgUrl   = (url) => { if (!url) return null; if (url.startsWith('http')) return url; return `${BACKEND}${url}`; };
// Les valeurs doivent correspondre exactement aux choix du modèle backend
const TYPES = [
  { value: 'PFE',        label: 'PFE' },
  { value: 'ouvrier',    label: 'Ouvrier' },
  { value: 'technicien', label: 'Technicien' },
  { value: 'été',        label: 'Stage d\'été' },
];
const WILAYAS  = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar','Blida','Bouira',
  'Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger','Djelfa','Jijel','Sétif','Saïda',
  'Skikda','Sidi Bel Abbès','Annaba','Guelma','Constantine','Médéa','Mostaganem',"M'Sila",'Mascara',
  'Ouargla','Oran','El Bayadh','Illizi','Bordj Bou Arreridj','Boumerdès','El Tarf','Tindouf',
  'Tissemsilt','El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma',
  'Aïn Témouchent','Ghardaïa','Relizane',
];
const EMPTY = {
  title: '', description: '', wilaya: '', internship_type: '',
  duration: '', start_date: '', required_skills: '', is_active: true, deadline: '',
  image: null,
};
const inp = 'bg-[#1e293b] border border-slate-700 focus:border-indigo-500 rounded-lg px-3 py-2 text-sm text-white outline-none transition w-full';

function Msg({ msg, onClose }) {
  if (!msg) return null;
  const ok = msg.type === 'success';
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border mb-5 text-sm ${ok ? 'bg-green-500/10 border-green-500/40 text-green-300' : 'bg-red-500/10 border-red-500/40 text-red-300'}`}>
      {ok ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" /> : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
      <span className="flex-1">{msg.text}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 ml-2"><X size={15} /></button>
    </div>
  );
}

function OfferForm({ initial, onSubmit, submitLabel, submitting }) {
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const prevKey = useRef(null);
  const formKey = initial?.id || 'create';

  useEffect(() => {
    if (formKey !== prevKey.current) {
      setF({ ...EMPTY, ...initial });
      prevKey.current = formKey;
    }
  }, [formKey, initial]);

  const set  = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const bool = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value === 'true' }));
  const setFile = (k) => (e) => {
    const file = e.target.files[0];
    setF((p) => ({ ...p, [k]: file }));
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f); }} className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl">
      <div className="md:col-span-2">
        <label className="block text-xs text-slate-400 mb-1 font-medium">Title <span className="text-red-400">*</span></label>
        <input className={inp} placeholder="e.g. Mobile Application Developer Intern" value={f.title} onChange={set('title')} required />
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs text-slate-400 mb-1 font-medium">Description <span className="text-red-400">*</span></label>
        <textarea className={`${inp} min-h-[90px] resize-y`} placeholder="Describe the internship role..." value={f.description} onChange={set('description')} required />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-medium">Wilaya <span className="text-red-400">*</span></label>
        <select className={inp} value={f.wilaya} onChange={set('wilaya')} required>
          <option value="">-- Select Wilaya --</option>
          {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-medium">Internship Type <span className="text-red-400">*</span></label>
        <select className={inp} value={f.internship_type} onChange={set('internship_type')} required>
          <option value="">-- Select Type --</option>
          {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-medium">Duration <span className="text-red-400">*</span></label>
        <input className={inp} placeholder="e.g. 3 months" value={f.duration} onChange={set('duration')} required />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-medium">Start Date <span className="text-red-400">*</span></label>
        <input type="date" className={inp} value={f.start_date} onChange={set('start_date')} required />
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs text-slate-400 mb-1 font-medium">Required Skills <span className="text-slate-500 font-normal">(comma-separated)</span></label>
        <input className={inp} placeholder="e.g. Flutter, Firebase, REST API" value={f.required_skills} onChange={set('required_skills')} />
      </div>
      <div className="md:col-span-2">
        <label className="block text-xs text-slate-400 mb-1 font-medium">Offer Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={setFile('image')}
          className="bg-[#1e293b] border border-slate-700 rounded-lg px-3 py-2 text-sm text-white file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 transition"
        />
        {f.image instanceof File && <p className="text-xs text-slate-400 mt-1">Selected: {f.image.name}</p>}
        {typeof f.image === 'string' && f.image && !(f.image instanceof File) && (
          <p className="text-xs text-slate-400 mt-1">Current image will be kept (upload new to replace)</p>
        )}
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-medium">Status</label>
        <select className={inp} value={String(f.is_active)} onChange={bool('is_active')}>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-medium">Deadline <span className="text-red-400">*</span></label>
        <input type="date" className={inp} value={f.deadline} onChange={set('deadline')} required />
      </div>
      <div className="md:col-span-2 pt-2">
        <button type="submit" disabled={submitting} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold px-8 py-2.5 rounded-lg transition">
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export default function InternshipOfferManager() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list');
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [modal, setModal] = useState(null);
  const [editOffer, setEditOffer] = useState(null);
  const [search, setSearch] = useState('');
  const [fType, setFType] = useState('');
  const [fActive, setFActive] = useState('');

  const isCompanyManager = user?.sub_role === 'company_manager';
  const [userPermissions, setUserPermissions] = useState(null);

  // Le company_manager peut TOUJOURS modifier/supprimer/créer.
  // Le hiring_manager dépend de ses permissions définies par le manager.
  const canModify = isCompanyManager || (userPermissions?.can_modify_offer === true);
  const canDelete = isCompanyManager || (userPermissions?.can_delete_offer === true);
  const canCreate = isCompanyManager || (userPermissions?.can_create_offer === true);

  const auth = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  });

  const showMsg = (type, text) => {
    setMsg({ type, text });
    if (type === 'success') setTimeout(() => setMsg(null), 4000);
  };

  const loadOffers = async (s = search, t = fType, a = fActive) => {
    setLoading(true);
    let url = `${BASE_URL}/company/offers/?`;
    if (s) url += `search=${encodeURIComponent(s)}&`;
    if (t) url += `type=${encodeURIComponent(t)}&`;
    if (a) url += `active=${a}`;
    try {
      const res = await fetch(url, { headers: auth() });
      const data = await res.json();
      if (data.success) { setOffers(data.offers || []); setMsg(null); }
      else showMsg('error', data.message || 'Failed to load offers.');
    } catch (e) { showMsg('error', `Network error: ${e.message}`); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'list') loadOffers();
  }, [activeTab]);

  // Charger les permissions pour le hiring_manager
  useEffect(() => {
    if (!isCompanyManager) {
      fetch(`${BASE_URL}/company/my-permissions/`, { headers: auth() })
        .then(r => r.json())
        .then(data => { if (data.success) setUserPermissions(data.permissions); })
        .catch(() => {});
    }
  }, [isCompanyManager]);

  const handleCreate = async (f) => {
    setSubmitting(true); setMsg(null);
    const formData = new FormData();
    Object.keys(f).forEach(key => {
      if (key === 'image' && f.image instanceof File) {
        formData.append('image', f.image);
      } else if (key === 'required_skills') {
        formData.append(key, f.required_skills);
      } else {
        formData.append(key, f[key]);
      }
    });
    formData.append('is_active', f.is_active === true || f.is_active === 'true');

    try {
      const res = await fetch(`${BASE_URL}/company/offers/create/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) { showMsg('success', 'Offer created and saved to database!'); setActiveTab('list'); }
      else showMsg('error', data.message || 'Failed to create offer.');
    } catch (e) { showMsg('error', `Network error: ${e.message}`); }
    finally { setSubmitting(false); }
  };

  const viewOffer = async (id) => {
    try {
      const res = await fetch(`${BASE_URL}/company/offers/${id}/`, { headers: auth() });
      const data = await res.json();
      if (data.success) setModal(data.offer);
      else showMsg('error', data.message || 'Failed to load details.');
    } catch (e) { showMsg('error', `Network error: ${e.message}`); }
  };

  const openEdit = (offer) => {
    setEditOffer({
      ...offer,
      required_skills: Array.isArray(offer.required_skills) ? offer.required_skills.join(', ') : (offer.required_skills || ''),
      start_date: offer.start_date || '',
      deadline: offer.deadline || '',
      image: offer.image_url || offer.image || null,
    });
    setActiveTab('edit');
    setMsg(null);
  };

  const handleUpdate = async (f) => {
    if (!editOffer) return;
    setSubmitting(true); setMsg(null);
    const formData = new FormData();
    Object.keys(f).forEach(key => {
      if (key === 'image' && f.image instanceof File) {
        formData.append('image', f.image);
      } else if (key === 'required_skills') {
        formData.append(key, f.required_skills);
      } else {
        formData.append(key, f[key]);
      }
    });
    formData.append('is_active', f.is_active === true || f.is_active === 'true');

    try {
      const res = await fetch(`${BASE_URL}/company/offers/${editOffer.id}/update/`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('access_token')}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) { showMsg('success', 'Offer updated!'); setEditOffer(null); setActiveTab('list'); }
      else showMsg('error', data.message || 'Failed to update offer.');
    } catch (e) { showMsg('error', `Network error: ${e.message}`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (offer) => {
    if (!window.confirm(`Delete "${offer.title}"? This cannot be undone.`)) return;
    setMsg(null);
    try {
      const res = await fetch(`${BASE_URL}/company/offers/${offer.id}/delete/`, { method: 'DELETE', headers: auth() });
      const data = await res.json();
      if (data.success) { showMsg('success', `"${offer.title}" deleted.`); loadOffers(); }
      else showMsg('error', data.message || 'Failed to delete.');
    } catch (e) { showMsg('error', `Network error: ${e.message}`); }
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
              <Link to="/company/manage-offers" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-purple-600/30 text-purple-300 border border-purple-500/30">
                <Briefcase size={16} /> Manage Offers
              </Link>
              <Link to="/company/applications" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/10">
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
          <button
            onClick={() => navigate(dashboardPath)}
            className="flex items-center gap-2 text-white/70 hover:text-white transition mb-6"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <Msg msg={msg} onClose={() => setMsg(null)} />

          <div className="flex gap-4 mb-6 border-b border-white/20">
            <button
              onClick={() => setActiveTab('list')}
              className={`pb-2 px-4 text-sm font-semibold transition ${
                activeTab === 'list' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/60 hover:text-white'
              }`}
            >
              All Offers
            </button>
            {canCreate && (
              <button
                onClick={() => setActiveTab('create')}
                className={`pb-2 px-4 text-sm font-semibold transition ${
                  activeTab === 'create' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-white/60 hover:text-white'
                }`}
              >
                Create Offer
              </button>
            )}
          </div>

          {activeTab === 'list' && (
            <>
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h1 className="text-2xl font-bold text-white">All Internship Offers</h1>
                {canCreate && (
                  <button onClick={() => setActiveTab('create')}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                    <Plus size={15} /> New Offer
                  </button>
                )}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); loadOffers(search, fType, fActive); }} className="flex gap-3 mb-6 flex-wrap items-end">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input className={`${inp} pl-9`} placeholder="Search title or description..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <select className={`${inp} w-40`} value={fType} onChange={(e) => setFType(e.target.value)}>
                  <option value="">All Types</option>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select className={`${inp} w-36`} value={fActive} onChange={(e) => setFActive(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">Search</button>
              </form>
              {loading ? (
                <div className="flex items-center justify-center py-24 text-white/50"><Loader2 size={24} className="animate-spin mr-3" /> Loading offers...</div>
              ) : offers.length === 0 ? (
                <div className="text-center py-24 text-white/50">
                  <ClipboardList size={44} className="mx-auto mb-3 opacity-30" />
                  <p className="text-base">No offers found.</p>
                  <p className="text-sm mt-1">Create your first offer using the <button onClick={() => setActiveTab('create')} className="text-purple-400 hover:underline">New Offer</button> button.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-white/10 text-white/50 text-xs uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left">Title</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-left">Wilaya</th>
                          <th className="px-4 py-3 text-left">Duration</th>
                          <th className="px-4 py-3 text-left">Start</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">Image</th>
                          <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {offers.map((o) => (
                          <tr key={o.id} className="hover:bg-white/5 transition">
                            <td className="px-4 py-3 font-semibold text-white">{o.title}</td>
                            <td className="px-4 py-3"><span className="bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded text-xs font-medium">{o.internship_type}</span></td>
                            <td className="px-4 py-3 text-white/70">{o.wilaya}</td>
                            <td className="px-4 py-3 text-white/70">{o.duration}</td>
                            <td className="px-4 py-3 text-white/50">{o.start_date || '—'}</td>
                            <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${o.is_active ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'}`}>{o.is_active ? 'Active' : 'Inactive'}</span></td>
                            <td className="px-4 py-3">
                              {imgUrl(o.image_url) ? (
                                <img src={imgUrl(o.image_url)} alt={o.title} className="w-10 h-10 object-cover rounded" />
                              ) : (
                                <span className="text-white/30 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <button onClick={() => viewOffer(o.id)} title="View" className="text-indigo-400 hover:text-indigo-300 transition"><Eye size={16} /></button>
                                {canModify && <button onClick={() => openEdit(o)} title="Edit" className="text-yellow-400 hover:text-yellow-300 transition"><Pencil size={16} /></button>}
                                {canDelete && <button onClick={() => handleDelete(o)} title="Delete" className="text-red-400 hover:text-red-300 transition"><Trash2 size={16} /></button>}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'create' && (
            <>
              <h1 className="text-2xl font-bold text-white mb-6">Create New Offer</h1>
              <OfferForm initial={EMPTY} onSubmit={handleCreate} submitLabel="Create Offer" submitting={submitting} />
            </>
          )}

          {activeTab === 'edit' && editOffer && (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Edit Offer</h1>
              <p className="text-white/50 text-sm mb-6">Editing: <span className="text-white/80 font-medium">{editOffer.title}</span></p>
              <OfferForm initial={editOffer} onSubmit={handleUpdate} submitLabel="Save Changes" submitting={submitting} />
            </>
          )}
        </div>
      </div>

      {/* Modal for view details */}
      {modal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setModal(null)}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-lg p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition"><X size={20} /></button>
            {imgUrl(modal.image_url) && (
              <div className="h-80 w-full overflow-hidden rounded-lg mb-4">
                <img src={imgUrl(modal.image_url)} alt={modal.title} className="w-full h-full object-cover" />
              </div>
            )}
            <h2 className="text-xl font-bold text-white mb-1">{modal.title}</h2>
            <p className="text-slate-500 text-sm mb-5">{modal.company_name}</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[['Type', modal.internship_type],['Wilaya', modal.wilaya],['Duration', modal.duration],['Start Date', modal.start_date || '—'],['Status', modal.is_active ? 'Active' : 'Inactive'],['Created', modal.created_at || '—']].map(([label, value]) => (
                <div key={label} className="bg-slate-800 rounded-lg p-3">
                  <span className="block text-xs text-slate-500 mb-1">{label}</span>
                  <span className="text-sm text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
            <div className="mb-5">
              <p className="text-xs text-slate-500 mb-2">Description</p>
              <p className="text-sm text-slate-300 leading-relaxed">{modal.description}</p>
            </div>
            {modal.required_skills?.length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-slate-500 mb-2">Required Skills</p>
                <div className="flex flex-wrap gap-2">
                  {modal.required_skills.map((s) => (<span key={s} className="bg-indigo-900/60 text-indigo-300 text-xs px-2.5 py-1 rounded-full">{s}</span>))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-2 flex-wrap">
              {canModify && <button onClick={() => { setModal(null); openEdit(modal); }} className="flex items-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 px-4 py-2 rounded-lg text-sm transition"><Pencil size={14} /> Edit</button>}
              {canDelete && <button onClick={() => { setModal(null); handleDelete(modal); }} className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-lg text-sm transition"><Trash2 size={14} /> Delete</button>}
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ===== RESPONSIVE STYLES ===== */
        @media (max-width: 768px) {
          .ml-64 {
            margin-left: 220px !important;
          }
          .max-w-7xl {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          .flex.items-center.justify-between {
            flex-direction: column;
            align-items: flex-start !important;
            gap: 0.75rem;
          }
          .overflow-x-auto {
            overflow-x: auto;
          }
          table {
            min-width: 800px;
          }
          .grid-cols-1.md\\:grid-cols-2 {
            grid-template-columns: 1fr !important;
          }
          .flex.gap-3 {
            flex-direction: column;
            align-items: stretch;
          }
          .flex.gap-3 select,
          .flex.gap-3 .relative,
          .flex.gap-3 button {
            width: 100%;
          }
        }
        
        @media (max-width: 580px) {
          .ml-64 {
            margin-left: 200px !important;
          }
          .px-4 {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .py-8 {
            padding-top: 1rem;
            padding-bottom: 1rem;
          }
          .text-2xl.font-bold {
            font-size: 1.2rem;
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
          .w-40, .w-36 {
            width: 100% !important;
          }
        }
        
        /* ===== LIGHT MODE STYLES ===== */
        body.light-mode .w-64 {
          background: linear-gradient(180deg, #ffffff 0%, #f5f0ff 100%) !important;
          border-right: 1px solid rgba(141, 35, 212, 0.2) !important;
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
        body.light-mode .text-purple-300\\/60 {
          color: #8D23D4 !important;
          opacity: 0.7;
        }
        body.light-mode .bg-white\\/10 {
          background: rgba(141, 35, 212, 0.08) !important;
        }
        body.light-mode .border-white\\/10,
        body.light-mode .border-white\\/20 {
          border-color: rgba(141, 35, 212, 0.15) !important;
        }
        body.light-mode .bg-purple-600\\/30 {
          background: rgba(141, 35, 212, 0.15) !important;
        }
        body.light-mode .text-purple-300 {
          color: #8D23D4 !important;
        }
        body.light-mode .hover\\:bg-white\\/10:hover {
          background: rgba(141, 35, 212, 0.1) !important;
        }
        body.light-mode .text-red-300 {
          color: #dc2626 !important;
        }
        body.light-mode .bg-slate-700 {
          background: rgba(0, 0, 0, 0.05) !important;
          border-color: rgba(141, 35, 212, 0.2) !important;
          color: #1a1a2e !important;
        }
        body.light-mode input,
        body.light-mode select,
        body.light-mode textarea {
          background: rgba(0, 0, 0, 0.05) !important;
          border-color: rgba(141, 35, 212, 0.2) !important;
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
        body.light-mode .bg-indigo-600 {
          background: #8D23D4 !important;
        }
        body.light-mode .bg-indigo-600:hover {
          background: #6B21A5 !important;
        }
        body.light-mode .bg-purple-600 {
          background: #8D23D4 !important;
        }
        body.light-mode .bg-purple-600:hover {
          background: #6B21A5 !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] {
          background: white !important;
          border-color: rgba(141, 35, 212, 0.2) !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] .text-white {
          color: #1a1a2e !important;
        }
        body.light-mode .bg-\\[\\#1e293b\\] .text-slate-500,
        body.light-mode .bg-\\[\\#1e293b\\] .text-slate-300 {
          color: #666 !important;
        }
        body.light-mode .bg-slate-800 {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        body.light-mode .bg-slate-800 .text-white {
          color: #1a1a2e !important;
        }
        body.light-mode .bg-green-500\\/10 {
          background: rgba(5, 150, 105, 0.1) !important;
        }
        body.light-mode .bg-red-500\\/10 {
          background: rgba(220, 38, 38, 0.1) !important;
        }
        body.light-mode .text-green-300 {
          color: #059669 !important;
        }
        body.light-mode .text-red-300 {
          color: #dc2626 !important;
        }
        body.light-mode .bg-blue-900\\/60 {
          background: rgba(141, 35, 212, 0.1) !important;
        }
        body.light-mode .text-blue-300 {
          color: #8D23D4 !important;
        }
        body.light-mode .bg-green-900\\/60 {
          background: rgba(5, 150, 105, 0.1) !important;
        }
        body.light-mode .bg-red-900\\/60 {
          background: rgba(220, 38, 38, 0.1) !important;
        }
        body.light-mode .text-indigo-400 {
          color: #8D23D4 !important;
        }
        body.light-mode .text-yellow-400 {
          color: #d97706 !important;
        }
        body.light-mode .text-red-400 {
          color: #dc2626 !important;
        }
      `}</style>
    </div>
  );
}
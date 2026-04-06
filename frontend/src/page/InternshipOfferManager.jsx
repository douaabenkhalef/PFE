import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  ClipboardList, Plus, Eye, Pencil, Trash2,
  X, CheckCircle2, AlertCircle, Loader2, ArrowLeft, Search,
} from 'lucide-react';

const BASE_URL = 'http://localhost:8000/api';
const TYPES    = ['PFE', 'ouvrier', 'technicien', 'été'];
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
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
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
  const { user } = useAuth();

 
  const auth = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  });

  const [section,    setSection]    = useState('list');
  const [offers,     setOffers]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg,        setMsg]        = useState(null);
  const [modal,      setModal]      = useState(null);
  const [editOffer,  setEditOffer]  = useState(null);
  const [search,     setSearch]     = useState('');
  const [fType,      setFType]      = useState('');
  const [fActive,    setFActive]    = useState('');

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
      const res  = await fetch(url, { headers: auth() });
      const data = await res.json();
      if (data.success) { setOffers(data.offers || []); setMsg(null); }
      else showMsg('error', data.message || 'Failed to load offers.');
    } catch (e) { showMsg('error', `Network error: ${e.message}`); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (section === 'list') loadOffers(); }, [section]); 

  const handleCreate = async (f) => {
    setSubmitting(true); setMsg(null);
    try {
      const res  = await fetch(`${BASE_URL}/company/offers/create/`, {
        method: 'POST', headers: auth(),
        body: JSON.stringify({ ...f, is_active: f.is_active === true || f.is_active === 'true' }),
      });
      const data = await res.json();
      if (data.success) { showMsg('success', 'Offer created and saved to database!'); setSection('list'); }
      else showMsg('error', data.message || 'Failed to create offer.');
    } catch (e) { showMsg('error', `Network error: ${e.message}`); }
    finally { setSubmitting(false); }
  };

  const viewOffer = async (id) => {
    try {
      const res  = await fetch(`${BASE_URL}/company/offers/${id}/`, { headers: auth() });
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
    });
    setSection('edit'); setMsg(null);
  };

  const handleUpdate = async (f) => {
    if (!editOffer) return;
    setSubmitting(true); setMsg(null);
    try {
      const res  = await fetch(`${BASE_URL}/company/offers/${editOffer.id}/update/`, {
        method: 'PUT', headers: auth(),
        body: JSON.stringify({ ...f, is_active: f.is_active === true || f.is_active === 'true' }),
      });
      const data = await res.json();
      if (data.success) { showMsg('success', 'Offer updated!'); setEditOffer(null); setSection('list'); }
      else showMsg('error', data.message || 'Failed to update offer.');
    } catch (e) { showMsg('error', `Network error: ${e.message}`); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (offer) => {
    if (!window.confirm(`Delete "${offer.title}"? This cannot be undone.`)) return;
    setMsg(null);
    try {
      const res  = await fetch(`${BASE_URL}/company/offers/${offer.id}/delete/`, { method: 'DELETE', headers: auth() });
      const data = await res.json();
      if (data.success) { showMsg('success', `"${offer.title}" deleted.`); loadOffers(); }
      else showMsg('error', data.message || 'Failed to delete.');
    } catch (e) { showMsg('error', `Network error: ${e.message}`); }
  };

  const Nav = ({ id, icon: Icon, label }) => (
    <button onClick={() => { setSection(id); setMsg(null); }}
      className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition ${section === id ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
      <Icon size={16} /> {label}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[#0f172a] text-slate-200">
      <aside className="w-56 bg-[#1e293b] border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Manage Offers</p>
          <p className="text-sm text-slate-300 truncate">{user?.company_name}</p>
        </div>
        <nav className="p-3 flex flex-col gap-1 flex-1">
          <Nav id="list"   icon={ClipboardList} label="All Offers" />
          <Nav id="create" icon={Plus}          label="Create Offer" />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <Link to={user?.sub_role === 'company_manager' ? '/company-manager/dashboard' : '/company/dashboard'}
            className="flex items-center gap-2 text-slate-500 hover:text-white text-sm transition">
            <ArrowLeft size={15} /> Back to Dashboard
          </Link>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto min-w-0">
        <Msg msg={msg} onClose={() => setMsg(null)} />

        {section === 'list' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">All Internship Offers</h1>
              <button onClick={() => setSection('create')}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition">
                <Plus size={15} /> New Offer
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); loadOffers(search, fType, fActive); }} className="flex gap-3 mb-6 flex-wrap items-end">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input className={`${inp} pl-8 w-64`} placeholder="Search title or description..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className={`${inp} w-40`} value={fType} onChange={(e) => setFType(e.target.value)}>
                <option value="">All Types</option>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className={`${inp} w-36`} value={fActive} onChange={(e) => setFActive(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <button type="submit" className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition">Search</button>
            </form>
            {loading ? (
              <div className="flex items-center justify-center py-24 text-slate-500"><Loader2 size={24} className="animate-spin mr-3" /> Loading offers...</div>
            ) : offers.length === 0 ? (
              <div className="text-center py-24 text-slate-500">
                <ClipboardList size={44} className="mx-auto mb-3 opacity-30" />
                <p className="text-base">No offers found.</p>
                <p className="text-sm mt-1">Create your first offer using the <button onClick={() => setSection('create')} className="text-indigo-400 hover:underline">New Offer</button> button.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-800 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left">Title</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Wilaya</th>
                      <th className="px-4 py-3 text-left">Duration</th>
                      <th className="px-4 py-3 text-left">Start</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {offers.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-semibold text-white">{o.title}</td>
                        <td className="px-4 py-3"><span className="bg-blue-900/60 text-blue-300 px-2 py-0.5 rounded text-xs font-medium">{o.internship_type}</span></td>
                        <td className="px-4 py-3 text-slate-300">{o.wilaya}</td>
                        <td className="px-4 py-3 text-slate-300">{o.duration}</td>
                        <td className="px-4 py-3 text-slate-400">{o.start_date || '—'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${o.is_active ? 'bg-green-900/60 text-green-300' : 'bg-red-900/60 text-red-300'}`}>{o.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <button onClick={() => viewOffer(o.id)} title="View" className="text-indigo-400 hover:text-indigo-300 transition"><Eye size={16} /></button>
                            <button onClick={() => openEdit(o)} title="Edit" className="text-yellow-400 hover:text-yellow-300 transition"><Pencil size={16} /></button>
                            <button onClick={() => handleDelete(o)} title="Delete" className="text-red-400 hover:text-red-300 transition"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {section === 'create' && (
          <>
            <h1 className="text-2xl font-bold mb-6">Create New Offer</h1>
            <OfferForm initial={EMPTY} onSubmit={handleCreate} submitLabel="Create Offer" submitting={submitting} />
          </>
        )}

        {section === 'edit' && editOffer && (
          <>
            <h1 className="text-2xl font-bold mb-1">Edit Offer</h1>
            <p className="text-slate-500 text-sm mb-6">Editing: <span className="text-slate-300 font-medium">{editOffer.title}</span></p>
            <OfferForm initial={editOffer} onSubmit={handleUpdate} submitLabel="Save Changes" submitting={submitting} />
          </>
        )}
      </main>

      {modal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setModal(null)}>
          <div className="bg-[#1e293b] border border-slate-700 rounded-2xl w-full max-w-lg p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition"><X size={20} /></button>
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
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setModal(null); openEdit(modal); }} className="flex items-center gap-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-300 px-4 py-2 rounded-lg text-sm transition"><Pencil size={14} /> Edit</button>
              <button onClick={() => { setModal(null); handleDelete(modal); }} className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 px-4 py-2 rounded-lg text-sm transition"><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
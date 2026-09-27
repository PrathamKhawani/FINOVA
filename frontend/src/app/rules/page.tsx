'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { Shield, Plus, Trash2, Edit3, CheckCircle, X, AlertTriangle, ToggleLeft, ToggleRight, Zap } from 'lucide-react';

interface Rule {
  id: string;
  name: string;
  matchNarration?: string;
  matchMerchant?: string;
  matchVPA?: string;
  matchDirection?: string;
  matchPaymentType?: string;
  category: string;
  subcategory?: string;
  isEnabled: boolean;
  priority: number;
  appliedCount: number;
  createdAt: string;
  updatedAt: string;
}

const ALL_CATEGORIES = [
  'Income', 'Person-to-Person Transfer', 'Food & Dining', 'Groceries', 'Shopping',
  'Travel & Transport', 'Fuel', 'Rent', 'Utilities & Bills', 'Healthcare',
  'Education', 'Insurance & Premium', 'EMI & Loans', 'Investments', 'Subscriptions',
  'Entertainment', 'ATM & Cash', 'Bank Charges', 'Taxes',
  'Business Income', 'Business Expense', 'Other / Needs Review',
];

const DIRECTION_OPTS = ['any', 'credit', 'debit'];
const PAYMENT_OPTS   = ['', 'UPI', 'NEFT', 'IMPS', 'RTGS', 'Card', 'ATM', 'Wallet', 'Cheque'];

const CATEGORY_COLORS: Record<string, string> = {
  Income: '#10b981', 'Business Income': '#34d399', 'Food & Dining': '#f59e0b',
  Groceries: '#84cc16', Shopping: '#ec4899', 'Travel & Transport': '#06b6d4',
  Rent: '#fb923c', 'Utilities & Bills': '#8b5cf6', Healthcare: '#14b8a6',
  Education: '#6366f1', 'Insurance & Premium': '#38bdf8', 'EMI & Loans': '#ef4444',
  Investments: '#10b981', Subscriptions: '#a855f7', Entertainment: '#a855f7',
  'ATM & Cash': '#64748b', 'Bank Charges': '#94a3b8', Taxes: '#dc2626',
  'Other / Needs Review': '#94a3b8',
};

const empty: Partial<Rule> = {
  name: '', matchNarration: '', matchMerchant: '', matchVPA: '',
  matchDirection: 'any', matchPaymentType: '', category: 'Food & Dining',
  subcategory: '', priority: 0,
};

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [form, setForm] = useState<Partial<Rule>>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const res = await api.getRules();
      setRules(res.data.rules || []);
    } catch { }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditingRule(null);
    setForm(empty);
    setPreviewCount(null);
    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingRule(rule);
    setForm({ ...rule });
    setPreviewCount(null);
    setError('');
    setSuccess('');
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditingRule(null); setForm(empty); };

  const fetchPreview = async () => {
    if (!form.matchNarration && !form.matchMerchant && !form.matchVPA) {
      setPreviewCount(null); return;
    }
    // Use rule preview API if editing an existing rule
    if (editingRule) {
      try {
        const res = await api.previewRule(editingRule.id);
        setPreviewCount(res.data.matchingCount ?? null);
      } catch { setPreviewCount(null); }
    }
    // For new rules there's no id yet; skip preview
  };

  const handleSave = async () => {
    if (!form.name) { setError('Rule name is required.'); return; }
    if (!form.category) { setError('Category is required.'); return; }
    if (!form.matchNarration && !form.matchMerchant && !form.matchVPA) {
      setError('At least one matching signal is required.'); return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingRule) {
        await api.updateRule(editingRule.id, {
          name: form.name,
          matchNarration: form.matchNarration || undefined,
          matchMerchant:  form.matchMerchant  || undefined,
          matchVPA:       form.matchVPA        || undefined,
          matchDirection: (form.matchDirection === 'any' ? undefined : form.matchDirection) as any,
          matchPaymentType: form.matchPaymentType || undefined,
          category:    form.category!,
          subcategory: form.subcategory || undefined,
          isEnabled:   form.isEnabled !== false,
          priority:    form.priority || 0,
        });
        setSuccess('Rule updated successfully.');
      } else {
        await api.createRule({
          name: form.name!,
          matchNarration: form.matchNarration || undefined,
          matchMerchant:  form.matchMerchant  || undefined,
          matchVPA:       form.matchVPA        || undefined,
          matchDirection: form.matchDirection === 'any' ? undefined : form.matchDirection,
          matchPaymentType: form.matchPaymentType || undefined,
          category:    form.category!,
          subcategory: form.subcategory || undefined,
          priority:    form.priority || 0,
        });
        setSuccess('Rule created successfully.');
      }
      await fetchRules();
      setTimeout(closeForm, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save rule.');
    } finally { setSaving(false); }
  };

  const handleToggle = async (rule: Rule) => {
    try {
      await api.updateRule(rule.id, { isEnabled: !rule.isEnabled });
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isEnabled: !r.isEnabled } : r));
    } catch { }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule? This cannot be undone.')) return;
    try {
      await api.deleteRule(id);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch { }
  };

  const handleApplyExisting = async (rule: Rule) => {
    if (!confirm(`Apply rule "${rule.name}" to all existing matching transactions?\n\nOnly unreviewed transactions will be updated.`)) return;
    setApplyingId(rule.id);
    try {
      const res = await api.applyRuleToExisting(rule.id);
      await fetchRules();
      setSuccess(`Applied to ${res.data.updatedCount} transaction(s).`);
      setTimeout(() => setSuccess(''), 4000);
    } catch { }
    finally { setApplyingId(null); }
  };

  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
              <Shield size={28} className="text-blue-400" />
              Categorization Rules
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Personal rules applied before auto-categorization · Only classification is changed — never raw financial data
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} /> New Rule
          </button>
        </div>

        {/* Success banner */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
            <CheckCircle size={14} /> {success}
            <button onClick={() => setSuccess('')} className="ml-auto text-emerald-500 hover:text-emerald-300"><X size={14} /></button>
          </div>
        )}

        {/* Rule Form */}
        {showForm && (
          <div className="glass-card border-slate-700 p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">{editingRule ? 'Edit Rule' : 'Create New Rule'}</h2>
              <button onClick={closeForm} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Rule Name *</label>
              <input
                type="text"
                value={form.name || ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. ABC Services → Business Income"
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
              />
            </div>

            {/* Matching Signals */}
            <div>
              <p className="text-xs font-semibold text-slate-300 mb-2">Matching Signals <span className="text-slate-500">(fill at least one — ALL filled signals must match)</span></p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Narration contains</label>
                  <input type="text" value={form.matchNarration || ''} onChange={e => setForm(f => ({ ...f, matchNarration: e.target.value }))}
                    placeholder="e.g. ABC SERVICES" className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Merchant / Counterparty</label>
                  <input type="text" value={form.matchMerchant || ''} onChange={e => setForm(f => ({ ...f, matchMerchant: e.target.value }))}
                    placeholder="e.g. Swiggy" className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">UPI VPA</label>
                  <input type="text" value={form.matchVPA || ''} onChange={e => setForm(f => ({ ...f, matchVPA: e.target.value }))}
                    placeholder="e.g. merchant@bank" className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
                </div>
              </div>
            </div>

            {/* Constraints */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Direction</label>
                <select value={form.matchDirection || 'any'} onChange={e => setForm(f => ({ ...f, matchDirection: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                  {DIRECTION_OPTS.map(d => <option key={d} value={d}>{d === 'any' ? 'Any direction' : d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Payment Type</label>
                <select value={form.matchPaymentType || ''} onChange={e => setForm(f => ({ ...f, matchPaymentType: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                  {PAYMENT_OPTS.map(p => <option key={p} value={p}>{p || 'Any type'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Category *</label>
                <select value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500">
                  {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Subcategory</label>
                <input type="text" value={form.subcategory || ''} onChange={e => setForm(f => ({ ...f, subcategory: e.target.value }))}
                  placeholder="Optional" className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600" />
              </div>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-4">
              <div className="w-32">
                <label className="block text-[10px] text-slate-400 mb-1">Priority <span className="text-slate-600">(higher = checked first)</span></label>
                <input type="number" min={0} max={100} value={form.priority || 0} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500" />
              </div>
              {editingRule && (
                <button onClick={fetchPreview} className="text-xs text-blue-400 hover:text-blue-300 mt-4 underline">
                  Preview matches
                </button>
              )}
              {previewCount !== null && (
                <p className="text-xs text-slate-400 mt-4">{previewCount} existing transaction{previewCount === 1 ? '' : 's'} would match</p>
              )}
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle size={12} /> {error}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={closeForm} className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" /> : <CheckCircle size={14} />}
                {saving ? 'Saving...' : (editingRule ? 'Update Rule' : 'Create Rule')}
              </button>
            </div>
          </div>
        )}

        {/* Rules List */}
        {loading ? (
          <div className="glass-card border-slate-800 p-12 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full mx-auto" />
            <p className="text-slate-400 text-sm mt-3">Loading rules...</p>
          </div>
        ) : rules.length === 0 ? (
          <div className="glass-card border-slate-800 p-12 text-center">
            <Shield size={40} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">No rules yet.</p>
            <p className="text-slate-500 text-xs mt-1">Create your first rule to auto-classify future matching transactions.</p>
            <button onClick={openCreate} className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors">
              <Plus size={14} /> Create Rule
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {rules.map(rule => {
              const color = CATEGORY_COLORS[rule.category] || '#94a3b8';
              return (
                <div key={rule.id} className={`glass-card border-slate-800 p-5 flex flex-col gap-3 transition-opacity ${!rule.isEnabled ? 'opacity-50' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{rule.name}</span>
                        {rule.isEnabled
                          ? <span className="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">Active</span>
                          : <span className="text-[9px] uppercase font-bold text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded">Disabled</span>
                        }
                        {rule.priority > 0 && (
                          <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">P{rule.priority}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                        {rule.matchNarration && <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">narration: "{rule.matchNarration}"</span>}
                        {rule.matchMerchant  && <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">merchant: "{rule.matchMerchant}"</span>}
                        {rule.matchVPA       && <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">VPA: {rule.matchVPA}</span>}
                        {rule.matchDirection && rule.matchDirection !== 'any' && <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">{rule.matchDirection}</span>}
                        {rule.matchPaymentType && <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">{rule.matchPaymentType}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Apply to existing */}
                      <button onClick={() => handleApplyExisting(rule)} disabled={applyingId === rule.id || !rule.isEnabled}
                        title="Apply to existing matching transactions"
                        className="p-1.5 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:opacity-40">
                        {applyingId === rule.id ? <span className="animate-spin w-4 h-4 border-2 border-yellow-400/20 border-t-yellow-400 rounded-full block" /> : <Zap size={15} />}
                      </button>
                      {/* Enable/Disable */}
                      <button onClick={() => handleToggle(rule)} title={rule.isEnabled ? 'Disable rule' : 'Enable rule'}
                        className="p-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors">
                        {rule.isEnabled ? <ToggleRight size={18} className="text-emerald-400" /> : <ToggleLeft size={18} />}
                      </button>
                      {/* Edit */}
                      <button onClick={() => openEdit(rule)} className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-colors">
                        <Edit3 size={15} />
                      </button>
                      {/* Delete */}
                      <button onClick={() => handleDelete(rule.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Target classification */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500">→ Classifies as</span>
                    <span className="px-2.5 py-0.5 rounded-full font-semibold text-[10px]" style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}35` }}>
                      {rule.category}
                    </span>
                    {rule.subcategory && <span className="text-slate-400">↳ {rule.subcategory}</span>}
                    <span className="ml-auto text-slate-600 text-[10px]">Applied {rule.appliedCount} time{rule.appliedCount === 1 ? '' : 's'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info footer */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-xs text-slate-400 flex items-start gap-3">
          <Shield size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-300 mb-1">Data Safety Guarantee</p>
            <p>Rules only update transaction <strong className="text-slate-300">category</strong> and <strong className="text-slate-300">subcategory</strong>.
            Original amount, date, narration, and all other financial values are <strong className="text-slate-300">never modified</strong>.
            Rule matching uses word-boundary-aware comparison to prevent accidental misclassification of unrelated transactions.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

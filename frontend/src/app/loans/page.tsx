'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { PlusCircle, Trash2, CreditCard, Calendar, TrendingDown, X, AlertCircle } from 'lucide-react';

const LOAN_TYPES = ['Personal', 'Home', 'Car', 'Education', 'Business', 'Gold', 'Other'];
const TYPE_COLORS: Record<string, string> = {
  Personal: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Home: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Car: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  Education: 'bg-green-500/20 text-green-400 border-green-500/30',
  Business: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  Gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

export default function LoansPage() {
  const [loans, setLoans] = useState<any[]>([]);
  const [detectedEMIs, setDetectedEMIs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', lenderName:'', principalAmount:'', outstandingAmount:'', emiAmount:'', interestRate:'', tenureMonths:'', loanType:'Personal', startDate:'', nextDueDate:'' });
  const [saving, setSaving] = useState(false);

  const fetchLoans = async () => {
    try {
      const res = await api.getLoans();
      setLoans(res.data?.loans || []);
      setDetectedEMIs(res.data?.detectedEMIs || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLoans(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.principalAmount || !form.emiAmount) return;
    setSaving(true);
    try {
      await api.createLoan(form);
      setForm({ name:'', lenderName:'', principalAmount:'', outstandingAmount:'', emiAmount:'', interestRate:'', tenureMonths:'', loanType:'Personal', startDate:'', nextDueDate:'' });
      setShowForm(false);
      fetchLoans();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await api.deleteLoan(id);
    fetchLoans();
  };

  const totalEMI = loans.filter(l => l.isActive).reduce((s, l) => s + l.emiAmount, 0);
  const totalOutstanding = loans.filter(l => l.isActive).reduce((s, l) => s + l.outstandingAmount, 0);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Loan & EMI Tracker</h1>
            <p className="text-gray-400 text-sm mt-1">Track active loans and upcoming EMI payments</p>
          </div>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors text-sm">
            <PlusCircle className="w-4 h-4" />
            Add Loan
          </button>
        </div>

        {/* Summary */}
        {loans.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
              <p className="text-xl font-bold text-red-400">₹{totalEMI.toLocaleString('en-IN')}/mo</p>
              <p className="text-gray-400 text-xs mt-1">Total Monthly EMI</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
              <p className="text-xl font-bold text-orange-400">₹{totalOutstanding.toLocaleString('en-IN')}</p>
              <p className="text-gray-400 text-xs mt-1">Total Outstanding</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
              <p className="text-xl font-bold text-white">{loans.filter(l => l.isActive).length}</p>
              <p className="text-gray-400 text-xs mt-1">Active Loans</p>
            </div>
          </div>
        )}

        {/* Auto-Detected EMIs from bank statements */}
        {detectedEMIs.length > 0 && (
          <div className="mb-6 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-yellow-400" />
              <p className="text-yellow-300 text-sm font-semibold">EMI Transactions Detected in Bank Statements</p>
            </div>
            <div className="space-y-2">
              {detectedEMIs.map((t: any) => (
                <div key={t.id} className="flex justify-between text-xs text-gray-400 py-1 border-b border-gray-800/50">
                  <span>{t.description?.slice(0, 50)}</span>
                  <span className="text-red-400 font-medium">₹{t.amount?.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-2">Add these as tracked loans above for complete monitoring.</p>
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div className="mb-6 p-5 rounded-xl border border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Add New Loan</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Loan name (e.g. HDFC Home Loan)" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="col-span-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500" />
              <input placeholder="Lender name" value={form.lenderName} onChange={e => setForm({...form, lenderName: e.target.value})}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500" />
              <select value={form.loanType} onChange={e => setForm({...form, loanType: e.target.value})}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500">
                {LOAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="number" placeholder="Principal Amount (₹)" value={form.principalAmount} onChange={e => setForm({...form, principalAmount: e.target.value})}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500" />
              <input type="number" placeholder="Outstanding Amount (₹)" value={form.outstandingAmount} onChange={e => setForm({...form, outstandingAmount: e.target.value})}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500" />
              <input type="number" placeholder="Monthly EMI (₹)" value={form.emiAmount} onChange={e => setForm({...form, emiAmount: e.target.value})}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500" />
              <input type="number" placeholder="Interest Rate (%)" value={form.interestRate} onChange={e => setForm({...form, interestRate: e.target.value})}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500" />
              <input type="number" placeholder="Tenure (months)" value={form.tenureMonths} onChange={e => setForm({...form, tenureMonths: e.target.value})}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500" />
              <input type="date" placeholder="Next due date" value={form.nextDueDate} onChange={e => setForm({...form, nextDueDate: e.target.value})}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={handleCreate} disabled={saving}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Add Loan'}
            </button>
          </div>
        )}

        {/* Loans List */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading loans…</div>
        ) : loans.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
            <CreditCard className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No loans tracked yet</p>
            <p className="text-gray-500 text-sm mt-1">Add your active loans to track EMIs and outstanding amounts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {loans.map(l => {
              const paid = l.principalAmount - l.outstandingAmount;
              const paidPct = l.principalAmount > 0 ? Math.min(100, Math.round((paid / l.principalAmount) * 100)) : 0;
              const typeColor = TYPE_COLORS[l.loanType] || TYPE_COLORS['Personal'];
              return (
                <div key={l.id} className={`p-4 rounded-xl border transition-all ${l.isActive ? 'border-gray-700/30 bg-gray-900/50 hover:border-gray-600/50' : 'border-gray-800/30 bg-gray-900/20 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs border font-medium ${typeColor}`}>{l.loanType}</span>
                        <h3 className="text-white font-medium">{l.name}</h3>
                      </div>
                      {l.lenderName && <p className="text-gray-500 text-xs">{l.lenderName}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-red-400 font-semibold">₹{l.emiAmount.toLocaleString('en-IN')}/mo</p>
                        <p className="text-gray-500 text-xs">EMI</p>
                      </div>
                      <button onClick={() => handleDelete(l.id)} className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3 text-center">
                    <div><p className="text-white text-sm font-medium">₹{l.principalAmount.toLocaleString('en-IN')}</p><p className="text-gray-500 text-xs">Principal</p></div>
                    <div><p className="text-orange-400 text-sm font-medium">₹{l.outstandingAmount.toLocaleString('en-IN')}</p><p className="text-gray-500 text-xs">Outstanding</p></div>
                    <div><p className="text-green-400 text-sm font-medium">₹{Math.max(0,paid).toLocaleString('en-IN')}</p><p className="text-gray-500 text-xs">Paid Off</p></div>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all" style={{ width: `${paidPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{paidPct}% paid off</span>
                    {l.nextDueDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Next due: {new Date(l.nextDueDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                      </span>
                    )}
                    {l.interestRate && <span>{l.interestRate}% p.a.</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

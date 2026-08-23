'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { PlusCircle, Trash2, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const BUDGET_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Shopping', 'Transport', 'Fuel',
  'Utilities & Bills', 'Healthcare', 'Education', 'Entertainment',
  'Rent', 'EMI & Loans', 'Investments', 'Insurance & Premiums',
  'Subscriptions', 'ATM & Cash', 'Other',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': 'from-orange-500 to-red-500',
  'Groceries': 'from-green-500 to-emerald-500',
  'Shopping': 'from-pink-500 to-purple-500',
  'Transport': 'from-blue-500 to-cyan-500',
  'Fuel': 'from-yellow-500 to-orange-500',
  'Utilities & Bills': 'from-indigo-500 to-blue-500',
  'Healthcare': 'from-red-400 to-pink-500',
  'Entertainment': 'from-purple-500 to-violet-500',
  'Rent': 'from-teal-500 to-green-500',
  'EMI & Loans': 'from-gray-500 to-gray-600',
};

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category: '', limitAmount: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);

  const fetchBudgets = async () => {
    try {
      const res = await api.getBudgets(currentMonth);
      setBudgets(res.data?.budgets || []);
    } catch (e) {
      setError('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBudgets(); }, []);

  const handleCreate = async () => {
    if (!form.category || !form.limitAmount) return;
    setSaving(true);
    try {
      await api.createBudget({
        category: form.category,
        limitAmount: parseFloat(form.limitAmount),
        monthYear: currentMonth,
      });
      setForm({ category: '', limitAmount: '' });
      setShowForm(false);
      fetchBudgets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await api.deleteBudget(id);
    fetchBudgets();
  };

  const totalBudget = budgets.reduce((s, b) => s + b.limitAmount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Budget Management</h1>
            <p className="text-gray-400 text-sm mt-1">
              {new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            Add Budget
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Budget', value: `₹${totalBudget.toLocaleString('en-IN')}`, color: 'text-blue-400' },
            { label: 'Total Spent', value: `₹${totalSpent.toLocaleString('en-IN')}`, color: 'text-red-400' },
            { label: 'Remaining', value: `₹${Math.max(0, totalBudget - totalSpent).toLocaleString('en-IN')}`, color: 'text-green-400' },
          ].map(card => (
            <div key={card.label} className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
              <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-gray-400 text-xs mt-1">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Add Budget Form */}
        {showForm && (
          <div className="mb-6 p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <h3 className="text-white font-semibold mb-4">New Budget Category</h3>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select category…</option>
                {BUDGET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                type="number"
                placeholder="Monthly limit (₹)"
                value={form.limitAmount}
                onChange={e => setForm({ ...form, limitAmount: e.target.value })}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Create Budget'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Budget List */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading budgets…</div>
        ) : budgets.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
            <TrendingUp className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No budgets set for this month</p>
            <p className="text-gray-500 text-sm mt-1">Click "Add Budget" to start tracking spending limits</p>
          </div>
        ) : (
          <div className="space-y-3">
            {budgets.map(b => {
              const pct = Math.min(100, b.usagePercent || 0);
              const isOver = pct >= 100;
              const isWarning = pct >= 80 && pct < 100;
              const gradientClass = CATEGORY_COLORS[b.category] || 'from-gray-500 to-gray-600';

              return (
                <div key={b.id} className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 hover:border-gray-600/50 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {isOver ? (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      ) : isWarning ? (
                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      <span className="text-white font-medium">{b.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${isOver ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-gray-300'}`}>
                        ₹{(b.spent || 0).toLocaleString('en-IN')} / ₹{b.limitAmount.toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => handleDelete(b.id)}
                        className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${isOver ? 'from-red-500 to-red-600' : isWarning ? 'from-yellow-500 to-orange-500' : gradientClass} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {pct}% used · ₹{b.remaining.toLocaleString('en-IN')} remaining
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {error && <div className="mt-4 text-red-400 text-sm text-center">{error}</div>}
      </div>
    </div>
  );
}

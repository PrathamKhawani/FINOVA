'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { PlusCircle, Trash2, Target, CheckCircle, Edit3, X } from 'lucide-react';

const GOAL_EMOJIS = ['🎯','🏠','✈️','🚗','💍','📱','🎓','💰','🏋️','🎮','👶','🌏'];

export default function SavingsPage() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [form, setForm] = useState({ name: '', targetAmount: '', savedAmount: '', targetDate: '', emoji: '🎯' });
  const [saving, setSaving] = useState(false);

  const fetchGoals = async () => {
    try {
      const res = await api.getSavingsGoals();
      setGoals(res.data?.goals || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchGoals(); }, []);

  const resetForm = () => setForm({ name: '', targetAmount: '', savedAmount: '', targetDate: '', emoji: '🎯' });

  const handleSave = async () => {
    if (!form.name || !form.targetAmount) return;
    setSaving(true);
    try {
      if (editGoal) {
        await api.updateSavingsGoal(editGoal.id, {
          name: form.name,
          targetAmount: parseFloat(form.targetAmount),
          savedAmount: parseFloat(form.savedAmount || '0'),
          targetDate: form.targetDate || undefined,
          emoji: form.emoji,
        });
        setEditGoal(null);
      } else {
        await api.createSavingsGoal({
          name: form.name,
          targetAmount: parseFloat(form.targetAmount),
          savedAmount: parseFloat(form.savedAmount || '0'),
          targetDate: form.targetDate || undefined,
          emoji: form.emoji,
        });
      }
      resetForm();
      setShowForm(false);
      fetchGoals();
    } finally { setSaving(false); }
  };

  const handleEdit = (g: any) => {
    setEditGoal(g);
    setForm({
      name: g.name,
      targetAmount: String(g.targetAmount),
      savedAmount: String(g.savedAmount),
      targetDate: g.targetDate ? g.targetDate.slice(0,10) : '',
      emoji: g.emoji || '🎯',
    });
    setShowForm(true);
  };

  const handleMarkComplete = async (g: any) => {
    await api.updateSavingsGoal(g.id, { isCompleted: !g.isCompleted });
    fetchGoals();
  };

  const handleDelete = async (id: string) => {
    await api.deleteSavingsGoal(id);
    fetchGoals();
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Savings Goals</h1>
            <p className="text-gray-400 text-sm mt-1">Track your financial targets and milestones</p>
          </div>
          <button
            onClick={() => { resetForm(); setEditGoal(null); setShowForm(!showForm); }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            New Goal
          </button>
        </div>

        {/* Summary */}
        {goals.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
              <p className="text-xl font-bold text-blue-400">₹{totalTarget.toLocaleString('en-IN')}</p>
              <p className="text-gray-400 text-xs mt-1">Total Target</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
              <p className="text-xl font-bold text-green-400">₹{totalSaved.toLocaleString('en-IN')}</p>
              <p className="text-gray-400 text-xs mt-1">Total Saved</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
              <p className="text-xl font-bold text-purple-400">{goals.filter(g => g.isCompleted).length}/{goals.length}</p>
              <p className="text-gray-400 text-xs mt-1">Completed</p>
            </div>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mb-6 p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">{editGoal ? 'Edit Goal' : 'New Savings Goal'}</h3>
              <button onClick={() => { setShowForm(false); setEditGoal(null); resetForm(); }}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            {/* Emoji picker */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {GOAL_EMOJIS.map(e => (
                <button key={e} onClick={() => setForm({ ...form, emoji: e })}
                  className={`w-9 h-9 rounded-lg text-lg transition-all ${form.emoji === e ? 'bg-emerald-500/30 ring-2 ring-emerald-500' : 'bg-gray-800 hover:bg-gray-700'}`}>
                  {e}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Goal name (e.g. Emergency Fund)"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500" />
              <input type="number" placeholder="Target amount (₹)"
                value={form.targetAmount} onChange={e => setForm({ ...form, targetAmount: e.target.value })}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500" />
              <input type="number" placeholder="Already saved (₹)"
                value={form.savedAmount} onChange={e => setForm({ ...form, savedAmount: e.target.value })}
                className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500" />
              <input type="date" placeholder="Target date (optional)"
                value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <button onClick={handleSave} disabled={saving}
              className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : editGoal ? 'Update Goal' : 'Create Goal'}
            </button>
          </div>
        )}

        {/* Goals List */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Loading goals…</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-700 rounded-2xl">
            <Target className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No savings goals yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first goal to start tracking progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map(g => {
              const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0;
              return (
                <div key={g.id} className={`p-4 rounded-xl border transition-all ${g.isCompleted ? 'border-green-500/30 bg-green-500/5' : 'border-gray-700/30 bg-gray-900/50 hover:border-gray-600/50'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.emoji || '🎯'}</span>
                      <div>
                        <p className={`font-medium ${g.isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>{g.name}</p>
                        {g.targetDate && <p className="text-xs text-gray-500 mt-0.5">Target: {new Date(g.targetDate).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleEdit(g)} className="p-1 text-gray-500 hover:text-blue-400 transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleMarkComplete(g)} className={`p-1 transition-colors ${g.isCompleted ? 'text-green-400' : 'text-gray-500 hover:text-green-400'}`}><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(g.id)} className="p-1 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${g.isCompleted ? 'bg-green-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm text-gray-400 min-w-[3rem] text-right">{pct}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Saved: <span className="text-green-400 font-medium">₹{g.savedAmount.toLocaleString('en-IN')}</span></span>
                    <span>Target: <span className="text-white font-medium">₹{g.targetAmount.toLocaleString('en-IN')}</span></span>
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

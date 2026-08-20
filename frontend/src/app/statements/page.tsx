'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { FileText, Trash2, UploadCloud, Calendar, DollarSign, Building2, ArrowRight } from 'lucide-react';

interface BankStatementItem {
  id: string;
  bankName: string;
  fileName: string;
  originalName: string;
  period: string;
  totalCredits: number;
  totalDebits: number;
  uploadedAt: string;
  _count?: { transactions: number };
}

export default function StatementsPage() {
  const [statements, setStatements] = useState<BankStatementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStatements();
  }, []);

  const fetchStatements = async () => {
    setLoading(true);
    try {
      const res = await api.getStatements();
      setStatements(res.data.statements || []);
    } catch (err) {
      console.error('Failed to load statements', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bank statement and all associated transactions?')) return;
    setDeletingId(id);
    try {
      await api.deleteStatement(id);
      setStatements((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert('Failed to delete statement.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Bank Statements Repository</h1>
            <p className="text-slate-400 text-sm mt-1">Manage uploaded PDF statements & view extracted logs</p>
          </div>
          <Link href="/upload">
            <button className="btn-primary text-sm px-4 py-2.5 flex items-center gap-2">
              <UploadCloud size={16} /> Upload Statement
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full" />
          </div>
        ) : statements.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {statements.map((st) => (
              <div key={st.id} className="glass-card p-6 border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center border border-blue-500/20">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">{st.bankName || 'Bank Statement'}</h3>
                        <span className="text-xs text-slate-400">{st.originalName}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(st.id)}
                      disabled={deletingId === st.id}
                      className="text-slate-500 hover:text-rose-400 p-2 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete statement"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs mb-4">
                    <div>
                      <span className="text-slate-500 block">Statement Period</span>
                      <span className="font-semibold text-slate-200">{st.period || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Transactions</span>
                      <span className="font-semibold text-blue-400">{st._count?.transactions ?? 0} Records</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Credits</span>
                      <span className="font-semibold text-emerald-400">₹{st.totalCredits.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Debits</span>
                      <span className="font-semibold text-rose-400">₹{st.totalDebits.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Uploaded {new Date(st.uploadedAt).toLocaleDateString()}</span>
                  <Link href="/dashboard" className="text-blue-400 font-semibold flex items-center gap-1 hover:underline">
                    View in Dashboard <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-12 text-center border-slate-800">
            <FileText size={48} className="mx-auto text-slate-600 mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No Statements Uploaded Yet</h3>
            <p className="text-slate-400 text-sm mb-6">Upload your first bank statement PDF to generate transactions and insights.</p>
            <Link href="/upload">
              <button className="btn-primary text-sm px-5 py-2.5">Upload Bank Statement PDF</button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect, Fragment } from 'react';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { Search, Download, Tag, Building2, ChevronDown, ChevronUp, Info } from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  description: string;
  rawNarration?: string;
  merchantName?: string;
  counterparty?: string;
  channel?: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  subcategory?: string;
  confidence?: 'high' | 'medium' | 'low';
  referenceId?: string;
  balance?: number;
  statement?: { bankName?: string; originalName?: string };
}

const CATEGORY_COLORS: Record<string, string> = {
  Income: '#10b981',
  'Person-to-Person Transfer': '#3b82f6',
  'Food & Dining': '#f59e0b',
  Groceries: '#84cc16',
  Shopping: '#ec4899',
  'Travel & Transport': '#06b6d4',
  Fuel: '#f97316',
  Rent: '#fb923c',
  'Utilities & Bills': '#8b5cf6',
  Healthcare: '#14b8a6',
  Education: '#6366f1',
  'Insurance & Premium': '#38bdf8',
  'EMI & Loans': '#ef4444',
  Investments: '#10b981',
  Subscriptions: '#a855f7',
  Entertainment: '#a855f7',
  'ATM & Cash': '#64748b',
  'Bank Charges': '#94a3b8',
  Taxes: '#dc2626',
  'Other / Needs Review': '#94a3b8',
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [confidenceFilter, setConfidenceFilter] = useState('ALL');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await api.getTransactions({ limit: '300' });
      setTransactions(res.data.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  const filtered = transactions.filter((tx) => {
    const term = searchTerm.toLowerCase();
    const matchSearch =
      tx.description.toLowerCase().includes(term) ||
      (tx.rawNarration && tx.rawNarration.toLowerCase().includes(term)) ||
      (tx.merchantName && tx.merchantName.toLowerCase().includes(term)) ||
      (tx.counterparty && tx.counterparty.toLowerCase().includes(term)) ||
      (tx.referenceId && tx.referenceId.toLowerCase().includes(term));

    const matchCat = categoryFilter === 'ALL' || tx.category === categoryFilter;
    const matchType = typeFilter === 'ALL' || tx.type === typeFilter;
    const matchConf = confidenceFilter === 'ALL' || tx.confidence === confidenceFilter;

    return matchSearch && matchCat && matchType && matchConf;
  });

  const exportCSV = () => {
    const headers = ['Date,Original Raw Narration,Clean Description,Counterparty / Entity,Payment Channel,Category,Subcategory,Confidence,Type,Debit (INR),Credit (INR),Balance (INR),Reference ID'];
    const rows = filtered.map(t => {
      const isCredit = t.type === 'credit';
      const debit = !isCredit ? t.amount : 0;
      const credit = isCredit ? t.amount : 0;
      return `"${new Date(t.date).toLocaleDateString()}","${(t.rawNarration || t.description).replace(/"/g, '""')}","${t.description.replace(/"/g, '""')}","${(t.counterparty || t.merchantName || '').replace(/"/g, '""')}","${t.channel || ''}","${t.category}","${t.subcategory || ''}","${t.confidence || 'medium'}","${t.type}",${debit},${credit},${t.balance || ''},"${t.referenceId || ''}"`;
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FINOVA_Transactions_Master_Ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categoriesList = Array.from(new Set(transactions.map(t => t.category))).sort();

  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Transactions Master Ledger</h1>
            <p className="text-slate-400 text-sm mt-1">
              Preserved multi-line narrations, channel detection & AI entity classification (Click any row to expand details)
            </p>
          </div>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="btn-secondary text-sm px-4 py-2.5 flex items-center gap-2 border-slate-700 hover:bg-slate-800 disabled:opacity-50"
          >
            <Download size={16} /> Export Full Ledger CSV
          </button>
        </div>

        {/* Filter Bar */}
        <div className="glass-card p-4 border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="relative flex-1 min-w-[260px]">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search raw narration, counterparty, channel or UTR reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900/90 border border-slate-700/80 text-xs text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 w-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-700/80 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories ({categoriesList.length})</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-700/80 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="credit">Credit (Inflow)</option>
              <option value="debit">Debit (Outflow)</option>
            </select>

            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-700/80 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Confidence Levels</option>
              <option value="high">High Confidence</option>
              <option value="medium">Medium Confidence</option>
              <option value="low">Low Confidence</option>
            </select>
          </div>
        </div>

        {/* Master Transactions Table */}
        <div className="glass-card p-6 border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-3 py-3.5 w-8"></th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Description / Counterparty</th>
                  <th className="px-4 py-3.5">Category & Subcategory</th>
                  <th className="px-4 py-3.5 text-center">Confidence</th>
                  <th className="px-4 py-3.5 text-right">Debit (₹)</th>
                  <th className="px-4 py-3.5 text-right">Credit (₹)</th>
                  <th className="px-4 py-3.5 text-right">Balance (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full mx-auto" />
                      <p className="text-slate-400 text-xs mt-2">Loading master transactions ledger...</p>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((tx) => {
                    const isCredit = tx.type === 'credit';
                    const color = CATEGORY_COLORS[tx.category] || '#94a3b8';
                    const conf = tx.confidence || 'medium';
                    const isExpanded = expandedTxId === tx.id;
                    const entity = tx.counterparty || tx.merchantName || 'Extracted Entity';

                    return (
                      <Fragment key={tx.id}>
                        <tr
                          onClick={() => toggleExpand(tx.id)}
                          className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${
                            isExpanded ? 'bg-slate-800/60' : ''
                          }`}
                        >
                          {/* Expand Icon */}
                          <td className="px-3 py-3.5 text-slate-400">
                            {isExpanded ? <ChevronUp size={16} className="text-blue-400" /> : <ChevronDown size={16} />}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>

                          {/* Description & Counterparty */}
                          <td className="px-4 py-3.5 max-w-md">
                            <div className="font-semibold text-white text-xs truncate flex items-center gap-1.5">
                              <Building2 size={13} className="text-blue-400 shrink-0" />
                              <span>{entity}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5" title={tx.description}>
                              {tx.description}
                            </div>
                            {tx.channel && (
                              <span className="inline-block text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded mt-1">
                                {tx.channel}
                              </span>
                            )}
                          </td>

                          {/* Category & Subcategory */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span
                              className="px-2.5 py-1 rounded-full font-semibold text-[10px] inline-flex items-center gap-1"
                              style={{
                                backgroundColor: `${color}18`,
                                color: color,
                                border: `1px solid ${color}35`,
                              }}
                            >
                              <Tag size={10} />
                              {tx.category}
                            </span>
                            {tx.subcategory && (
                              <div className="text-[10px] text-slate-400 mt-1 pl-1">
                                ↳ {tx.subcategory}
                              </div>
                            )}
                          </td>

                          {/* Confidence Level */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                                conf === 'high'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : conf === 'medium'
                                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {conf}
                            </span>
                          </td>

                          {/* Debit */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold text-slate-200">
                            {!isCredit ? `₹${tx.amount.toLocaleString('en-IN')}` : '-'}
                          </td>

                          {/* Credit */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right font-bold text-emerald-400">
                            {isCredit ? `+₹${tx.amount.toLocaleString('en-IN')}` : '-'}
                          </td>

                          {/* Balance */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-right text-slate-400 font-mono text-[11px]">
                            {tx.balance !== undefined && tx.balance !== null
                              ? `₹${tx.balance.toLocaleString('en-IN')}`
                              : '-'}
                          </td>
                        </tr>

                        {/* ── EXPANDABLE TRANSACTION DETAIL VIEW ──────────────── */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80 border-b border-slate-800">
                            <td colSpan={8} className="p-5">
                              <div className="flex flex-col gap-4 text-xs">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                  <div className="flex items-center gap-2 text-blue-400 font-bold">
                                    <Info size={16} />
                                    <span>Parser & Categorization Audit Trace</span>
                                  </div>
                                  <span className="text-slate-400 text-[11px]">
                                    Transaction ID: <code className="text-slate-200 font-mono">{tx.id}</code>
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Raw Narration */}
                                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                      Original Raw Statement Narration (PDF Input)
                                    </span>
                                    <p className="font-mono text-slate-200 text-xs bg-slate-950/80 p-2.5 rounded border border-slate-800/80 break-words leading-relaxed">
                                      {tx.rawNarration || tx.description}
                                    </p>
                                  </div>

                                  {/* Classification Analysis */}
                                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                      AI Intelligence Extraction & Mapping
                                    </span>

                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                      <div>
                                        <span className="text-[11px] text-slate-400 block">Extracted Entity:</span>
                                        <span className="font-semibold text-white">{entity}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-slate-400 block">Payment Channel:</span>
                                        <span className="font-semibold text-blue-400">{tx.channel || 'Bank Direct'}</span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-slate-400 block">Direction Evidence:</span>
                                        <span className={`font-semibold ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {isCredit ? 'Credit Column (Inflow)' : 'Debit Column (Outflow)'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-[11px] text-slate-400 block">Confidence Score:</span>
                                        <span className="font-semibold text-purple-400 uppercase">{conf}</span>
                                      </div>
                                      {tx.referenceId && (
                                        <div className="col-span-2">
                                          <span className="text-[11px] text-slate-400 block">Reference / UTR ID:</span>
                                          <span className="font-mono text-xs text-slate-200">{tx.referenceId}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No transactions match the selected filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

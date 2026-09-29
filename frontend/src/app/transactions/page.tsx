'use client';

import { useState, useEffect, Fragment } from 'react';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import {
  Search, Download, Tag, Building2, ChevronDown, ChevronUp,
  Info, AlertTriangle, CheckCircle, X, Shield, Zap, Clock
} from 'lucide-react';

interface Transaction {
  id: string;
  date: string;
  time?: string;
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
  source?: string;
  provider?: string;
  isDuplicate?: boolean;
  needsReview?: boolean;
  reviewedAt?: string;
  userCategory?: string;
  userSubcategory?: string;
  userNote?: string;
  classificationReason?: string;
  statement?: { bankName?: string; originalName?: string };
  entityType?: string;
  businessType?: string;
  transactionType?: string;
  legalName?: string;
  parentCompany?: string;
  extractedVPA?: string;
  upiId?: string;
  orderId?: string;
  notes?: string;
  linkedAccount?: string;
  matchedAlias?: string;
}

const ALL_CATEGORIES = [
  'Income',
  'Person-to-Person Transfer',
  'Food & Dining',
  'Groceries',
  'Shopping',
  'Travel & Transport',
  'Fuel',
  'Rent',
  'Utilities & Bills',
  'Healthcare',
  'Education',
  'Insurance & Premium',
  'EMI & Loans',
  'Investments',
  'Subscriptions',
  'Entertainment',
  'ATM & Cash',
  'Bank Charges',
  'Taxes',
  'Business Income',
  'Business Expense',
  'Other / Needs Review',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Income': '#10b981',
  'Person-to-Person Transfer': '#3b82f6',
  'Food & Dining': '#f59e0b',
  'Groceries': '#84cc16',
  'Shopping': '#ec4899',
  'Travel & Transport': '#06b6d4',
  'Fuel': '#f97316',
  'Rent': '#fb923c',
  'Utilities & Bills': '#8b5cf6',
  'Healthcare': '#14b8a6',
  'Education': '#6366f1',
  'Insurance & Premium': '#38bdf8',
  'EMI & Loans': '#ef4444',
  'Investments': '#10b981',
  'Subscriptions': '#a855f7',
  'Entertainment': '#a855f7',
  'ATM & Cash': '#64748b',
  'Bank Charges': '#94a3b8',
  'Taxes': '#dc2626',
  'Business Income': '#34d399',
  'Business Expense': '#f87171',
  'Other / Needs Review': '#94a3b8',
};

// ── Review Modal ──────────────────────────────────────────────────────────────
interface ReviewModalProps {
  tx: Transaction;
  onClose: () => void;
  onSaved: (updatedTx: Transaction) => void;
}

function ReviewModal({ tx, onClose, onSaved }: ReviewModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(tx.userCategory || tx.category);
  const [selectedSubcategory, setSelectedSubcategory] = useState(tx.userSubcategory || tx.subcategory || '');
  const [userNote, setUserNote] = useState(tx.userNote || '');
  const [rememberThis, setRememberThis] = useState(false);
  const [applyToExisting, setApplyToExisting] = useState(false);
  const [matchNarration, setMatchNarration] = useState(
    // Pre-fill with first meaningful word from narration
    (tx.rawNarration || tx.description || '').split(/[\s|]+/).find(t => t.length > 3 && !/^\d+$/.test(t)) || ''
  );
  const [matchMerchant, setMatchMerchant] = useState(tx.counterparty || tx.merchantName || '');
  const [matchVPA, setMatchVPA] = useState(tx.upiId || tx.extractedVPA || '');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPreview = async () => {
    if (!rememberThis || (!matchNarration && !matchMerchant && !matchVPA)) return;
    setIsPreviewLoading(true);
    try {
      const res = await api.previewReviewMatch(tx.id, {
        matchNarration: matchNarration || undefined,
        matchMerchant: matchMerchant || undefined,
        matchVPA: matchVPA || undefined,
        matchDirection: tx.type,
      });
      setPreviewCount(res.data.matchingCount ?? 0);
    } catch { setPreviewCount(null); }
    finally { setIsPreviewLoading(false); }
  };

  useEffect(() => {
    if (rememberThis) fetchPreview();
    else setPreviewCount(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rememberThis, matchNarration, matchMerchant, matchVPA]);

  const handleSave = async () => {
    if (!selectedCategory) { setError('Please select a category.'); return; }
    if (rememberThis && !matchNarration && !matchMerchant && !matchVPA) {
      setError('To remember this classification, provide at least one matching signal (narration / merchant / UPI VPA).');
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const res = await api.reviewTransaction(tx.id, {
        category: selectedCategory,
        subcategory: selectedSubcategory || undefined,
        userNote: userNote || undefined,
        rememberThis,
        applyToExisting: rememberThis ? applyToExisting : false,
        matchNarration: rememberThis ? (matchNarration || undefined) : undefined,
        matchMerchant: rememberThis ? (matchMerchant || undefined) : undefined,
        matchVPA: rememberThis ? (matchVPA || undefined) : undefined,
        matchDirection: tx.type,
        ruleName: rememberThis ? `${(matchMerchant || matchNarration || '').slice(0, 30)} → ${selectedCategory}` : undefined,
      });
      setSuccess(res.message || 'Saved!');
      setTimeout(() => { onSaved(res.data.transaction); onClose(); }, 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Tag size={18} className="text-orange-400" />
              Classify Transaction
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Correct the category without changing any financial data</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 flex flex-col gap-5">
          {/* Transaction Summary */}
          <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 text-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Transaction</p>
                <p className="text-white font-semibold">{tx.counterparty || tx.merchantName || tx.description}</p>
                <p className="text-slate-500 text-[11px] mt-0.5 font-mono">{tx.rawNarration?.slice(0, 80)}</p>
              </div>
              <div className={`text-right shrink-0 font-bold text-sm ${tx.type === 'credit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Current Auto-Classification */}
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/40 px-3 py-2 rounded-lg">
            <Info size={14} className="text-blue-400 shrink-0" />
            <span>Auto-classified as <span className="text-white font-semibold">{tx.category}</span>
            {tx.classificationReason ? ` — ${tx.classificationReason.slice(0, 80)}` : ''}</span>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Correct Category</label>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500"
            >
              {ALL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Subcategory <span className="text-slate-500">(optional)</span></label>
            <input
              type="text"
              value={selectedSubcategory}
              onChange={e => setSelectedSubcategory(e.target.value)}
              placeholder="e.g. Salary, Groceries - Online, EMI - Home Loan"
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Note <span className="text-slate-500">(optional)</span></label>
            <input
              type="text"
              value={userNote}
              onChange={e => setUserNote(e.target.value)}
              placeholder="Add a personal note for this transaction"
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Remember This Toggle */}
          <div className="border border-slate-700 rounded-xl p-4 bg-slate-800/30">
            <label className="flex items-center justify-between gap-3 cursor-pointer" htmlFor="rememberToggle">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" />
                  Apply this classification to similar future transactions
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Creates a personal rule using the signals below</p>
              </div>
              <button
                id="rememberToggle"
                type="button"
                onClick={() => setRememberThis(v => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${rememberThis ? 'bg-blue-600' : 'bg-slate-700'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${rememberThis ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </label>

            {rememberThis && (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Matching Signals (fill at least one)</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Narration contains</label>
                    <input
                      type="text"
                      value={matchNarration}
                      onChange={e => setMatchNarration(e.target.value)}
                      placeholder="e.g. ABC SERVICES"
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Merchant / Counterparty</label>
                    <input
                      type="text"
                      value={matchMerchant}
                      onChange={e => setMatchMerchant(e.target.value)}
                      placeholder="e.g. Swiggy"
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">UPI VPA</label>
                    <input
                      type="text"
                      value={matchVPA}
                      onChange={e => setMatchVPA(e.target.value)}
                      placeholder="e.g. merchant@bank"
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                    />
                  </div>
                </div>

                {/* Preview count */}
                {isPreviewLoading ? (
                  <p className="text-xs text-slate-500">Checking matches...</p>
                ) : previewCount !== null ? (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2 text-xs text-blue-300">
                    {previewCount === 0
                      ? 'No existing transactions match these signals.'
                      : `${previewCount} existing transaction${previewCount === 1 ? '' : 's'} match these signals.`}
                  </div>
                ) : null}

                {/* Apply to existing */}
                {previewCount !== null && previewCount > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyToExisting}
                      onChange={e => setApplyToExisting(e.target.checked)}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className="text-xs text-slate-300">
                      Also apply to all {previewCount} existing matching transaction{previewCount === 1 ? '' : 's'}
                    </span>
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Feedback */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle size={13} /> {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle size={13} /> {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1 pb-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" /> : <CheckCircle size={14} />}
              {isSaving ? 'Saving...' : 'Save Classification'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Entity & Type Badges ──────────────────────────────────────────────────────
const EntityTypeBadge = ({ entityType }: { entityType?: string }) => {
  if (!entityType) return <span className="font-semibold text-slate-400 text-xs">Unknown</span>;
  let color = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  if (entityType.includes('Merchant') || entityType.includes('Platform')) color = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (entityType.includes('Person')) color = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
  if (entityType.includes('Financial') || entityType.includes('Bank') || entityType.includes('Investment')) color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  if (entityType.includes('Government')) color = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  if (entityType.includes('Utility')) color = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  if (entityType.includes('Review')) color = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${color} inline-flex w-fit`}>
      {entityType}
    </span>
  );
};

const TransactionTypeBadge = ({ txType }: { txType?: string }) => {
  if (!txType) return <span className="font-semibold text-slate-400 text-xs">Unknown</span>;
  let color = 'text-slate-400';
  if (txType === 'Income' || txType === 'Refund') color = 'text-emerald-400';
  if (txType === 'Expense' || txType === 'EMI/Loan') color = 'text-rose-400';
  if (txType === 'Transfer' || txType === 'P2P') color = 'text-blue-400';
  if (txType === 'Investment') color = 'text-purple-400';
  return <span className={`font-semibold text-xs ${color}`}>{txType}</span>;
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [reviewingTx, setReviewingTx] = useState<Transaction | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'review'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [confidenceFilter, setConfidenceFilter] = useState('ALL');

  useEffect(() => { fetchTransactions(); }, []);

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

  const handleTransactionUpdated = (updated: Transaction) => {
    setTransactions(prev => prev.map(tx => tx.id === updated.id ? { ...tx, ...updated } : tx));
  };

  const toggleExpand = (id: string) => {
    setExpandedTxId(expandedTxId === id ? null : id);
  };

  const needsReviewCount = transactions.filter(t => t.needsReview && !t.reviewedAt).length;

  const filtered = transactions.filter((tx) => {
    // Tab filter
    if (activeTab === 'review' && (!tx.needsReview || tx.reviewedAt)) return false;

    const term = searchTerm.toLowerCase();
    const matchSearch =
      tx.description.toLowerCase().includes(term) ||
      (tx.rawNarration && tx.rawNarration.toLowerCase().includes(term)) ||
      (tx.merchantName && tx.merchantName.toLowerCase().includes(term)) ||
      (tx.counterparty && tx.counterparty.toLowerCase().includes(term)) ||
      (tx.referenceId && tx.referenceId.toLowerCase().includes(term));

    const matchCat  = categoryFilter === 'ALL' || tx.category === categoryFilter;
    const matchType = typeFilter === 'ALL' || tx.type === typeFilter;
    const matchConf = confidenceFilter === 'ALL' || tx.confidence === confidenceFilter;

    return matchSearch && matchCat && matchType && matchConf;
  });

  const exportCSV = () => {
    const headers = ['Date,Time,Original Raw Narration,Clean Description,Counterparty / Entity,Payment Channel,Statement Source,Provider,Category,Subcategory,Confidence,Type,Debit (INR),Credit (INR),Balance (INR),Reference ID,UPI ID,Order ID,Notes,Linked Account'];
    const rows = filtered.map(t => {
      const isCredit = t.type === 'credit';
      const debit  = !isCredit ? t.amount : 0;
      const credit = isCredit  ? t.amount : 0;
      return [
        `"${new Date(t.date).toLocaleDateString('en-IN')}"`,
        `"${t.time || ''}"`,
        `"${(t.rawNarration || t.description).replace(/"/g, '""')}"`,
        `"${t.description.replace(/"/g, '""')}"`,
        `"${(t.counterparty || t.merchantName || '').replace(/"/g, '""')}"`,
        `"${t.channel || ''}"`,
        `"${t.source || 'BANK'}"`,
        `"${t.provider || ''}"`,
        `"${t.category}"`,
        `"${t.subcategory || ''}"`,
        `"${t.confidence || 'medium'}"`,
        `"${t.type}"`,
        debit, credit,
        `${t.balance || ''}`,
        `"${t.referenceId || ''}"`,
        `"${t.upiId || ''}"`,
        `"${t.orderId || ''}"`,
        `"${t.notes || ''}"`,
        `"${t.linkedAccount || ''}"`,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `FINOVA_Transactions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const categoriesList = Array.from(new Set(transactions.map(t => t.category))).sort();

  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      <Navbar />

      {reviewingTx && (
        <ReviewModal
          tx={reviewingTx}
          onClose={() => setReviewingTx(null)}
          onSaved={handleTransactionUpdated}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Transactions Master Ledger</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Verbatim financial data · Click a row to expand · Click the category badge to review
            </p>
          </div>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="btn-secondary text-xs sm:text-sm px-4 py-2.5 flex items-center justify-center gap-2 border-slate-700 hover:bg-slate-800 disabled:opacity-50 w-full sm:w-auto"
          >
            <Download size={16} /> Export Full Ledger CSV
          </button>
        </div>

        {/* Tabs — All / Needs Review */}
        <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-800 rounded-xl p-1 w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs sm:text-sm rounded-lg font-semibold transition-colors ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            All Transactions
          </button>
          <button
            onClick={() => setActiveTab('review')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs sm:text-sm rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${activeTab === 'review' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <AlertTriangle size={14} />
            Needs Review
            {needsReviewCount > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === 'review' ? 'bg-white/20 text-white' : 'bg-orange-500/20 text-orange-400'}`}>
                {needsReviewCount}
              </span>
            )}
          </button>
        </div>

        {/* Needs Review Info Banner */}
        {activeTab === 'review' && needsReviewCount > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-orange-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-300">{needsReviewCount} transaction{needsReviewCount === 1 ? '' : 's'} need your review</p>
              <p className="text-xs text-orange-400/80 mt-1">
                These were classified with low confidence or have unrecognised dates/entities.
                Click the category badge on any row to select the correct category and optionally create a rule for future auto-classification.
              </p>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="glass-card p-3.5 sm:p-4 border-slate-800 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-4">
          <div className="relative flex-1 min-w-[200px] w-full">
            <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search narration, counterparty, UTR reference..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-900/90 border border-slate-700/80 text-xs text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 w-full"
            />
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="col-span-2 sm:col-span-1 bg-slate-900/90 border border-slate-700/80 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 truncate"
            >
              <option value="ALL">All Categories ({categoriesList.length})</option>
              {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-700/80 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Types</option>
              <option value="credit">Credit (Inflow)</option>
              <option value="debit">Debit (Outflow)</option>
            </select>
            <select
              value={confidenceFilter}
              onChange={e => setConfidenceFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-700/80 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Confidence</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="glass-card p-6 border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-3 py-3.5 w-8"></th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Description / Counterparty</th>
                  <th className="px-4 py-3.5">Category</th>
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
                      <p className="text-slate-400 text-xs mt-2">Loading transactions...</p>
                    </td>
                  </tr>
                ) : filtered.length > 0 ? (
                  filtered.map((tx) => {
                    const isCredit   = tx.type === 'credit';
                    const color      = CATEGORY_COLORS[tx.category] || '#94a3b8';
                    const conf       = tx.confidence || 'medium';
                    const isExpanded = expandedTxId === tx.id;
                    const entity     = tx.counterparty || tx.merchantName || 'Extracted Entity';
                    const wasReviewed = !!tx.reviewedAt;

                    return (
                      <Fragment key={tx.id}>
                        <tr
                          onClick={() => toggleExpand(tx.id)}
                          className={`hover:bg-slate-800/50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-800/60' : ''} ${tx.needsReview && !wasReviewed ? 'border-l-2 border-orange-500/60' : ''}`}
                        >
                          <td className="px-3 py-3.5 text-slate-400">
                            {isExpanded ? <ChevronUp size={16} className="text-blue-400" /> : <ChevronDown size={16} />}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            {tx.time && <span className="block text-slate-600 text-[10px]">{tx.time}</span>}
                          </td>

                          {/* Description & Counterparty */}
                          <td className="px-4 py-3.5 max-w-md">
                            <div className="font-semibold text-white text-xs truncate flex items-center gap-1.5">
                              <Building2 size={13} className="text-blue-400 shrink-0" />
                              <span>{entity}</span>
                              {tx.isDuplicate && (
                                <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">DUPE?</span>
                              )}
                              {tx.needsReview && !wasReviewed && (
                                <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">REVIEW</span>
                              )}
                              {wasReviewed && (
                                <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                                  <CheckCircle size={8} /> REVIEWED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate mt-0.5" title={tx.description}>{tx.description}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              {tx.channel && (
                                <span className="inline-block text-[9px] font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">{tx.channel}</span>
                              )}
                              {tx.source === 'WALLET' && (
                                <span className="inline-block text-[9px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded">
                                  📱 {tx.provider || 'WALLET'}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Category — clickable to review */}
                          <td className="px-4 py-3.5 whitespace-nowrap" onClick={e => { e.stopPropagation(); setReviewingTx(tx); }}>
                            <span
                              className="px-2.5 py-1 rounded-full font-semibold text-[10px] inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                              style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}35` }}
                              title="Click to reclassify"
                            >
                              <Tag size={10} />
                              {tx.category}
                            </span>
                            {tx.subcategory && (
                              <div className="text-[10px] text-slate-400 mt-1 pl-1">↳ {tx.subcategory}</div>
                            )}
                          </td>

                          {/* Confidence */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider ${
                              conf === 'high'   ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : conf === 'medium' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            :                    'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            }`}>{conf}</span>
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
                            {tx.balance != null ? `₹${tx.balance.toLocaleString('en-IN')}` : '-'}
                          </td>
                        </tr>

                        {/* Expanded Detail Row */}
                        {isExpanded && (
                          <tr className="bg-slate-950/80 border-b border-slate-800">
                            <td colSpan={8} className="p-5">
                              <div className="flex flex-col gap-4 text-xs">
                                {/* Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs sm:text-sm">
                                    <Info size={16} className="shrink-0" />
                                    <span>Entity Intelligence — Categorization Audit</span>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 min-w-0">
                                    <button
                                      onClick={e => { e.stopPropagation(); setReviewingTx(tx); }}
                                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-colors shrink-0"
                                    >
                                      <Tag size={12} /> Reclassify
                                    </button>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 select-all overflow-x-auto max-w-full">
                                      <span className="font-semibold text-slate-500 shrink-0">ID:</span>
                                      <code className="text-slate-200 font-mono text-[11px] whitespace-nowrap select-all">{tx.id}</code>
                                    </div>
                                  </div>
                                </div>

                                {/* Row 1: Entity Identity */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Identified Entity</span>
                                    <span className="font-semibold text-white text-sm">{entity}</span>
                                    {tx.legalName && <span className="text-[10px] text-slate-400 block mt-0.5 truncate">{tx.legalName}</span>}
                                    {tx.parentCompany && <span className="text-[10px] text-slate-500 block truncate">↳ {tx.parentCompany}</span>}
                                  </div>
                                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Entity Type</span>
                                    <EntityTypeBadge entityType={tx.entityType} />
                                  </div>
                                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Business Type</span>
                                    <span className="font-semibold text-cyan-300 text-xs">{tx.businessType || 'Unknown'}</span>
                                  </div>
                                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Transaction Type</span>
                                    <TransactionTypeBadge txType={tx.transactionType} />
                                  </div>
                                </div>

                                {/* Row 2: Technical Details */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">Original Raw Statement Narration</span>
                                    <p className="font-mono text-slate-200 text-[11px] bg-slate-950/80 p-2.5 rounded border border-slate-800/80 break-words leading-relaxed">
                                      {tx.rawNarration || tx.description}
                                    </p>
                                  </div>

                                  <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Extraction Details</span>
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                      <div>
                                        <span className="text-[10px] text-slate-500 block">Payment Channel</span>
                                        <span className="font-semibold text-blue-400 text-xs">{tx.channel || 'Bank Transfer'}</span>
                                      </div>
                                      <div>
                                        <span className="text-[10px] text-slate-500 block">Statement Source</span>
                                        <span className={`font-semibold text-xs ${tx.source === 'WALLET' ? 'text-purple-400' : 'text-blue-400'}`}>
                                          {tx.source === 'WALLET' ? `📱 ${tx.provider || 'Wallet'}` : `🏦 ${tx.provider || 'Bank'}`}
                                        </span>
                                      </div>
                                      {tx.time && (
                                        <div>
                                          <span className="text-[10px] text-slate-500 block">Time</span>
                                          <span className="font-mono text-xs text-slate-300 flex items-center gap-1"><Clock size={10} />{tx.time}</span>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-[10px] text-slate-500 block">Confidence</span>
                                        <span className="font-semibold text-purple-400 uppercase text-xs">{tx.confidence || 'medium'}</span>
                                      </div>
                                      {tx.upiId && (
                                        <div>
                                          <span className="text-[10px] text-slate-500 block">UPI ID</span>
                                          <span className="font-mono text-[10px] text-emerald-300 break-all">{tx.upiId}</span>
                                        </div>
                                      )}
                                      {tx.extractedVPA && !tx.upiId && (
                                        <div>
                                          <span className="text-[10px] text-slate-500 block">Matched VPA</span>
                                          <span className="font-mono text-[10px] text-emerald-300 break-all">{tx.extractedVPA}</span>
                                        </div>
                                      )}
                                      {tx.matchedAlias && (
                                        <div>
                                          <span className="text-[10px] text-slate-500 block">Matched Alias</span>
                                          <span className="font-mono text-[10px] text-yellow-300">"{tx.matchedAlias}"</span>
                                        </div>
                                      )}
                                      {tx.orderId && (
                                        <div>
                                          <span className="text-[10px] text-slate-500 block">Order ID</span>
                                          <span className="font-mono text-[10px] text-slate-300">{tx.orderId}</span>
                                        </div>
                                      )}
                                      {tx.linkedAccount && (
                                        <div>
                                          <span className="text-[10px] text-slate-500 block">Linked Account</span>
                                          <span className="text-[10px] text-slate-300">{tx.linkedAccount}</span>
                                        </div>
                                      )}
                                      {tx.referenceId && (
                                        <div className="col-span-2">
                                          <span className="text-[10px] text-slate-500 block">Reference / UTR ID</span>
                                          <span className="font-mono text-[11px] text-slate-200">{tx.referenceId}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Notes from source */}
                                {tx.notes && (
                                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Notes (from source file)</span>
                                    <p className="text-slate-300 text-xs">{tx.notes}</p>
                                  </div>
                                )}

                                {/* User Note */}
                                {tx.userNote && (
                                  <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3">
                                    <span className="text-[10px] font-bold uppercase text-purple-400 block mb-1">📝 Your Note</span>
                                    <p className="text-slate-300 text-xs">{tx.userNote}</p>
                                  </div>
                                )}

                                {/* WHY Explanation */}
                                {tx.classificationReason && (
                                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block mb-1.5">💡 Classification Reason</span>
                                    <p className="text-slate-300 text-xs leading-relaxed">{tx.classificationReason}</p>
                                  </div>
                                )}

                                {/* Flags */}
                                {(tx.isDuplicate || (tx.needsReview && !tx.reviewedAt)) && (
                                  <div className="flex gap-3">
                                    {tx.isDuplicate && (
                                      <div className="flex-1 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
                                        <span className="text-[10px] font-bold uppercase text-yellow-400">⚠ Possible Duplicate</span>
                                        <p className="text-yellow-300/70 text-xs mt-1">Similar date, amount and narration to an existing record.</p>
                                      </div>
                                    )}
                                    {tx.needsReview && !tx.reviewedAt && (
                                      <div className="flex-1 bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 flex items-start justify-between gap-3">
                                        <div>
                                          <span className="text-[10px] font-bold uppercase text-orange-400">🔍 Needs Review</span>
                                          <p className="text-orange-300/70 text-xs mt-1">Low-confidence classification. Manual review recommended.</p>
                                        </div>
                                        <button
                                          onClick={e => { e.stopPropagation(); setReviewingTx(tx); }}
                                          className="shrink-0 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-300 hover:bg-orange-500/30 transition-colors"
                                        >
                                          Review Now →
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
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
                      {activeTab === 'review' ? '✅ All transactions have been reviewed!' : 'No transactions match the selected filters.'}
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

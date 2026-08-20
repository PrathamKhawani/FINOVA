'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Upload,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';

interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
  savingsRate: number;
  discretionarySpendRatio: number;
  debtToIncomeRatio: number;
  totalTransactions: number;
  statementsCount: number;
}

interface SmartInsight {
  type: 'success' | 'warning' | 'info' | 'alert';
  title: string;
  message: string;
  explanation: string;
  metric?: string;
}

interface RecurringItem {
  name: string;
  amount: number;
  category: string;
  frequency: string;
  confidence: string;
  lastDate: string;
}

interface ForecastModel {
  expectedIncome: number;
  expectedFixedCommitments: number;
  estimatedDiscretionaryExpenses: number;
  projectedMonthEndBalance: number;
  recurringItems: RecurringItem[];
  basisExplanation: string;
  hasHistoricalData: boolean;
}

interface DashboardData {
  summary: DashboardSummary;
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  incomeBreakdown: Array<{ category: string; amount: number; percentage: number }>;
  topMerchants: Array<{ name: string; amount: number; count: number }>;
  insights: SmartInsight[];
  forecast: ForecastModel;
  recentTransactions: any[];
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

export default function DashboardPage() {
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, txRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getTransactions({ limit: '50' }),
      ]);
      setDashData(sumRes.data);
      setTransactions(txRes.data.transactions || []);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load financial analytics.');
    } finally {
      setLoading(false);
    }
  };

  const summary = dashData?.summary ?? null;
  const insights = dashData?.insights ?? [];
  const forecast = dashData?.forecast ?? null;
  const topCategories = dashData?.categoryBreakdown ?? [];
  const recurringItems = forecast?.recurringItems ?? [];

  // Filtered transactions for quick view table
  const filteredTransactions = transactions.filter((tx) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      tx.description.toLowerCase().includes(term) ||
      (tx.merchantName && tx.merchantName.toLowerCase().includes(term));
    const matchesCategory = categoryFilter === 'ALL' || tx.category === categoryFilter;
    const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
    return matchesSearch && matchesCategory && matchesType;
  });

  const categoryData = topCategories.map((item) => ({
    name: item.category,
    value: item.amount,
    color: CATEGORY_COLORS[item.category] || '#94a3b8',
  }));

  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-fadeInUp">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Financial Intelligence Infrastructure
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Automated multi-bank processing, rule-based classification & predictive cash flow analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/transactions">
              <button className="btn-secondary text-sm px-4 py-2.5 flex items-center gap-2">
                <Layers size={16} /> View Master Ledger
              </button>
            </Link>
            <Link href="/upload">
              <button className="btn-primary flex items-center gap-2 text-sm px-5 py-2.5 shadow-lg shadow-blue-500/20">
                <Upload size={16} /> Upload Bank Statement
              </button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full mb-4" />
            <p className="text-slate-400 text-sm font-medium">Running Financial Intelligence engine...</p>
          </div>
        ) : (
          <>
            {/* ── Metric Summary Cards ────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fadeInUp">
              {/* Total Income */}
              <div className="glass-card p-6 border-emerald-500/20 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Income</span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                    <ArrowDownLeft size={20} />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-black text-emerald-400">
                  ₹{(summary?.totalIncome || 0).toLocaleString('en-IN')}
                </div>
                <div className="mt-2 text-xs text-slate-400">Extracted salary & business credits</div>
              </div>

              {/* Total Expenses */}
              <div className="glass-card p-6 border-rose-500/20 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Expenses</span>
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                    <ArrowUpRight size={20} />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-black text-rose-400">
                  ₹{(summary?.totalExpenses || 0).toLocaleString('en-IN')}
                </div>
                <div className="mt-2 text-xs text-slate-400">Automated debit categorization</div>
              </div>

              {/* Net Cash Flow */}
              <div className="glass-card p-6 border-blue-500/20 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Cash Flow</span>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                    <DollarSign size={20} />
                  </div>
                </div>
                <div className={`text-2xl md:text-3xl font-black ${(summary?.netSavings || 0) >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                  ₹{(summary?.netSavings || 0).toLocaleString('en-IN')}
                </div>
                <div className="mt-2 text-xs text-slate-400">Net retained cash surplus</div>
              </div>

              {/* Savings Rate */}
              <div className="glass-card p-6 border-purple-500/20 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Savings Rate</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center">
                    <TrendingUp size={20} />
                  </div>
                </div>
                <div className="text-2xl md:text-3xl font-black text-purple-400">
                  {(summary?.savingsRate || 0).toFixed(1)}%
                </div>
                <div className="mt-2 text-xs text-slate-400">Target benchmark: &gt; 20.0%</div>
              </div>
            </div>

            {/* ── Visual Analytics Section ────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Breakdown Chart */}
              <div className="glass-card p-6 lg:col-span-2 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <PieIcon size={18} className="text-blue-400" /> Spending Distribution by Category
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">Calculated directly from categorized bank statement debits</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                    {categoryData.length} Active Categories
                  </span>
                </div>

                {categoryData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} margin={{ top: 10, right: 10, left: 0, bottom: 35 }}>
                        <XAxis dataKey="name" stroke="#64748b" fontSize={9} interval={0} angle={-30} textAnchor="end" />
                        <YAxis stroke="#64748b" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
                        <Tooltip
                          contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: '10px' }}
                          formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm">
                    No expense category data available. Upload a statement to populate.
                  </div>
                )}
              </div>

              {/* Recurring Subscriptions & Fixed Commitments Widget */}
              <div className="glass-card p-6 flex flex-col justify-between border-purple-500/20">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">Fixed Commitments</h2>
                        <p className="text-xs text-slate-400">EMIs, Subscriptions & Rent</p>
                      </div>
                    </div>
                    <span className="text-xs text-purple-400 font-bold bg-purple-500/10 px-2 py-1 rounded">
                      ₹{(forecast?.expectedFixedCommitments || 0).toLocaleString('en-IN')}/mo
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {recurringItems.length > 0 ? (
                      recurringItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <div className="truncate pr-2">
                            <span className="font-semibold text-white block truncate">{item.name}</span>
                            <span className="text-[10px] text-slate-400">{item.category} • {item.lastDate}</span>
                          </div>
                          <span className="font-bold text-purple-400 shrink-0">
                            ₹{item.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-center">
                        No recurring monthly commitments detected.
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Detected Patterns: <strong className="text-white">{recurringItems.length}</strong></span>
                  <span>Debt/Income Ratio: <strong className="text-white">{summary?.debtToIncomeRatio || 0}%</strong></span>
                </div>
              </div>
            </div>

            {/* ── Financial Insights & Predictive Forecast Row ───────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Smart Insights Widget */}
              <div className="glass-card p-6 border-blue-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Smart Financial Insights</h2>
                      <p className="text-xs text-slate-400">Data-backed analysis explaining why each insight was generated</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
                    {insights.length > 0 ? (
                      insights.map((insight, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-sm flex items-center gap-2">
                              {insight.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400" />}
                              {insight.type === 'warning' && <AlertTriangle size={16} className="text-amber-400" />}
                              {insight.type === 'alert' && <AlertTriangle size={16} className="text-rose-400" />}
                              {insight.type === 'info' && <Info size={16} className="text-blue-400" />}
                              {insight.title}
                            </span>
                            {insight.metric && (
                              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold text-[11px]">
                                {insight.metric}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-200">{insight.message}</p>
                          <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
                            <strong className="text-slate-300">Why generated: </strong>
                            {insight.explanation}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 text-center">
                        Upload bank statements to view automated spending insights and warnings.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Predictive Financial Forecast Widget */}
              <div className="glass-card p-6 border-emerald-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <TrendingUp size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">Predictive Cash Flow Forecast</h2>
                        <p className="text-xs text-slate-400">Current-month projections based on transaction history</p>
                      </div>
                    </div>
                    <span className="text-[10px] uppercase font-bold px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      Predictive Model
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800 mb-4">
                    <div>
                      <span className="text-xs text-slate-400 block">Expected Monthly Income</span>
                      <span className="text-lg font-black text-emerald-400">
                        ₹{(forecast?.expectedIncome || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Fixed Commitments</span>
                      <span className="text-lg font-black text-purple-400">
                        ₹{(forecast?.expectedFixedCommitments || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Est. Discretionary Spend</span>
                      <span className="text-lg font-black text-rose-400">
                        ₹{(forecast?.estimatedDiscretionaryExpenses || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Projected Balance</span>
                      <span className="text-lg font-black text-blue-400">
                        ₹{(forecast?.projectedMonthEndBalance || 0).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
                    <strong className="text-slate-300 block mb-1">Forecast Basis:</strong>
                    {forecast?.basisExplanation || 'Calculated using current statement transaction patterns.'}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span>Single-Month Analysis</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck size={14} /> Model Verified
                  </span>
                </div>
              </div>
            </div>

            {/* ── Transactions Ledger Table ────────────────────────────────────── */}
            <div className="glass-card p-6 border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Extracted Bank Statement Ledger</h2>
                  <p className="text-xs text-slate-400">Real-time parsed records preserving original narration & merchant names</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search description or merchant..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-slate-900/80 border border-slate-700/80 text-xs text-white rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-blue-500 w-48"
                    />
                  </div>

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-slate-900/80 border border-slate-700/80 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Categories</option>
                    {Array.from(new Set(transactions.map((t) => t.category))).sort().map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="bg-slate-900/80 border border-slate-700/80 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="ALL">All Types</option>
                    <option value="credit">Credit (Inflow)</option>
                    <option value="debit">Debit (Outflow)</option>
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description / Merchant</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-right">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 max-w-sm">
                            <div className="font-semibold text-white truncate flex items-center gap-1.5">
                              {tx.merchantName ? (
                                <>
                                  <Building2 size={12} className="text-blue-400 shrink-0" />
                                  <span>{tx.merchantName}</span>
                                </>
                              ) : (
                                <span>{tx.description}</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5" title={tx.description}>
                              {tx.description}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className="px-2.5 py-1 rounded-full font-medium text-[11px]"
                              style={{
                                backgroundColor: `${CATEGORY_COLORS[tx.category] || '#94a3b8'}20`,
                                color: CATEGORY_COLORS[tx.category] || '#94a3b8',
                                border: `1px solid ${CATEGORY_COLORS[tx.category] || '#94a3b8'}40`,
                              }}
                            >
                              {tx.category}
                            </span>
                          </td>
                          <td className={`px-4 py-3 whitespace-nowrap text-right font-bold ${tx.type === 'credit' ? 'text-emerald-400' : 'text-slate-200'}`}>
                            {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${tx.type === 'credit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                              {tx.type}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          {transactions.length === 0 ? 'No transactions uploaded yet. Click "Upload Bank Statement" above.' : 'No transactions match the selected filters.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

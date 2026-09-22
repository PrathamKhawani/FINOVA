'use client';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { BarChart2, TrendingUp, TrendingDown, PieChart, Download, RefreshCw, Calendar, Repeat } from 'lucide-react';

type Tab = 'overview' | 'categories' | 'merchants' | 'monthly' | 'recurring';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedSource, setSelectedSource] = useState('ALL');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedSource !== 'ALL') params.source = selectedSource;
      const res = await api.getReports(params);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedSource]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const summary          = data?.summary          || {};
  const topCategories    = data?.topCategories    || [];
  const incomeCategories = data?.incomeCategories || [];
  const topMerchants     = data?.topMerchants     || [];
  const bankSummary      = data?.bankSummary      || {};
  const walletSummary    = data?.walletSummary    || {};
  const monthlyTrend     = data?.monthlyTrend     || [];
  const recurringPayments = data?.recurringPayments || [];
  const availableMonths  = data?.availableMonths  || [];
  const maxCatAmt        = topCategories[0]?.amount || 1;
  const maxMonthly       = Math.max(...monthlyTrend.map((m: any) => Math.max(m.income, m.expenses)), 1);

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview',   label: 'Overview',   icon: BarChart2 },
    { id: 'categories', label: 'Categories', icon: PieChart },
    { id: 'monthly',    label: 'Monthly',    icon: Calendar },
    { id: 'merchants',  label: 'Merchants',  icon: TrendingDown },
    { id: 'recurring',  label: 'Recurring',  icon: Repeat },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Financial Reports</h1>
            <p className="text-gray-400 text-sm mt-1">
              {data?.totalTransactions != null
                ? `${data.totalTransactions.toLocaleString('en-IN')} transactions analysed`
                : 'Comprehensive analysis of your transactions'}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Print / Export
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-xl bg-gray-900/50 border border-gray-700/30">
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Month</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All Time</option>
              {availableMonths.map((m: string) => (
                <option key={m} value={m}>
                  {new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wide">Source</label>
            <select
              value={selectedSource}
              onChange={e => setSelectedSource(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Sources</option>
              <option value="BANK">Bank Only</option>
              <option value="WALLET">Wallet Only</option>
            </select>
          </div>
          <button
            onClick={fetchReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {/* Source Breakdown */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <p className="text-gray-300 font-semibold">Bank Accounts</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div><p className="text-green-400 font-bold">₹{bankSummary.totalCredits?.toLocaleString('en-IN') ?? 0}</p><p className="text-gray-500 text-xs">Credits</p></div>
                  <div><p className="text-red-400 font-bold">₹{bankSummary.totalDebits?.toLocaleString('en-IN') ?? 0}</p><p className="text-gray-500 text-xs">Debits</p></div>
                </div>
                <p className="text-gray-500 text-xs text-center mt-2">{bankSummary.transactionCount ?? 0} transactions</p>
              </div>
              <div className="p-5 rounded-xl border border-purple-500/20 bg-purple-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400" />
                  <p className="text-gray-300 font-semibold">Digital Wallets</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div><p className="text-green-400 font-bold">₹{walletSummary.totalCredits?.toLocaleString('en-IN') ?? 0}</p><p className="text-gray-500 text-xs">Credits</p></div>
                  <div><p className="text-red-400 font-bold">₹{walletSummary.totalDebits?.toLocaleString('en-IN') ?? 0}</p><p className="text-gray-500 text-xs">Debits</p></div>
                </div>
                <p className="text-gray-500 text-xs text-center mt-2">{walletSummary.transactionCount ?? 0} transactions</p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total Income',   value: `₹${(summary.totalIncome  || 0).toLocaleString('en-IN')}`, color: 'text-green-400',  icon: TrendingUp },
                { label: 'Total Expenses', value: `₹${(summary.totalExpenses|| 0).toLocaleString('en-IN')}`, color: 'text-red-400',    icon: TrendingDown },
                { label: 'Net Savings',    value: `₹${(summary.netSavings   || 0).toLocaleString('en-IN')}`, color: (summary.netSavings ?? 0) >= 0 ? 'text-blue-400' : 'text-orange-400', icon: BarChart2 },
                { label: 'Savings Rate',   value: `${summary.savingsRate    || 0}%`,                          color: (summary.savingsRate ?? 0) >= 20 ? 'text-emerald-400' : 'text-yellow-400', icon: PieChart },
              ].map(m => (
                <div key={m.label} className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
                  <m.icon className={`w-5 h-5 ${m.color} mx-auto mb-2`} />
                  <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-4 p-1 bg-gray-900/50 rounded-xl border border-gray-700/30 flex-wrap">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Overview Tab ─────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-gray-900/50 border border-gray-700/30">
                  <h3 className="text-gray-300 font-semibold mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4" />Financial Health Metrics</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Savings Rate', value: summary.savingsRate || 0, suffix: '%', good: (v: number) => v >= 20 },
                      { label: 'Discretionary Spend Ratio', value: summary.discretionarySpendRatio || 0, suffix: '%', good: (v: number) => v <= 30 },
                      { label: 'Debt-to-Income Ratio', value: summary.debtToIncomeRatio || 0, suffix: '%', good: (v: number) => v <= 35 },
                    ].map(m => (
                      <div key={m.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">{m.label}</span>
                          <span className={`font-medium ${m.good(m.value) ? 'text-green-400' : 'text-red-400'}`}>{m.value}{m.suffix}</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${m.good(m.value) ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}
                            style={{ width: `${Math.min(100, m.value)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Income Breakdown */}
                {incomeCategories.length > 0 && (
                  <div className="p-5 rounded-xl bg-gray-900/50 border border-gray-700/30">
                    <h3 className="text-gray-300 font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-400" />Income Breakdown</h3>
                    <div className="space-y-2">
                      {incomeCategories.map((c: any) => (
                        <div key={c.category} className="flex items-center gap-3">
                          <span className="text-gray-400 text-sm w-40 truncate">{c.category}</span>
                          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                              style={{ width: `${c.percentage}%` }} />
                          </div>
                          <span className="text-green-400 font-medium text-sm w-28 text-right">₹{c.amount.toLocaleString('en-IN')}</span>
                          <span className="text-gray-500 text-xs w-10 text-right">{c.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Categories Tab ───────────────────────────────────────────── */}
            {activeTab === 'categories' && (
              <div className="space-y-2">
                {topCategories.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No expense data. Upload a bank statement first.</p>
                ) : (
                  topCategories.map((c: any, i: number) => (
                    <div key={c.category} className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/50 border border-gray-700/30">
                      <span className="text-gray-500 text-sm w-5 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-200">{c.category}</span>
                          <span className="text-white font-medium">₹{c.amount.toLocaleString('en-IN')} <span className="text-gray-500">({c.percentage}%)</span></span>
                        </div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                            style={{ width: `${(c.amount / maxCatAmt) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Monthly Trend Tab ────────────────────────────────────────── */}
            {activeTab === 'monthly' && (
              <div className="space-y-3">
                {monthlyTrend.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No monthly data available.</p>
                ) : (
                  <>
                    <div className="p-5 rounded-xl bg-gray-900/50 border border-gray-700/30 space-y-3">
                      <h3 className="text-gray-300 font-semibold mb-2 flex items-center gap-2"><Calendar className="w-4 h-4" />Monthly Income vs Expenses</h3>
                      {monthlyTrend.map((m: any) => (
                        <div key={m.month}>
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span className="font-medium text-white">
                              {new Date(m.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                            </span>
                            <span className={`font-medium ${m.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              Net: ₹{m.net.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <div className="text-xs text-gray-500 mb-0.5">Income ₹{m.income.toLocaleString('en-IN')}</div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                                  style={{ width: `${(m.income / maxMonthly) * 100}%` }} />
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-0.5">Expenses ₹{m.expenses.toLocaleString('en-IN')}</div>
                              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
                                  style={{ width: `${(m.expenses / maxMonthly) * 100}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Monthly summary table */}
                    <div className="rounded-xl overflow-hidden border border-gray-700/30">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-800/60">
                          <tr>
                            {['Month', 'Income', 'Expenses', 'Net', 'Txns'].map(h => (
                              <th key={h} className="px-4 py-2 text-left text-gray-400 text-xs font-medium">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyTrend.map((m: any, i: number) => (
                            <tr key={m.month} className={`${i % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-900/10'} border-t border-gray-800/50`}>
                              <td className="px-4 py-2 text-gray-300 text-xs">
                                {new Date(m.month + '-01').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-2 text-green-400 font-medium text-xs">₹{m.income.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2 text-red-400 font-medium text-xs">₹{m.expenses.toLocaleString('en-IN')}</td>
                              <td className={`px-4 py-2 font-medium text-xs ${m.net >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>₹{m.net.toLocaleString('en-IN')}</td>
                              <td className="px-4 py-2 text-gray-500 text-xs">{m.txnCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Merchants Tab ────────────────────────────────────────────── */}
            {activeTab === 'merchants' && (
              <div className="space-y-2">
                {topMerchants.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No merchant data yet.</p>
                ) : (
                  topMerchants.map((m: any, i: number) => (
                    <div key={m.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-700/30">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-sm w-5 text-right">{i + 1}</span>
                        <div>
                          <p className="text-gray-200 text-sm font-medium">{m.name}</p>
                          <p className="text-gray-500 text-xs">{m.count} transaction{m.count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <p className="text-red-400 font-semibold text-sm">₹{m.amount.toLocaleString('en-IN')}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Recurring Payments Tab ───────────────────────────────────── */}
            {activeTab === 'recurring' && (
              <div className="space-y-2">
                {recurringPayments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No recurring payments detected. This requires transactions spanning at least 2 months.</p>
                ) : (
                  <>
                    <p className="text-gray-500 text-xs mb-3">Payments appearing in 2+ distinct calendar months. Excludes P2P transfers.</p>
                    {recurringPayments.map((r: any) => (
                      <div key={r.name} className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-700/30">
                        <div>
                          <p className="text-gray-200 text-sm font-medium">{r.name}</p>
                          <p className="text-gray-500 text-xs">{r.category} · {r.occurrences}× · Last: {new Date(r.lastDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-orange-400 font-semibold text-sm">₹{r.avgAmount.toLocaleString('en-IN')}</p>
                          <p className="text-gray-500 text-xs">avg/occurrence</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

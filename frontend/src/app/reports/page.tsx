'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { BarChart2, TrendingUp, TrendingDown, PieChart, Calendar, Download } from 'lucide-react';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview'|'categories'|'merchants'>('overview');

  useEffect(() => {
    api.getDashboardSummary().then(res => {
      setData(res.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const topCategories = data?.topCategories || [];
  const incomeCategories = data?.incomeCategories || [];
  const topMerchants = data?.topMerchants || [];
  const bankSummary = data?.bankSummary || {};
  const walletSummary = data?.walletSummary || {};
  const maxCatAmt = topCategories[0]?.amount || 1;

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Financial Reports</h1>
            <p className="text-gray-400 text-sm mt-1">Comprehensive analysis of your transactions</p>
          </div>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />
            Print / Export
          </button>
        </div>

        {/* Source Breakdown */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <p className="text-gray-300 font-semibold">Bank Accounts</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div><p className="text-green-400 font-bold">₹{(bankSummary.totalCredits||0).toLocaleString('en-IN')}</p><p className="text-gray-500 text-xs">Credits</p></div>
              <div><p className="text-red-400 font-bold">₹{(bankSummary.totalDebits||0).toLocaleString('en-IN')}</p><p className="text-gray-500 text-xs">Debits</p></div>
            </div>
            <p className="text-gray-500 text-xs text-center mt-2">{bankSummary.transactionCount||0} transactions</p>
          </div>
          <div className="p-5 rounded-xl border border-purple-500/20 bg-purple-500/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-purple-400" />
              <p className="text-gray-300 font-semibold">Digital Wallets</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div><p className="text-green-400 font-bold">₹{(walletSummary.totalCredits||0).toLocaleString('en-IN')}</p><p className="text-gray-500 text-xs">Credits</p></div>
              <div><p className="text-red-400 font-bold">₹{(walletSummary.totalDebits||0).toLocaleString('en-IN')}</p><p className="text-gray-500 text-xs">Debits</p></div>
            </div>
            <p className="text-gray-500 text-xs text-center mt-2">{walletSummary.transactionCount||0} transactions</p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Income', value: `₹${(summary.totalIncome||0).toLocaleString('en-IN')}`, color: 'text-green-400', icon: TrendingUp },
            { label: 'Total Expenses', value: `₹${(summary.totalExpenses||0).toLocaleString('en-IN')}`, color: 'text-red-400', icon: TrendingDown },
            { label: 'Net Savings', value: `₹${(summary.netSavings||0).toLocaleString('en-IN')}`, color: summary.netSavings >= 0 ? 'text-blue-400' : 'text-orange-400', icon: BarChart2 },
            { label: 'Savings Rate', value: `${summary.savingsRate||0}%`, color: summary.savingsRate >= 20 ? 'text-emerald-400' : 'text-yellow-400', icon: PieChart },
          ].map(m => (
            <div key={m.label} className="p-4 rounded-xl bg-gray-900/50 border border-gray-700/30 text-center">
              <m.icon className={`w-5 h-5 ${m.color} mx-auto mb-2`} />
              <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
              <p className="text-gray-400 text-xs mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 bg-gray-900/50 rounded-xl border border-gray-700/30 w-fit">
          {(['overview','categories','merchants'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === tab ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            <div className="p-5 rounded-xl bg-gray-900/50 border border-gray-700/30">
              <h3 className="text-gray-300 font-semibold mb-4 flex items-center gap-2"><BarChart2 className="w-4 h-4" />Financial Health</h3>
              <div className="space-y-3">
                {[
                  { label: 'Savings Rate', value: summary.savingsRate||0, max: 100, suffix: '%', good: (v: number) => v >= 20 },
                  { label: 'Discretionary Spend Ratio', value: summary.discretionarySpendRatio||0, max: 100, suffix: '%', good: (v: number) => v <= 30 },
                  { label: 'Debt-to-Income Ratio', value: summary.debtToIncomeRatio||0, max: 100, suffix: '%', good: (v: number) => v <= 35 },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{m.label}</span>
                      <span className={`font-medium ${m.good(m.value) ? 'text-green-400' : 'text-red-400'}`}>{m.value}{m.suffix}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${m.good(m.value) ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-red-500 to-orange-500'}`}
                        style={{ width: `${Math.min(100, m.value)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Categories Tab */}
        {activeTab === 'categories' && (
          <div className="space-y-3">
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
                      <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full" style={{ width: `${(c.amount / maxCatAmt) * 100}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Merchants Tab */}
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
      </div>
    </div>
  );
}

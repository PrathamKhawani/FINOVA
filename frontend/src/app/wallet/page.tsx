'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { Upload, CheckCircle, AlertCircle, Smartphone, FileText, Info } from 'lucide-react';

export default function WalletImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.name.endsWith('.csv') || dropped.name.endsWith('.pdf'))) {
      setFile(dropped);
      setResult(null);
      setError(null);
    } else {
      setError('Please upload a CSV or PDF file.');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('statement', file);
      const res = await api.uploadWalletStatement(formData);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
              <Smartphone className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Wallet Transaction Import</h1>
          </div>
          <p className="text-gray-400 ml-14">
            Import your wallet transaction history from PhonePe, Paytm, Google Pay or any wallet that provides CSV/PDF exports.
          </p>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 flex gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-semibold mb-1">File-Based Import Only</p>
            <p className="text-blue-400">
              FINOVA imports wallet transactions from files you export from your wallet app — not through direct API access to your PhonePe or Paytm account.
              This keeps your credentials completely private. Official API integration (with your authorization) is planned for a future release.
            </p>
          </div>
        </div>

        {/* How to Export */}
        <div className="mb-6 p-5 rounded-xl border border-gray-700/50 bg-gray-900/50">
          <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            How to Export Your Wallet Transactions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {[
              { name: 'PhonePe', steps: 'Profile → Transaction History → Download Statement (PDF/CSV)' },
              { name: 'Paytm', steps: 'Passbook → Statement → Download (PDF)' },
              { name: 'Google Pay', steps: 'Profile → Transaction History → Download CSV' },
            ].map(w => (
              <div key={w.name} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/30">
                <p className="font-medium text-white mb-1">{w.name}</p>
                <p className="text-gray-400 text-xs">{w.steps}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all mb-6 ${
            isDragging
              ? 'border-purple-400 bg-purple-500/10'
              : file
              ? 'border-green-500/40 bg-green-500/5'
              : 'border-gray-700 bg-gray-900/40 hover:border-purple-500/50 hover:bg-purple-500/5'
          }`}
        >
          <input
            type="file"
            accept=".csv,.pdf"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Upload className={`w-10 h-10 mx-auto mb-3 ${file ? 'text-green-400' : 'text-gray-500'}`} />
          {file ? (
            <div>
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-gray-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB — Ready to import</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-300 font-medium">Drop your wallet export file here</p>
              <p className="text-gray-500 text-sm mt-1">CSV or PDF · Max 10MB</p>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className="w-full py-3 rounded-xl font-semibold text-white transition-all bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? 'Importing transactions...' : 'Import Wallet Transactions'}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Success Result */}
        {result?.success && (
          <div className="mt-6 p-5 rounded-xl border border-green-500/30 bg-green-500/10">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <p className="text-green-300 font-semibold">{result.message}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-gray-800/50">
                <p className="text-xl font-bold text-white">{result.data?.statement?.transactions?.length || 0}</p>
                <p className="text-gray-400 text-xs mt-1">Transactions</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50">
                <p className="text-xl font-bold text-green-400">
                  ₹{(result.data?.statement?.totalCredits || 0).toLocaleString('en-IN')}
                </p>
                <p className="text-gray-400 text-xs mt-1">Credits</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-800/50">
                <p className="text-xl font-bold text-red-400">
                  ₹{(result.data?.statement?.totalDebits || 0).toLocaleString('en-IN')}
                </p>
                <p className="text-gray-400 text-xs mt-1">Debits</p>
              </div>
            </div>
            {result.warnings?.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                {result.warnings.map((w: string, i: number) => (
                  <p key={i} className="text-yellow-300 text-xs">{w}</p>
                ))}
              </div>
            )}
            <button
              onClick={() => router.push('/transactions')}
              className="mt-4 w-full py-2 rounded-lg text-sm font-medium text-white bg-gray-700 hover:bg-gray-600 transition-colors"
            >
              View All Transactions →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

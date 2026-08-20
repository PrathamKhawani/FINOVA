'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { api } from '@/lib/api';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.type === 'application/pdf') {
        setFile(selected);
        setError(null);
      } else {
        setError('Please select a valid PDF file.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type === 'application/pdf') {
        setFile(selected);
        setError(null);
      } else {
        setError('Please select a valid PDF file.');
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('statement', file);

    try {
      const res = await api.uploadStatement(formData);
      setSuccessResult(res.data.statement);
    } catch (err: any) {
      console.error('Upload failed', err);
      setError(err.message || 'Failed to process statement. Make sure the PDF contains readable text.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mesh-bg min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 flex flex-col items-center">
        {/* Header */}
        <div className="text-center max-w-2xl mb-8 animate-fadeInUp">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-3">
            <Cpu size={14} /> PDF Intelligence Parsing Engine
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
            Upload Monthly Bank Statement
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed">
            Upload your official bank statement PDF. Our AI engine automatically extracts dates, descriptions, credits, debits, and computes 15-category classifications.
          </p>
        </div>

        {/* Upload Container */}
        <div className="w-full max-w-2xl">
          {successResult ? (
            <div className="glass-card p-8 text-center border-emerald-500/30 animate-fadeInUp">
              <div className="w-16 h-16 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Statement Processed Successfully!</h2>
              <p className="text-slate-300 text-sm mb-6">
                Extracted <span className="font-bold text-emerald-400">{successResult.transactions?.length || 0} transactions</span> from {successResult.bankName || 'Bank Statement'}.
              </p>

              <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-left mb-6">
                <div>
                  <span className="text-xs text-slate-400 block">Bank Name</span>
                  <span className="text-sm font-semibold text-white">{successResult.bankName || 'Detected'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Statement Period</span>
                  <span className="text-sm font-semibold text-white">{successResult.period || 'Monthly'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Total Credits (Income)</span>
                  <span className="text-sm font-semibold text-emerald-400">₹{successResult.totalCredits?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Total Debits (Expenses)</span>
                  <span className="text-sm font-semibold text-rose-400">₹{successResult.totalDebits?.toLocaleString('en-IN') || 0}</span>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm"
                >
                  View Dashboard Analytics <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => { setSuccessResult(null); setFile(null); }}
                  className="btn-secondary text-sm px-4 py-2.5"
                >
                  Upload Another Statement
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-card p-8 border-slate-800">
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Extraction Warning</span>
                    {error}
                  </div>
                </div>
              )}

              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
                    : file
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-900/40'
                }`}
                onClick={() => document.getElementById('pdf-input')?.click()}
              >
                <input
                  id="pdf-input"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {file ? (
                  <div className="flex flex-col items-center animate-fadeInUp">
                    <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-3">
                      <FileText size={32} />
                    </div>
                    <span className="font-bold text-white text-base mb-1">{file.name}</span>
                    <span className="text-xs text-slate-400 mb-4">{(file.size / (1024 * 1024)).toFixed(2)} MB PDF Document</span>
                    <span className="text-xs text-blue-400 font-medium underline">Click or drop to replace file</span>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
                      <UploadCloud size={32} />
                    </div>
                    <p className="font-semibold text-slate-200 mb-1">
                      Drag & Drop your Bank Statement PDF here
                    </p>
                    <p className="text-xs text-slate-400 mb-4">
                      Format-adaptive engine supporting standard bank statement layouts (Up to 10MB PDF)
                    </p>
                    <button type="button" className="btn-secondary text-xs px-4 py-2 pointer-events-none">
                      Browse Files
                    </button>
                  </>
                )}
              </div>

              {/* Upload CTA */}
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="btn-primary w-full mt-6 py-3 text-base flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full inline-block" />
                    Extracting & Categorizing Transactions...
                  </>
                ) : (
                  <>
                    Process Statement Now <ArrowRight size={18} />
                  </>
                )}
              </button>

              {/* Security info */}
              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Bank-grade local encryption. Your raw PDF data is processed securely.</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <main className="mesh-bg min-h-screen">
      {/* ── Navigation ─────────────────────────────────────────────────── */}
      <nav
        className="flex items-center justify-between px-8 py-4 sticky top-0 z-50"
        style={{ background: 'rgba(7, 11, 20, 0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'white'
          }}>F</div>
          <span style={{ fontSize: '1.2rem', fontWeight: 700 }} className="gradient-text">FINOVA</span>
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link href="/dashboard">
              <button className="btn-primary">Go to Dashboard →</button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <button className="btn-secondary">Sign In</button>
              </Link>
              <Link href="/register">
                <button className="btn-primary">Get Started Free</button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero Section ───────────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-32">
        <div className="animate-fadeInUp" style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: 100,
          padding: '0.4rem 1rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#3b82f6',
          marginBottom: '2rem',
          display: 'inline-block'
        }}>
          ⚡ Automated Financial Intelligence Infrastructure
        </div>

        <h1 className="animate-fadeInUp delay-100 gradient-text" style={{
          fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
          fontWeight: 900,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          maxWidth: 900,
          marginBottom: '1.5rem',
        }}>
          Financial Intelligence<br />on Autopilot
        </h1>

        <p className="animate-fadeInUp delay-200" style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'var(--color-text-secondary)',
          maxWidth: 600,
          lineHeight: 1.7,
          marginBottom: '2.5rem',
        }}>
          Upload your bank statement PDF. FINOVA automatically extracts every transaction,
          categorizes your spending, and generates beautiful financial dashboards — no manual entry needed.
        </p>

        <div className="animate-fadeInUp delay-300 flex items-center gap-4 flex-wrap justify-center">
          <Link href="/register">
            <button className="btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              Start Analyzing Free →
            </button>
          </Link>
          <Link href="/login">
            <button className="btn-secondary" style={{ padding: '0.875rem 2rem', fontSize: '1rem' }}>
              Sign In
            </button>
          </Link>
        </div>

        {/* Stats Row */}
        <div className="animate-fadeInUp delay-400 flex items-center gap-8 mt-16 flex-wrap justify-center">
          {[
            { value: '20+', label: 'Smart Categories' },
            { value: 'Multi-Bank', label: 'Adaptive Format Parsing' },
            { value: '100%', label: 'Automated Ledger' },
            { value: 'Real-Time', label: 'Cash-Flow Insights' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div style={{ fontSize: '2rem', fontWeight: 800 }} className="gradient-text">{stat.value}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────────────── */}
      <section className="px-8 py-16 max-w-6xl mx-auto">
        <h2 className="text-center text-3xl font-bold mb-3">How FINOVA Works</h2>
        <p className="text-center mb-12" style={{ color: 'var(--color-text-secondary)' }}>
          Three simple steps to complete financial clarity
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              icon: '📄',
              title: 'Upload Bank Statement',
              desc: 'Drag & drop your bank statement PDF. Supports major bank layouts with format-adaptive column detection.',
              color: '#3b82f6',
            },
            {
              step: '02',
              icon: '🧠',
              title: 'AI Categorization',
              desc: 'Our engine reads multi-line narrations and categorizes: Salary, EMI, Food, Investments, Bills, and more.',
              color: '#8b5cf6',
            },
            {
              step: '03',
              icon: '📊',
              title: 'Smart Dashboard',
              desc: 'Instant dashboards with spending trends, category breakdowns, savings rate and financial insights.',
              color: '#06b6d4',
            },
          ].map((f) => (
            <div key={f.step} className="glass-card p-8">
              <div style={{
                width: 48, height: 48,
                background: `${f.color}22`,
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, marginBottom: 20
              }}>
                {f.icon}
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: f.color, marginBottom: 8, letterSpacing: '0.1em' }}>
                STEP {f.step}
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }}>{f.title}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Category Preview ────────────────────────────────────────────── */}
      <section className="px-8 py-16 max-w-6xl mx-auto">
        <h2 className="text-center text-3xl font-bold mb-3">20+ Smart Categories</h2>
        <p className="text-center mb-12" style={{ color: 'var(--color-text-secondary)' }}>
          Every transaction automatically classified with confidence scoring
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { label: 'Income & Salary', icon: '💰', cls: 'cat-income' },
            { label: 'P2P Transfer', icon: '🔄', cls: 'cat-travel' },
            { label: 'Food & Dining', icon: '🍔', cls: 'cat-food' },
            { label: 'Travel & Transport', icon: '✈️', cls: 'cat-travel' },
            { label: 'Shopping', icon: '🛍️', cls: 'cat-shopping' },
            { label: 'Bills & Utilities', icon: '💡', cls: 'cat-bills' },
            { label: 'EMI & Loans', icon: '🏦', cls: 'cat-emi' },
            { label: 'Investments', icon: '📈', cls: 'cat-investments' },
            { label: 'Healthcare', icon: '🏥', cls: 'cat-health' },
            { label: 'Entertainment', icon: '🎬', cls: 'cat-entertainment' },
            { label: 'Education', icon: '📚', cls: 'cat-education' },
            { label: 'Fuel', icon: '⛽', cls: 'cat-fuel' },
            { label: 'Groceries', icon: '🛒', cls: 'cat-groceries' },
            { label: 'Insurance & Premium', icon: '🛡️', cls: 'cat-insurance' },
            { label: 'ATM & Cash', icon: '💵', cls: 'cat-atm' },
            { label: 'Bank Charges', icon: '📋', cls: 'cat-other' },
          ].map((c) => (
            <div key={c.label} className="glass-card flex items-center gap-2 px-4 py-2" style={{ borderRadius: 100 }}>
              <span>{c.icon}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="px-8 py-24 text-center">
        <div className="glass-card max-w-2xl mx-auto p-12" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
          <h2 className="text-3xl font-bold mb-4">Ready to see your finances clearly?</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Get started with FINOVA today.
          </p>
          <Link href="/register">
            <button className="btn-primary" style={{ padding: '0.875rem 2.5rem', fontSize: '1rem' }}>
              Create Account →
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '2rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
        FINOVA © 2026 · Financial Intelligence Infrastructure
      </footer>
    </main>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fadeInUp">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div style={{
              width: 44, height: 44,
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: 'white'
            }}>F</div>
            <span className="gradient-text" style={{ fontSize: '1.5rem', fontWeight: 800 }}>FINOVA</span>
          </Link>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Sign in to your financial dashboard
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 animate-fadeInUp delay-100">
          {error && (
            <div style={{
              background: 'var(--color-expense-bg)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 10,
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              color: 'var(--color-expense)',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Password
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                className="input-field"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
              style={{ padding: '0.875rem', fontSize: '1rem', marginTop: 8 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
                  Signing in...
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <p className="text-center mt-6" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: 'var(--color-brand-blue)', fontWeight: 600, textDecoration: 'none' }}>
              Create one free
            </Link>
          </p>
        </div>

        <p className="text-center mt-6" style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
          FINOVA · Financial Intelligence Infrastructure
        </p>
      </div>
    </div>
  );
}

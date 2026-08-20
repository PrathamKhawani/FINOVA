'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = (): { strength: number; label: string; color: string } => {
    const p = form.password;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    const map = [
      { strength: 0, label: '', color: '' },
      { strength: 1, label: 'Weak', color: '#ef4444' },
      { strength: 2, label: 'Fair', color: '#f59e0b' },
      { strength: 3, label: 'Good', color: '#10b981' },
      { strength: 4, label: 'Strong', color: '#22c55e' },
    ];
    return map[s];
  };
  const strength = passwordStrength();

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
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>Create your account</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            Start your financial intelligence journey
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
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                placeholder="Pratham Sharma"
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoComplete="name"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Email Address
              </label>
              <input
                id="register-email"
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
                id="register-password"
                type="password"
                placeholder="Min 8 characters"
                className="input-field"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="new-password"
              />
              {form.password && (
                <div style={{ marginTop: 8 }}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Strength</span>
                    <span style={{ fontSize: '0.75rem', color: strength.color, fontWeight: 600 }}>{strength.label}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-bar-fill" style={{ width: `${(strength.strength / 4) * 100}%`, background: strength.color }} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Confirm Password
              </label>
              <input
                id="register-confirm"
                type="password"
                placeholder="Re-enter your password"
                className="input-field"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
                autoComplete="new-password"
              />
              {form.confirm && form.confirm !== form.password && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-expense)', marginTop: 4 }}>Passwords don't match</p>
              )}
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
              style={{ padding: '0.875rem', fontSize: '1rem', marginTop: 8 }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block' }} />
                  Creating account...
                </span>
              ) : 'Create Account →'}
            </button>
          </form>

          <p className="text-center mt-6" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--color-brand-blue)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

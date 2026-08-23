'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, UploadCloud, FileText, ArrowRightLeft,
  LogOut, Smartphone, PiggyBank, Target, CreditCard, BarChart2,
  ChevronDown, Menu, X
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryNav = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Upload', href: '/upload', icon: UploadCloud },
    { label: 'Wallet Import', href: '/wallet', icon: Smartphone },
    { label: 'Statements', href: '/statements', icon: FileText },
    { label: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
  ];

  const moreNav = [
    { label: 'Budget', href: '/budget', icon: PiggyBank },
    { label: 'Savings Goals', href: '/savings', icon: Target },
    { label: 'Loans & EMI', href: '/loans', icon: CreditCard },
    { label: 'Reports', href: '/reports', icon: BarChart2 },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
      style={{
        background: 'rgba(7, 11, 20, 0.90)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
      {/* Brand */}
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-3 decoration-none">
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, fontWeight: 800, color: 'white',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>F</div>
          <div className="flex flex-col">
            <span className="gradient-text font-extrabold text-lg tracking-tight leading-none">FINOVA</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>INTEL INFRASTRUCTURE</span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-0.5">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  active ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}>
                <Icon size={15} className={active ? 'text-blue-400' : ''} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* More dropdown */}
          <div className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                moreNav.some(n => isActive(n.href)) ? 'text-white bg-white/10 border border-white/10' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              More <ChevronDown size={13} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreOpen && (
              <div className="absolute top-full left-0 mt-1 w-44 rounded-xl border border-gray-700/50 bg-gray-900/95 backdrop-blur-lg shadow-xl py-1 z-50">
                {moreNav.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link key={item.href} href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${active ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                      <Icon size={14} className={active ? 'text-emerald-400' : ''} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User + Mobile Toggle */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50">
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white' }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-200">{user.name}</span>
            </div>
            <button onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Logout">
              <LogOut size={15} />
              <span>Logout</span>
            </button>
          </div>
        )}
        {/* Mobile menu toggle */}
        <button className="lg:hidden p-2 text-gray-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute top-full left-0 right-0 bg-gray-950/98 border-b border-gray-700/50 p-4 lg:hidden z-50">
          <div className="grid grid-cols-2 gap-1">
            {[...primaryNav, ...moreNav].map(item => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                  <Icon size={15} className={active ? 'text-blue-400' : ''} />
                  {item.label}
                </Link>
              );
            })}
          </div>
          {user && (
            <div className="mt-3 pt-3 border-t border-gray-700/30 flex items-center justify-between">
              <span className="text-sm text-gray-300">{user.name}</span>
              <button onClick={logout} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300">
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, UploadCloud, FileText, ArrowRightLeft, LogOut, User } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Upload Statement', href: '/upload', icon: UploadCloud },
    { label: 'Statements', href: '/statements', icon: FileText },
    { label: 'Transactions', href: '/transactions', icon: ArrowRightLeft },
  ];

  return (
    <nav className="sticky top-0 z-50 px-6 py-3 flex items-center justify-between"
         style={{
           background: 'rgba(7, 11, 20, 0.85)',
           backdropFilter: 'blur(16px)',
           borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
         }}>
      {/* Brand */}
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="flex items-center gap-3 decoration-none">
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 800, color: 'white',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}>
            F
          </div>
          <div className="flex flex-col">
            <span className="gradient-text font-extrabold text-lg tracking-tight leading-none">FINOVA</span>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>INTEL INFRASTRUCTURE</span>
          </div>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white bg-white/10 shadow-sm border border-white/10'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-blue-400' : ''} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* User profile & Logout */}
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/50">
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-200">{user.name}</span>
            </div>
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
              title="Logout"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        ) : (
          <Link href="/login">
            <button className="btn-primary text-xs px-3 py-1.5">Sign In</button>
          </Link>
        )}
      </div>
    </nav>
  );
}

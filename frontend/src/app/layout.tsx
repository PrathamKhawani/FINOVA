import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'FINOVA – Financial Intelligence Infrastructure',
  description:
    'Automatically extract, categorize, and analyze your bank transactions. Get real-time financial insights powered by intelligent PDF processing.',
  keywords: ['finance', 'banking', 'budgeting', 'transactions', 'financial intelligence'],
  authors: [{ name: 'FINOVA Team' }],
  openGraph: {
    title: 'FINOVA – Financial Intelligence Infrastructure',
    description: 'Smart financial analytics powered by automatic bank statement processing',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

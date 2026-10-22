import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Remove BG — AI Background Removal',
  description: 'ছবির ব্যাকগ্রাউন্ড মুছে ফেলুন সহজেই। AI-powered background removal tool.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" data-scroll-behavior="smooth">
      <body>
        <nav className="nav">
          <div className="nav-inner">
            <Link href="/" className="nav-logo">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect width="28" height="28" rx="8" fill="url(#g1)"/>
                <path d="M8 20L14 8L20 20H8Z" fill="white" fillOpacity="0.9"/>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="28" y2="28">
                    <stop stopColor="#7c3aed"/>
                    <stop offset="1" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
              </svg>
              Remove<span>BG</span>
            </Link>
            <div className="nav-links">
              <Link href="/app" className="nav-link">🖼️ Remove BG</Link>
              <Link href="/convert" className="nav-link">📐 PNG to SVG</Link>
              <Link href="/tryon" className="nav-link">👗 Virtual Try-On</Link>
              <Link href="/docs" className="nav-link">📄 API Docs</Link>
              <Link href="/dashboard" className="nav-link">📊 Dashboard</Link>
              <Link href="/app" className="btn btn-primary btn-sm">শুরু করুন →</Link>
            </div>
          </div>
        </nav>

        {children}

        <footer style={{ borderTop: '1px solid var(--color-border)', padding: '36px 0 24px', marginTop: '60px' }}>
          <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link href="/" className="nav-link" style={{ fontSize: '0.85rem' }}>Home</Link>
              <Link href="/app" className="nav-link" style={{ fontSize: '0.85rem' }}>Remove BG</Link>
              <Link href="/tryon" className="nav-link" style={{ fontSize: '0.85rem' }}>Virtual Try-On</Link>
              <Link href="/docs" className="nav-link" style={{ fontSize: '0.85rem' }}>📄 API Documentation</Link>
              <Link href="/dashboard" className="nav-link" style={{ fontSize: '0.85rem' }}>📊 Dashboard</Link>
              <Link href="/admin" className="nav-link" style={{ fontSize: '0.85rem', color: 'var(--color-primary-glow)' }}>👑 Super Admin</Link>
            </div>
            <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
              Remove BG — Personal Tool · Powered by <span style={{ color: 'var(--color-primary-glow)' }}>rembg AI</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

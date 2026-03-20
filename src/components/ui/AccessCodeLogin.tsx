import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, Tv } from 'lucide-react';

interface Props {
  onLogin: (code: string) => Promise<{ success: boolean; error?: string }>;
}

export const AccessCodeLogin: React.FC<Props> = ({ onLogin }) => {
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!code.trim()) {
        setError('Please enter your access code');
        return;
      }

      setLoading(true);
      setError('');

      // Query Supabase for access code
      try {
        const result = await onLogin(code);
        if (!result.success) {
          // #25 — useAuth.login now returns distinct messages for:
          //   not found → 'Invalid access code'
          //   expired   → 'Access code expired — contact support'
          //   network   → 'Connection error — check your internet'
          //   rate limit → 'Too many attempts. Wait Xs'
          setError(result.error ?? 'Invalid access code');
          setLoading(false);
        }
      } catch {
        // Fallback for unexpected thrown exceptions (should not normally occur)
        setError('Connection error — check your internet');
        setLoading(false);
      }
    },
    [code, onLogin]
  );

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0A0A0A]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(157,78,221,0.15)_0%,transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(157,78,221,0.08)_0%,transparent_40%)]" />

      {/* Floating particles */}
      <div className="login-particles">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="login-particle" />
        ))}
      </div>

      {/* Login content */}
      <div className="relative z-10 flex items-center justify-center w-full h-full px-5">
        <div
          className="login-box-appear w-full max-w-[420px] rounded-3xl p-12 px-10 glass-strong border border-primary/20"
          style={{
            boxShadow:
              '0 8px 32px rgba(0,0,0,0.4), 0 0 80px rgba(157,78,221,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          {/* Logo */}
          <div className="text-center mb-9">
            <div className="logo-pulse inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
              style={{
                background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 100%)',
                boxShadow: '0 0 30px rgba(157,78,221,0.5), 0 0 60px rgba(157,78,221,0.3)',
              }}
            >
              <Tv className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-wider mb-2">
              <span className="text-gradient">DashTivi</span>
              <span className="text-primary-light text-2xl font-black">+</span>
            </h1>
            <p className="text-text-secondary text-sm tracking-[3px] uppercase opacity-80">
              Premium Streaming
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <input
                type={showCode ? 'text' : 'password'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter your access code"
                autoFocus
                className="w-full py-[18px] px-5 pr-12 bg-white/[0.03] border border-white/[0.08] rounded-[14px] text-white text-base outline-none transition-all duration-300 placeholder:text-white/35 focus:border-primary focus:bg-white/[0.06] focus:shadow-[0_0_0_4px_rgba(157,78,221,0.15),0_0_20px_rgba(157,78,221,0.2)]"
              />
              <button
                type="button"
                onClick={() => setShowCode(!showCode)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showCode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-sweep w-full py-[18px] rounded-[14px] font-bold text-base tracking-[2px] uppercase transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none text-white"
              style={{
                background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 100%)',
                boxShadow: '0 4px 20px rgba(157,78,221,0.4), 0 0 40px rgba(157,78,221,0.2)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                'Unlock Streaming'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-text-muted text-xs">
              Enter the code provided with your DASH subscription
            </p>
            <p className="text-text-muted text-[10px] mt-2 tracking-wider uppercase">
              DashTivi+ &bull; Premium IPTV
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

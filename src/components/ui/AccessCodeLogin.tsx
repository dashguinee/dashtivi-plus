import React, { useState, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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

      try {
        const result = await onLogin(code);
        if (!result.success) {
          setError(result.error ?? 'Invalid access code');
          setLoading(false);
        }
      } catch {
        setError('Connection error — check your internet');
        setLoading(false);
      }
    },
    [code, onLogin]
  );

  return (
    <div className="fixed inset-0 z-[10000] overflow-hidden">
      {/* Background — dark cosmos with purple nebula */}
      <div className="absolute inset-0 bg-[#060609]" />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse 60% 50% at 30% 20%, rgba(157,78,221,0.1) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 70% 80%, rgba(157,78,221,0.06) 0%, transparent 50%)',
      }} />

      {/* Floating particles */}
      <div className="login-particles">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="login-particle" />
        ))}
      </div>

      {/* Login content */}
      <div className="relative z-10 flex items-center justify-center w-full h-full px-5">
        <div className="login-box-appear w-full max-w-[400px]">

          {/* Logo — DASHtivi+ brand */}
          <div className="text-center mb-10">
            <h1 className="mb-3">
              <span className="text-[32px] font-black tracking-tight text-white uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>DASH</span>
              <span className="text-[24px] font-light tracking-wide text-white/50" style={{ fontFamily: "'Outfit', sans-serif" }}>tivi</span>
              <span className="text-primary-light text-[18px] font-bold ml-0.5">+</span>
            </h1>
            <p className="text-[11px] text-white/20 tracking-[5px] uppercase font-light">
              Premium Streaming
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'linear-gradient(135deg, rgba(157,78,221,0.06) 0%, rgba(10,10,15,0.9) 40%, rgba(157,78,221,0.03) 100%)',
              border: '1px solid rgba(157,78,221,0.1)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 60px rgba(157,78,221,0.08)',
            }}
          >
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[11px] text-white/30 font-medium tracking-wide uppercase mb-2 ml-1">
                  Access Code
                </label>
                <div className="relative">
                  <input
                    type={showCode ? 'text' : 'password'}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="DASH-SL-001"
                    autoFocus
                    className="w-full py-4 px-5 pr-12 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white text-[15px] outline-none transition-all duration-300 placeholder:text-white/20 focus:border-primary/40 focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(157,78,221,0.1)]"
                    style={{ fontFamily: "'Space Grotesk', monospace" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
                  >
                    {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-400/80 text-[12px] text-center font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl font-semibold text-[13px] tracking-[2px] uppercase transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-white"
                style={{
                  background: 'linear-gradient(135deg, #9D4EDD 0%, #7B2CBF 100%)',
                  boxShadow: '0 4px 20px rgba(157,78,221,0.3), 0 0 30px rgba(157,78,221,0.15)',
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying
                  </span>
                ) : (
                  'Enter'
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-white/12 text-[10px] tracking-[3px] uppercase font-light">
              Enter the code from your DASH subscription
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

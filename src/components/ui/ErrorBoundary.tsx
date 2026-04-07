import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 relative overflow-hidden">
          {/* Slow scanline */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="w-full h-px" style={{
              background: 'linear-gradient(90deg, transparent, rgba(157,78,221,0.12), transparent)',
              animation: 'scanline 4s linear infinite',
            }} />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="mb-5">
              <circle cx="24" cy="24" r="18" stroke="rgba(157,78,221,0.15)" strokeWidth="1" strokeDasharray="6 4" />
              <circle cx="24" cy="24" r="10" stroke="rgba(239,68,68,0.2)" strokeWidth="1" />
              <line x1="18" y1="18" x2="30" y2="30" stroke="rgba(239,68,68,0.35)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="30" y1="18" x2="18" y2="30" stroke="rgba(239,68,68,0.35)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>

            <p className="text-[14px] font-medium tracking-wide mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Transmission lost
            </p>
            <p className="text-[11px] mb-5 max-w-[240px] text-center leading-relaxed" style={{ color: 'rgba(255,255,255,0.22)' }}>
              The signal dropped unexpectedly
            </p>

            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="group relative px-5 py-2.5 rounded-xl text-[12px] font-medium tracking-wide transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(157,78,221,0.15) 0%, rgba(157,78,221,0.06) 100%)',
                border: '1px solid rgba(157,78,221,0.25)',
                color: 'rgba(157,78,221,0.85)',
              }}
            >
              Reconnect
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

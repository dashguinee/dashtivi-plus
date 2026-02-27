import React, { useState } from 'react';
import {
  Settings, Trash2, Info, Shield, Tv, Globe,
  ChevronRight, ExternalLink, Zap, Heart, AlertCircle, RefreshCw
} from 'lucide-react';
import { totalChannelCount, countries } from '@/data/channels';
import { allCollections } from '@/data/collections';
import { useChannelHealth } from '@/hooks/useChannelHealth';

interface Props {
  onClearHistory: () => void;
}

export const SettingsPage: React.FC<Props> = ({ onClearHistory }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const { deadCount, clearDead } = useChannelHealth();

  const handleClear = () => {
    onClearHistory();
    setShowConfirm(false);
  };

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="px-4 lg:px-6 pt-4 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-sm text-text-secondary">Preferences & information</p>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-6 pb-24 max-w-2xl space-y-6">
        {/* Platform Stats */}
        <section className="bg-bg-surface rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Platform Stats
            </h2>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/5">
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{totalChannelCount}</div>
              <div className="text-[11px] text-text-muted mt-0.5">Channels</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-accent">{allCollections.length}</div>
              <div className="text-[11px] text-text-muted mt-0.5">Collections</div>
            </div>
            <div className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{countries.length}</div>
              <div className="text-[11px] text-text-muted mt-0.5">Countries</div>
            </div>
          </div>
        </section>

        {/* Data & Privacy */}
        <section className="bg-bg-surface rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Data & Privacy
            </h2>
          </div>

          <div className="divide-y divide-white/5">
            {/* Clear History */}
            <div className="px-4 py-3">
              {showConfirm ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-warning">Clear all watch history?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowConfirm(false)}
                      className="px-3 py-1.5 text-xs text-text-secondary hover:text-white bg-bg-elevated rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClear}
                      className="px-3 py-1.5 text-xs text-white bg-error/80 hover:bg-error rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-4 h-4 text-text-muted" />
                    <div className="text-left">
                      <div className="text-sm text-white">Clear Watch History</div>
                      <div className="text-[11px] text-text-muted">Remove all recently watched</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-white transition-colors" />
                </button>
              )}
            </div>

            {/* Privacy note */}
            <div className="px-4 py-3 flex items-start gap-3">
              <Info className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-text-muted leading-relaxed">
                All data is stored locally on your device. DASH Lifestyle does not collect personal
                information or send analytics. Your watch history and favorites never leave your device.
              </p>
            </div>
          </div>
        </section>

        {/* Streaming Info */}
        <section className="bg-bg-surface rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Tv className="w-4 h-4 text-primary" />
              Streaming
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-white">Stream Quality</span>
              </div>
              <span className="text-xs text-primary-light font-medium">Auto (Adaptive)</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tv className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-white">Picture-in-Picture</span>
              </div>
              <span className="text-xs text-success font-medium">Supported</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-4 h-4 text-text-muted" />
                <div>
                  <span className="text-sm text-white">Dead Channels Hidden</span>
                  <div className="text-[11px] text-text-muted">Auto-excluded when they fail to play</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-warning font-medium">{deadCount}</span>
                {deadCount > 0 && (
                  <button
                    onClick={clearDead}
                    className="p-1.5 rounded-lg bg-bg-elevated hover:bg-white/10 transition-colors"
                    title="Reset dead list — re-test all channels"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="bg-bg-surface rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              About
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-text-secondary">Version</span>
              <span className="text-xs text-white font-mono">1.0.0</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-text-secondary">Platform</span>
              <span className="text-xs text-white">DASH Lifestyle</span>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Heart className="w-3.5 h-3.5 text-error" />
                <span>Built with love in West Africa</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

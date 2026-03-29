import { Monitor, Users, X, Tv } from 'lucide-react';
import type { StreamLimitInfo } from '@/hooks/usePlayer';

interface Props {
  info: StreamLimitInfo;
  onDismiss: () => void;
  onUpgrade: (plan: 'secondScreen' | 'familyPlan') => void;
}

export function StreamLimitOverlay({ info, onDismiss, onUpgrade }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-bg-surface border border-white/10 rounded-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Tv className="w-5 h-5 text-primary-light" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Screen in use</h3>
              <p className="text-xs text-white/40">Another device is streaming right now</p>
            </div>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            Your account supports 1 screen. Upgrade to watch on multiple devices at the same time.
          </p>
        </div>

        {/* Plans */}
        <div className="px-6 pb-6 space-y-3">
          {/* Second Screen */}
          <button
            onClick={() => onUpgrade('secondScreen')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
              <Monitor className="w-5 h-5 text-primary-light" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{info.upgrade.secondScreen.label}</span>
                <span className="text-[10px] font-bold text-primary-light bg-primary/20 px-1.5 py-0.5 rounded-full">
                  {info.upgrade.secondScreen.discount}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">{info.upgrade.secondScreen.screens} screens at once</p>
            </div>
          </button>

          {/* Family Plan */}
          <button
            onClick={() => onUpgrade('familyPlan')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20 hover:border-primary/50 hover:bg-primary/10 transition-colors text-left group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
              <Users className="w-5 h-5 text-primary-light" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{info.upgrade.familyPlan.label}</span>
                <span className="text-[10px] font-bold text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded-full">
                  {info.upgrade.familyPlan.discount}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-0.5">{info.upgrade.familyPlan.screens} screens — share with family</p>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02]">
          <p className="text-[10px] text-white/30 text-center">
            Contact us on WhatsApp to upgrade your plan
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useEffect, useState } from 'react';
import { Crown, ArrowRight, Sparkles, Play, Star, Globe, Tv, ExternalLink } from 'lucide-react';

/* ─── Service Data ────────────────────────────────────── */
const services = [
  {
    id: 'netflix',
    name: 'Netflix',
    tagline: 'Unlimited movies, TV shows & more',
    description: 'Watch anywhere. Cancel anytime. Get access to award-winning series, films, anime, and documentaries.',
    gradient: 'from-red-600 via-red-700 to-red-950',
    accentColor: '#E50914',
    glowColor: 'rgba(229, 9, 20, 0.3)',
    logo: 'N',
    count: '15,000+',
    highlights: [
      { label: '4K Ultra HD', icon: '📺' },
      { label: 'Download & Watch', icon: '📥' },
      { label: 'Netflix Originals', icon: '🎬' },
      { label: 'Multiple Profiles', icon: '👥' },
    ],
    popular: ['Stranger Things', 'Squid Game', 'Wednesday', 'The Crown', 'Money Heist'],
  },
  {
    id: 'prime',
    name: 'Prime Video',
    tagline: 'Movies, TV & live sports',
    description: 'Stream big hits, live sports, and premium channels. Included with Prime or subscribe separately.',
    gradient: 'from-sky-500 via-blue-700 to-blue-950',
    accentColor: '#00A8E1',
    glowColor: 'rgba(0, 168, 225, 0.3)',
    logo: '▶',
    count: '24,000+',
    highlights: [
      { label: 'X-Ray Features', icon: '🔍' },
      { label: 'Live Sports', icon: '⚽' },
      { label: 'Premium Channels', icon: '📡' },
      { label: 'Watch Party', icon: '🎉' },
    ],
    popular: ['The Boys', 'Rings of Power', 'Reacher', 'Jack Ryan', 'Citadel'],
  },
  {
    id: 'crunchyroll',
    name: 'Crunchyroll',
    tagline: 'The ultimate anime experience',
    description: 'The world\'s most popular anime streaming service. Simulcast from Japan, manga, and exclusive content.',
    gradient: 'from-orange-500 via-orange-700 to-amber-950',
    accentColor: '#F47521',
    glowColor: 'rgba(244, 117, 33, 0.3)',
    logo: 'CR',
    count: '1,200+',
    highlights: [
      { label: 'Simulcast', icon: '⚡' },
      { label: 'Manga Library', icon: '📖' },
      { label: 'Sub & Dub', icon: '🗣️' },
      { label: 'Offline Viewing', icon: '📲' },
    ],
    popular: ['One Piece', 'Demon Slayer', 'Jujutsu Kaisen', 'Dragon Ball', 'Attack on Titan'],
  },
  {
    id: 'disney',
    name: 'Disney+',
    tagline: 'Marvel, Star Wars, Pixar & more',
    description: 'The best stories in the world, all in one place. From Disney, Pixar, Marvel, Star Wars, and National Geographic.',
    gradient: 'from-blue-600 via-indigo-800 to-indigo-950',
    accentColor: '#113CCF',
    glowColor: 'rgba(17, 60, 207, 0.3)',
    logo: 'D+',
    count: '10,000+',
    highlights: [
      { label: 'IMAX Enhanced', icon: '🎭' },
      { label: 'GroupWatch', icon: '👨‍👩‍👧‍👦' },
      { label: 'Dolby Atmos', icon: '🔊' },
      { label: 'Behind the Scenes', icon: '🎥' },
    ],
    popular: ['The Mandalorian', 'Loki', 'WandaVision', 'Encanto', 'Moana'],
  },
];

/* ─── Service Section ─────────────────────────────────── */
const ServiceSection: React.FC<{
  service: typeof services[0];
  index: number;
  reversed: boolean;
}> = ({ service, index, reversed }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.15 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div className={`relative bg-gradient-to-br ${service.gradient} rounded-3xl overflow-hidden border border-white/10`}>
        {/* Ambient glow orbs */}
        <div
          className="absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] opacity-40"
          style={{ backgroundColor: service.accentColor }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full blur-[80px] opacity-20"
          style={{ backgroundColor: service.accentColor }}
        />

        <div className={`relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col ${reversed ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 items-center`}>
          {/* Info Side */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl font-black text-white/90 tracking-tighter">
                {service.logo}
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-sm rounded-lg">
                <Crown className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-semibold text-white/80">Available via TIVI</span>
              </div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight">
              {service.name}
            </h2>
            <p className="text-base text-white/50 mb-1">{service.tagline}</p>
            <p className="text-sm text-white/35 mb-6 max-w-lg">{service.description}</p>

            {/* Highlights */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {service.highlights.map((h) => (
                <div
                  key={h.label}
                  className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-sm rounded-xl"
                >
                  <span className="text-lg">{h.icon}</span>
                  <span className="text-xs font-medium text-white/70">{h.label}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => window.open('https://dasuperhub.com', '_blank')}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm rounded-xl font-semibold text-white hover:bg-white/20 transition-all hover:scale-105 active:scale-95 border border-white/10"
            >
              <Play className="w-4 h-4 fill-white" />
              Get Access via SuperHub
              <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-50" />
            </button>
          </div>

          {/* Popular Titles Side */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-5 border border-white/5">
              <h3 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Popular on {service.name}
              </h3>
              <div className="space-y-2.5">
                {service.popular.map((title, i) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 group cursor-pointer"
                  >
                    <span className="w-6 text-center text-sm font-bold text-white/20">
                      {i + 1}
                    </span>
                    <div className="flex-1 flex items-center justify-between py-2 px-3 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                      <span className="text-sm text-white/80 group-hover:text-white transition-colors">
                        {title}
                      </span>
                      <Play className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-white/30 text-center mt-3">
                {service.count} titles available
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Services Page ───────────────────────────────────── */
export const ServicesPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-16">
      {/* Hero */}
      <div className="px-4 lg:px-6 pt-6 pb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-white/10">
            <Sparkles className="w-6 h-6 text-primary-light" />
          </div>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          Your Streaming <span className="text-gradient">Universe</span>
        </h1>
        <p className="text-sm text-text-secondary max-w-lg mx-auto">
          All your favorite streaming platforms, unified under TIVI.
          Access Netflix, Prime Video, Crunchyroll, Disney+ and more.
        </p>

        {/* Platform pills */}
        <div className="flex items-center justify-center gap-3 mt-6 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface rounded-full border border-white/5">
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-text-secondary">4 Platforms</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface rounded-full border border-white/5">
            <Tv className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs text-text-secondary">50,000+ Titles</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-surface rounded-full border border-white/5">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-text-secondary">All via DASH SuperHub</span>
          </div>
        </div>
      </div>

      {/* Service Sections */}
      <div className="px-4 lg:px-6 space-y-6 pb-12">
        {services.map((service, i) => (
          <ServiceSection
            key={service.id}
            service={service}
            index={i}
            reversed={i % 2 === 1}
          />
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="px-4 lg:px-6 pb-24">
        <div
          className="relative bg-gradient-to-r from-primary via-primary-dark to-accent rounded-3xl p-8 text-center overflow-hidden cursor-pointer group"
          onClick={() => window.open('https://dasuperhub.com', '_blank')}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity" />
          <h2 className="text-2xl font-bold text-white mb-2 relative z-10">
            Ready to Stream Everything?
          </h2>
          <p className="text-sm text-white/70 mb-5 relative z-10">
            Get your DASH SuperHub pass and unlock all platforms
          </p>
          <button className="px-8 py-3.5 bg-white rounded-2xl font-bold text-primary hover:shadow-xl hover:scale-105 transition-all active:scale-95 relative z-10">
            Visit DASH SuperHub
            <ArrowRight className="inline w-4 h-4 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

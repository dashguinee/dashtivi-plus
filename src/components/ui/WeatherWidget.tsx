import React, { useState, useEffect, useRef } from 'react';

/**
 * Ambient Weather Widget — faded, bottom-right of home backdrop.
 * Alternates between current weather+time and 5-hour forecast.
 * Uses Open-Meteo (free, no API key). Browser geolocation for coords.
 */

interface WeatherData {
  city: string;
  temp: number;
  code: number;
  forecast: { hour: string; temp: number; code: number }[];
}

// WMO weather codes → emoji
const WEATHER_ICON: Record<number, string> = {
  0: '\u2600\uFE0F',      // Clear
  1: '\uD83C\uDF24\uFE0F', // Mainly clear
  2: '\u26C5',             // Partly cloudy
  3: '\u2601\uFE0F',      // Overcast
  45: '\uD83C\uDF2B\uFE0F', // Fog
  48: '\uD83C\uDF2B\uFE0F', // Rime fog
  51: '\uD83C\uDF26\uFE0F', // Light drizzle
  53: '\uD83C\uDF26\uFE0F', // Moderate drizzle
  55: '\uD83C\uDF27\uFE0F', // Dense drizzle
  61: '\uD83C\uDF27\uFE0F', // Slight rain
  63: '\uD83C\uDF27\uFE0F', // Moderate rain
  65: '\uD83C\uDF27\uFE0F', // Heavy rain
  71: '\u2744\uFE0F',      // Slight snow
  73: '\u2744\uFE0F',      // Moderate snow
  75: '\u2744\uFE0F',      // Heavy snow
  80: '\uD83C\uDF26\uFE0F', // Slight showers
  81: '\uD83C\uDF27\uFE0F', // Moderate showers
  82: '\u26C8\uFE0F',     // Violent showers
  95: '\u26C8\uFE0F',     // Thunderstorm
  96: '\u26C8\uFE0F',     // Thunderstorm + hail
  99: '\u26C8\uFE0F',     // Thunderstorm + heavy hail
};

function getIcon(code: number): string {
  return WEATHER_ICON[code] || WEATHER_ICON[Math.floor(code / 10) * 10] || '\u2600\uFE0F';
}

function getCityFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parts = tz.split('/');
    return (parts[parts.length - 1] || '').replace(/_/g, ' ');
  } catch { return ''; }
}

const CACHE_KEY = 'weather-data';
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export const WeatherWidget: React.FC = React.memo(() => {
  const [data, setData] = useState<WeatherData | null>(null);
  const [showForecast, setShowForecast] = useState(false);
  const [time, setTime] = useState(new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  // Update clock every minute
  useEffect(() => {
    intervalRef.current = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Alternate between current and forecast every 8s
  useEffect(() => {
    if (!data?.forecast.length) return;
    const timer = setInterval(() => setShowForecast(prev => !prev), 8000);
    return () => clearInterval(timer);
  }, [data]);

  // Fetch weather
  useEffect(() => {
    // Check cache
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data: cached, ts } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) { setData(cached); return; }
      }
    } catch {}

    const fetchWeather = (lat: number, lon: number) => {
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,weathercode&timezone=auto&forecast_days=1`, { signal: AbortSignal.timeout(5000) })
        .then(r => r.json())
        .then(d => {
          const cw = d.current_weather;
          const hourly = d.hourly;
          const nowHour = new Date().getHours();

          // Next 5 hours from current
          const forecast: WeatherData['forecast'] = [];
          for (let i = 0; i < hourly.time.length && forecast.length < 5; i++) {
            const h = new Date(hourly.time[i]).getHours();
            if (h > nowHour || (h === 0 && nowHour >= 22)) {
              forecast.push({
                hour: `${h.toString().padStart(2, '0')}:00`,
                temp: Math.round(hourly.temperature_2m[i]),
                code: hourly.weathercode[i],
              });
            }
          }

          const result: WeatherData = {
            city: getCityFromTimezone(),
            temp: Math.round(cw.temperature),
            code: cw.weathercode,
            forecast,
          };
          setData(result);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: result, ts: Date.now() })); } catch {}
        })
        .catch(() => {});
    };

    // Try geolocation, fallback to KL (Dash's default)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(3.14, 101.69), // Fallback: Kuala Lumpur
        { timeout: 5000, maximumAge: 600000 }
      );
    } else {
      fetchWeather(3.14, 101.69);
    }
  }, []);

  if (!data) return null;

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div
      className="fixed bottom-24 right-4 z-[5] pointer-events-none select-none"
      style={{
        opacity: 0.35,
        transition: 'opacity 0.6s ease',
      }}
    >
      <div
        className="relative overflow-hidden"
        style={{ minWidth: 120 }}
      >
        {/* Current weather + time */}
        <div
          style={{
            opacity: showForecast ? 0 : 1,
            transform: showForecast ? 'translateY(-8px)' : 'translateY(0)',
            transition: 'opacity 1.2s cubic-bezier(0.16,1,0.3,1), transform 1.2s cubic-bezier(0.16,1,0.3,1)',
            position: showForecast ? 'absolute' : 'relative',
          }}
        >
          <div className="flex items-baseline gap-1.5">
            <span className="text-[22px]">{getIcon(data.code)}</span>
            <span className="text-[18px] font-bold text-white/90 font-mono">{data.temp}°</span>
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[10px] text-white/40 font-medium">{timeStr}</span>
            {data.city && <span className="text-[9px] text-white/25">{data.city}</span>}
          </div>
        </div>

        {/* 5-hour forecast */}
        <div
          style={{
            opacity: showForecast ? 1 : 0,
            transform: showForecast ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 1.2s cubic-bezier(0.16,1,0.3,1), transform 1.2s cubic-bezier(0.16,1,0.3,1)',
            position: showForecast ? 'relative' : 'absolute',
            top: 0,
          }}
        >
          <div className="flex gap-2.5">
            {data.forecast.map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px]">{getIcon(f.code)}</span>
                <span className="text-[9px] font-mono text-white/60">{f.temp}°</span>
                <span className="text-[8px] text-white/25">{f.hour}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

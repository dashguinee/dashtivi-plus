/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_PROXY_URL: string;
  readonly VITE_XTREAM_API: string;
  readonly VITE_XTREAM_STREAM: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

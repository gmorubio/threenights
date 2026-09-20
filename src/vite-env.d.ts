/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TMDB_READ_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

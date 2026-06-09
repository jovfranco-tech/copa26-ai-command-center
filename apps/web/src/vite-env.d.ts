/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional Sentry DSN — when set (via `vercel env`), error tracking initializes. */
  readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

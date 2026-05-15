/// <reference types="vite/client" />

declare const __ROUTE_MESSAGING_ENABLED__: boolean;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_AZURE_CLIENT_ID: string
  readonly VITE_AZURE_TENANT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

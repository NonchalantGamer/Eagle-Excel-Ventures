import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

export type { SupabaseUser };

export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  AUTH = 'auth',
  SYNC = 'sync',
}

export interface SupabaseConfig {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  url?: string;
  anonKey?: string;
}

// Fallback / default credentials configured for active Supabase project
const DEFAULT_SUPABASE_URL = ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 'https://btbcjijnrcnoutqskrtv.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0YmNqaWpucmNub3V0cXNrcnR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODM4NzksImV4cCI6MjEwMTg1OTg3OX0.2EVkFCL9QY6s8i8jX9iv4JhkLdq3ZbYMKzENu2x5bFY';

/**
 * Retrieve active Supabase configuration (custom user config in localStorage or env vars)
 */
export function getActiveSupabaseConfig(): SupabaseConfig {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('custom_supabase_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        const url = parsed.supabaseUrl || parsed.url;
        const key = parsed.supabaseAnonKey || parsed.anonKey;
        if (url && key) {
          return {
            supabaseUrl: url,
            supabaseAnonKey: key,
            url,
            anonKey: key
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse custom Supabase config:', e);
    }
  }

  return {
    supabaseUrl: DEFAULT_SUPABASE_URL,
    supabaseAnonKey: DEFAULT_SUPABASE_ANON_KEY,
    url: DEFAULT_SUPABASE_URL,
    anonKey: DEFAULT_SUPABASE_ANON_KEY
  };
}

export const getSupabaseConfig = getActiveSupabaseConfig;

/**
 * Check if Supabase integration is enabled and configured with valid project URL and anon key
 */
export function isSupabaseEnabled(): boolean {
  if (typeof window !== 'undefined') {
    const disabledFlag = localStorage.getItem('supabase_integration_disabled');
    if (disabledFlag === 'true') {
      return false;
    }
  }

  const config = getActiveSupabaseConfig();
  return !!(
    config.supabaseUrl &&
    config.supabaseUrl.trim().length > 0 &&
    config.supabaseAnonKey &&
    config.supabaseAnonKey.trim().length > 0 &&
    config.supabaseUrl.startsWith('http')
  );
}

// Singleton client instance
let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

/**
 * Get or create the Supabase client instance
 */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseEnabled()) {
    return null;
  }

  const config = getActiveSupabaseConfig();
  const configKey = `${config.supabaseUrl}:${config.supabaseAnonKey}`;

  if (!supabaseInstance || currentConfigKey !== configKey) {
    try {
      supabaseInstance = createClient(config.supabaseUrl || '', config.supabaseAnonKey || '', {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        },
      });
      currentConfigKey = configKey;
    } catch (err) {
      console.warn('Supabase client initialization warning:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export const supabase: SupabaseClient | null = getSupabase();

/**
 * Save custom Supabase connection parameters
 */
export function saveCustomSupabaseConfig(config: SupabaseConfig) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('supabase_integration_disabled');
    localStorage.setItem('custom_supabase_config', JSON.stringify(config));
    // Reset instance to reinitialize
    supabaseInstance = null;
    currentConfigKey = '';
  }
}

/**
 * Disable Supabase to switch to standalone local storage mode
 */
export function disableSupabase() {
  if (typeof window !== 'undefined') {
    localStorage.setItem('supabase_integration_disabled', 'true');
    supabaseInstance = null;
    currentConfigKey = '';
  }
}

/**
 * Re-enable Supabase mode
 */
export function enableSupabase() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('supabase_integration_disabled');
    supabaseInstance = null;
    currentConfigKey = '';
  }
}

/**
 * Reset Supabase settings to env defaults
 */
export function resetSupabaseConfig() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('custom_supabase_config');
    localStorage.removeItem('supabase_integration_disabled');
    supabaseInstance = null;
    currentConfigKey = '';
  }
}

/**
 * Check if a custom user config is set
 */
export function hasCustomSupabaseConfig(): boolean {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('custom_supabase_config');
  }
  return false;
}

export const isCustomSupabaseConfigActive = hasCustomSupabaseConfig;

/**
 * Centralized error handler for Supabase operations with contextual messages
 */
export function handleSupabaseError(error: unknown, operation: OperationType, context?: string): void {
  let errMsg = '';
  if (error instanceof Error) {
    errMsg = error.message;
  } else if (typeof error === 'object' && error !== null) {
    const obj = error as Record<string, any>;
    errMsg = obj.message || obj.error_description || obj.details || obj.hint || JSON.stringify(error);
  } else {
    errMsg = String(error);
  }
  console.warn(`[Supabase ${operation}] ${context || 'general'}: ${errMsg}`);
}

/**
 * Test connectivity to Supabase backend
 */
export function checkSupabaseConnection(): Promise<{ connected: boolean; latencyMs?: number; error?: string }> {
  if (!isSupabaseEnabled()) {
    return Promise.resolve({ connected: false, error: 'Supabase is not configured or disabled' });
  }

  const client = getSupabase();
  if (!client) {
    return Promise.resolve({ connected: false, error: 'Could not create Supabase client' });
  }

  const start = performance.now();
  return client.auth.getSession()
    .then(({ error }) => {
      const latencyMs = Math.round(performance.now() - start);
      if (error) {
        return { connected: false, latencyMs, error: error.message };
      }
      return { connected: true, latencyMs };
    })
    .catch((err) => {
      return { connected: false, error: err instanceof Error ? err.message : String(err) };
    });
}

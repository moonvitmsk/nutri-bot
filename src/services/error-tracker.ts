import { supabase } from '../db/supabase.js';

export type ErrorType = 'webhook' | 'ai' | 'db' | 'cron' | 'auth' | 'monitor' | 'gif' | 'recipe' | 'welcome_card';

interface ErrorContext {
  user_id?: number;
  [key: string]: any;
}

export async function trackError(
  type: ErrorType,
  message: string,
  context?: ErrorContext
): Promise<void> {
  const userId = context?.user_id ?? null;
  const stack = new Error().stack ?? null;

  try {
    await supabase.from('nutri_error_log').insert({
      error_type: type,
      message: message.slice(0, 2000),
      stack: stack?.slice(0, 5000) ?? null,
      user_id: userId,
      context: context ?? {},
    });
  } catch (err) {
    // Fallback to console if DB insert fails
    console.error('[error-tracker] Failed to log error to DB:', err);
    console.error(`[${type}] ${message}`, context);
  }
}

export function wrapHandler<T extends (...args: any[]) => Promise<any>>(
  type: ErrorType,
  fn: T,
  contextExtractor?: (...args: Parameters<T>) => ErrorContext
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (err) {
      const ctx = contextExtractor ? contextExtractor(...args as Parameters<T>) : {};
      const msg = err instanceof Error ? err.message : String(err);
      await trackError(type, msg, ctx);
      throw err;
    }
  }) as T;
}

/**
 * Retry Logic and Error Handling Utilities
 */

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryOnError?: (error: any) => boolean;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
  retryOnError: () => true,
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  let delay = opts.delayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      if (!opts.retryOnError(error)) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === opts.maxAttempts) {
        throw error;
      }

      // Wait before retrying
      console.warn(`Attempt ${attempt}/${opts.maxAttempts} failed:`, error);
      await sleep(delay);

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function that retries on network errors
 */
export async function retryOnNetworkError<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts,
    delayMs: 500,
    retryOnError: (error) => {
      // Retry on network errors, timeouts, and 5xx errors
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        return true;
      }
      if (error.status >= 500 && error.status < 600) {
        return true;
      }
      if (error.message?.includes('fetch failed') || error.message?.includes('network')) {
        return true;
      }
      return false;
    },
  });
}

/**
 * Execute functions in parallel with error handling
 */
export async function parallelWithErrors<T>(
  functions: Array<() => Promise<T>>
): Promise<Array<T | Error>> {
  const results = await Promise.allSettled(functions.map(fn => fn()));

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return result.reason;
    }
  });
}

/**
 * Execute functions in parallel, returning only successful results
 */
export async function parallelSuccessful<T>(
  functions: Array<() => Promise<T>>
): Promise<T[]> {
  const results = await parallelWithErrors(functions);
  return results.filter((result): result is T => !(result instanceof Error));
}

/**
 * Timeout wrapper for promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: string = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutError));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Normalize error to Error object
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String(error.message));
  }

  return new Error('Unknown error');
}

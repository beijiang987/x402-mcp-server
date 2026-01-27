/**
 * HTTP Client with Connection Pooling
 *
 * Provides a unified HTTP client with:
 * - Connection pooling and reuse
 * - Automatic retry with exponential backoff
 * - Request timeout handling
 * - Error handling
 */

import https from 'https';
import http from 'http';
import { logger } from './logger.js';

/**
 * HTTP Request Options
 */
export interface HttpRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * HTTP Client with connection pooling
 */
export class HttpClient {
  private httpsAgent: https.Agent;
  private httpAgent: http.Agent;

  constructor() {
    // Create agents with connection pooling
    this.httpsAgent = new https.Agent({
      keepAlive: true,           // Reuse connections
      keepAliveMsecs: 30000,     // Keep connections alive for 30s
      maxSockets: 50,            // Max 50 concurrent connections per host
      maxFreeSockets: 10,        // Keep 10 idle connections
      timeout: 30000,            // Socket timeout 30s
    });

    this.httpAgent = new http.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000,
    });
  }

  /**
   * GET request
   */
  async get<T = any>(
    url: string,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    return this.request<T>(url, {
      method: 'GET',
      ...options,
    });
  }

  /**
   * POST request
   */
  async post<T = any>(
    url: string,
    body?: any,
    options: HttpRequestOptions = {}
  ): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    return this.request<T>(url, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    });
  }

  /**
   * Internal request method with retry logic
   */
  private async request<T = any>(
    url: string,
    options: HttpRequestOptions & { method?: string; body?: string } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      headers = {},
      body,
      timeout = 10000,
      retries = 3,
      retryDelay = 1000,
    } = options;

    const maxRetries = retries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        // Determine agent based on protocol
        const isHttps = url.startsWith('https://');
        const agent = isHttps ? this.httpsAgent : this.httpAgent;

        // Make request
        const response = await fetch(url, {
          method,
          headers,
          body,
          // @ts-ignore - agent is supported in Node.js 18+
          agent,
          signal: AbortSignal.timeout(timeout),
        });

        const duration = Date.now() - startTime;

        // Log request
        logger.debug('HTTP request completed', {
          method,
          url: this.maskUrl(url),
          status: response.status,
          duration,
          attempt: attempt + 1,
        });

        // Handle non-OK responses
        if (!response.ok) {
          const error = new Error(
            `HTTP ${response.status}: ${response.statusText}`
          );
          logger.warn('HTTP request failed', {
            method,
            url: this.maskUrl(url),
            status: response.status,
            statusText: response.statusText,
          });
          throw error;
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        } else {
          return (await response.text()) as unknown as T;
        }
      } catch (error: any) {
        lastError = error;

        // Don't retry on certain errors
        if (error.name === 'AbortError') {
          logger.warn('HTTP request timeout', {
            url: this.maskUrl(url),
            timeout,
          });
          throw new Error(`Request timeout after ${timeout}ms`);
        }

        // If this was the last retry, throw
        if (attempt >= maxRetries) {
          logger.error('HTTP request failed after retries', {
            url: this.maskUrl(url),
            attempts: maxRetries + 1,
            error: error.message,
          });
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = retryDelay * Math.pow(2, attempt);
        logger.debug('Retrying HTTP request', {
          url: this.maskUrl(url),
          attempt: attempt + 1,
          maxRetries: maxRetries + 1,
          delay,
        });
        await this.sleep(delay);
      }
    }

    // All retries failed
    throw lastError || new Error('HTTP request failed');
  }

  /**
   * Mask sensitive parts of URL (API keys, tokens)
   */
  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Mask query parameters that look like keys/tokens
      const params = urlObj.searchParams;
      for (const key of params.keys()) {
        if (
          key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('token') ||
          key.toLowerCase().includes('secret')
        ) {
          params.set(key, '***');
        }
      }
      return urlObj.toString();
    } catch {
      // If URL parsing fails, just return first 50 chars
      return url.length > 50 ? url.substring(0, 50) + '...' : url;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cleanup connections
   */
  destroy(): void {
    this.httpsAgent.destroy();
    this.httpAgent.destroy();
  }
}

// Export singleton instance
export const httpClient = new HttpClient();

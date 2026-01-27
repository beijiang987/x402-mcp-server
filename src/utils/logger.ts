/**
 * Structured Logging System
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  error?: {
    message: string;
    stack?: string;
  };
}

class Logger {
  private level: LogLevel;
  private enableConsole: boolean;

  constructor() {
    // Set log level from environment or default to INFO
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
    this.enableConsole = process.env.NODE_ENV !== 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  private formatLog(level: string, message: string, data?: any, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };

    if (data !== undefined) {
      entry.data = data;
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private output(entry: LogEntry): void {
    if (this.enableConsole) {
      const color = this.getColor(entry.level);
      console.log(`${color}[${entry.timestamp}] ${entry.level}:${this.getResetColor()}`, entry.message);
      if (entry.data) {
        console.log('  Data:', JSON.stringify(entry.data, null, 2));
      }
      if (entry.error) {
        console.error('  Error:', entry.error.message);
        if (entry.error.stack) {
          console.error(entry.error.stack);
        }
      }
    } else {
      // Production: output as JSON for log aggregation
      console.log(JSON.stringify(entry));
    }
  }

  private getColor(level: string): string {
    switch (level) {
      case 'DEBUG':
        return '\x1b[36m'; // Cyan
      case 'INFO':
        return '\x1b[32m'; // Green
      case 'WARN':
        return '\x1b[33m'; // Yellow
      case 'ERROR':
        return '\x1b[31m'; // Red
      default:
        return '';
    }
  }

  private getResetColor(): string {
    return '\x1b[0m';
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.output(this.formatLog('DEBUG', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      this.output(this.formatLog('INFO', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      this.output(this.formatLog('WARN', message, data));
    }
  }

  error(message: string, error?: Error, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.output(this.formatLog('ERROR', message, data, error));
    }
  }

  // Specialized logging methods

  apiRequest(method: string, path: string, data?: any): void {
    this.info(`API Request: ${method} ${path}`, data);
  }

  apiResponse(method: string, path: string, status: number, duration: number): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this[level as 'info' | 'warn' | 'error'](
      `API Response: ${method} ${path} - ${status} (${duration}ms)`
    );
  }

  dataSource(source: string, operation: string, success: boolean, duration: number): void {
    if (success) {
      this.debug(`Data Source [${source}]: ${operation} succeeded (${duration}ms)`);
    } else {
      this.warn(`Data Source [${source}]: ${operation} failed (${duration}ms)`);
    }
  }

  payment(action: string, txHash?: string, amount?: string, success: boolean = true): void {
    // Mask sensitive data for privacy
    const maskedHash = txHash ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}` : 'N/A';
    const maskedAmount = amount ? `$${parseFloat(amount).toFixed(4)}` : 'N/A';

    if (success) {
      this.info(`Payment ${action}`, { txHash: maskedHash, amount: maskedAmount });
    } else {
      this.error(`Payment ${action} failed`, undefined, { txHash: maskedHash, amount: maskedAmount });
    }
  }

  /**
   * Mask sensitive string (show first N and last M characters)
   */
  private maskString(str: string | undefined, showFirst: number = 6, showLast: number = 4): string {
    if (!str) return 'N/A';
    if (str.length <= showFirst + showLast) return str;
    return `${str.slice(0, showFirst)}...${str.slice(-showLast)}`;
  }

  rateLimit(identifier: string, allowed: boolean, tier: string): void {
    if (allowed) {
      this.debug(`Rate Limit: Allowed for ${identifier} (${tier})`);
    } else {
      this.warn(`Rate Limit: Exceeded for ${identifier} (${tier})`);
    }
  }

  cache(action: 'hit' | 'miss' | 'set', key: string): void {
    this.debug(`Cache ${action}: ${key}`);
  }
}

// Export singleton instance
export const logger = new Logger();

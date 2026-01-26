/**
 * Performance Monitoring and Metrics
 */

import { logger } from './logger.js';

interface PerformanceMetric {
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: number;
  errors: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();

  /**
   * Record a performance measurement
   */
  record(name: string, duration: number, isError: boolean = false): void {
    let metric = this.metrics.get(name);

    if (!metric) {
      metric = {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        avgDuration: 0,
        errors: 0,
      };
      this.metrics.set(name, metric);
    }

    metric.count++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.avgDuration = metric.totalDuration / metric.count;

    if (isError) {
      metric.errors++;
    }

    // Log slow operations
    if (duration > 3000) {
      logger.warn(`Slow operation detected: ${name} took ${duration}ms`);
    }
  }

  /**
   * Time an async function
   */
  async timeAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    let isError = false;

    try {
      const result = await fn();
      return result;
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      const duration = Date.now() - start;
      this.record(name, duration, isError);
    }
  }

  /**
   * Time a synchronous function
   */
  timeSync<T>(name: string, fn: () => T): T {
    const start = Date.now();
    let isError = false;

    try {
      const result = fn();
      return result;
    } catch (error) {
      isError = true;
      throw error;
    } finally {
      const duration = Date.now() - start;
      this.record(name, duration, isError);
    }
  }

  /**
   * Get metrics for a specific operation
   */
  getMetric(name: string): PerformanceMetric | null {
    return this.metrics.get(name) || null;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, PerformanceMetric> {
    return new Map(this.metrics);
  }

  /**
   * Get summary of all metrics
   */
  getSummary(): {
    operations: number;
    totalCalls: number;
    totalErrors: number;
    avgDuration: number;
  } {
    let totalCalls = 0;
    let totalErrors = 0;
    let totalDuration = 0;

    for (const metric of this.metrics.values()) {
      totalCalls += metric.count;
      totalErrors += metric.errors;
      totalDuration += metric.totalDuration;
    }

    return {
      operations: this.metrics.size,
      totalCalls,
      totalErrors,
      avgDuration: totalCalls > 0 ? totalDuration / totalCalls : 0,
    };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
  }

  /**
   * Log performance report
   */
  logReport(): void {
    const summary = this.getSummary();
    logger.info('Performance Summary', {
      operations: summary.operations,
      totalCalls: summary.totalCalls,
      totalErrors: summary.totalErrors,
      avgDuration: Math.round(summary.avgDuration),
    });

    // Log top 10 slowest operations
    const sorted = Array.from(this.metrics.entries())
      .sort((a, b) => b[1].avgDuration - a[1].avgDuration)
      .slice(0, 10);

    if (sorted.length > 0) {
      logger.info('Top 10 Slowest Operations:');
      sorted.forEach(([name, metric], index) => {
        logger.info(`  ${index + 1}. ${name}`, {
          avg: Math.round(metric.avgDuration),
          min: Math.round(metric.minDuration),
          max: Math.round(metric.maxDuration),
          count: metric.count,
          errors: metric.errors,
        });
      });
    }
  }

  /**
   * Start automatic reporting
   */
  startAutoReport(intervalMs: number = 3600000): void {
    setInterval(() => {
      this.logReport();
    }, intervalMs);
  }
}

// Export singleton instance
export const performance = new PerformanceMonitor();

// Start auto-reporting every hour
performance.startAutoReport();

/**
 * Helper function to create a timed wrapper
 */
export function timed(name: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return performance.timeAsync(`${name}.${propertyKey}`, () =>
        originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

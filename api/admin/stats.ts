/**
 * Admin Statistics API Endpoint
 * Returns aggregated statistics for the dashboard
 * Supports both basic stats and full historical stats
 * 
 * Query params:
 *   ?type=full - Returns full historical statistics (previously full-stats endpoint)
 *   default    - Returns realtime dashboard statistics
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../src/database.js';
import { sql } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
        return res.status(200).end();
  }

  if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
  }

  const statsType = req.query.type as string;

  try {
        if (statsType === 'full') {
                return await handleFullStats(res);
        }
        return await handleBasicStats(res);
  } catch (error: any) {
        console.error('Failed to fetch stats:', error);
        return res.status(500).json({
                error: 'Failed to fetch statistics',
                message: error.message,
        });
  }
}

async function handleBasicStats(res: VercelResponse) {
    const [
          realtimeStats,
          endpointStats,
          dailyRevenue,
          hourlyRequests,
          topPayers,
        ] = await Promise.all([
          db.getRealtimeStats(),
          db.getEndpointStats(),
          db.getDailyRevenue(30),
          db.getHourlyRequests(),
          db.getTopPayers(10),
        ]);

  return res.status(200).json({
        success: true,
        data: {
                realtime: realtimeStats,
                endpoints: endpointStats,
                revenue: dailyRevenue,
                hourly: hourlyRequests,
                topPayers: topPayers,
        },
        timestamp: Date.now(),
  });
}

async function handleFullStats(res: VercelResponse) {
    const totalStats = await sql.query(`
        SELECT 
              COUNT(*) as total_calls,
                    COUNT(CASE WHEN tier = 'free' THEN 1 END) as free_calls,
                          COUNT(CASE WHEN tier = 'paid' THEN 1 END) as paid_calls,
                                COUNT(CASE WHEN success = true THEN 1 END) as successful_calls,
                                      AVG(CASE WHEN response_time_ms IS NOT NULL THEN response_time_ms END) as avg_response_time
                                          FROM api_calls
                                            `);

  const endpointStats = await sql.query(`
      SELECT endpoint, COUNT(*) as calls,
            COUNT(CASE WHEN tier = 'paid' THEN 1 END) as paid_calls,
                  COUNT(CASE WHEN success = true THEN 1 END) as successful_calls,
                        AVG(CASE WHEN response_time_ms IS NOT NULL THEN response_time_ms END) as avg_response_time
                            FROM api_calls GROUP BY endpoint ORDER BY calls DESC
                              `);

  const revenueStats = await sql.query(`
      SELECT COUNT(*) as total_payments, SUM(amount_usd) as total_revenue,
            AVG(amount_usd) as avg_payment, MIN(amount_usd) as min_payment,
                  MAX(amount_usd) as max_payment
                      FROM payments WHERE verified = true
                        `);

  const dailyStats = await sql.query(`
      SELECT DATE(created_at) as date, COUNT(*) as calls,
            COUNT(CASE WHEN tier = 'free' THEN 1 END) as free_calls,
                  COUNT(CASE WHEN tier = 'paid' THEN 1 END) as paid_calls
                      FROM api_calls WHERE created_at >= NOW() - INTERVAL '30 days'
                          GROUP BY DATE(created_at) ORDER BY date DESC LIMIT 30
                            `);

  const chainStats = await sql.query(`
      SELECT chain, COUNT(*) as payments, SUM(amount_usd) as revenue
          FROM payments WHERE verified = true GROUP BY chain ORDER BY revenue DESC
            `);

  const revenueByEndpoint = await sql.query(`
      SELECT endpoint, COUNT(*) as payments, SUM(amount_usd) as revenue
          FROM payments WHERE verified = true GROUP BY endpoint ORDER BY revenue DESC
            `);

  return res.status(200).json({
        success: true,
        data: {
                overview: {
                          total_calls: parseInt(totalStats.rows[0].total_calls || 0),
                          free_calls: parseInt(totalStats.rows[0].free_calls || 0),
                          paid_calls: parseInt(totalStats.rows[0].paid_calls || 0),
                          successful_calls: parseInt(totalStats.rows[0].successful_calls || 0),
                          success_rate: totalStats.rows[0].total_calls > 0
                            ? ((totalStats.rows[0].successful_calls / totalStats.rows[0].total_calls) * 100).toFixed(2) : 0,
                          avg_response_time: Math.round(parseFloat(totalStats.rows[0].avg_response_time || 0)),
                },
                revenue: {
                          total_payments: parseInt(revenueStats.rows[0].total_payments || 0),
                          total_revenue: parseFloat(revenueStats.rows[0].total_revenue || 0).toFixed(4),
                          avg_payment: parseFloat(revenueStats.rows[0].avg_payment || 0).toFixed(4),
                          min_payment: parseFloat(revenueStats.rows[0].min_payment || 0).toFixed(6),
                          max_payment: parseFloat(revenueStats.rows[0].max_payment || 0).toFixed(6),
                },
                endpoints: endpointStats.rows.map(row => ({
                          endpoint: row.endpoint, calls: parseInt(row.calls),
                          paid_calls: parseInt(row.paid_calls),
                          successful_calls: parseInt(row.successful_calls),
                          success_rate: ((row.successful_calls / row.calls) * 100).toFixed(2),
                          avg_response_time: Math.round(parseFloat(row.avg_response_time || 0)),
                })),
                chains: chainStats.rows.map(row => ({
                          chain: row.chain, payments: parseInt(row.payments),
                          revenue: parseFloat(row.revenue).toFixed(4),
                })),
                revenue_by_endpoint: revenueByEndpoint.rows.map(row => ({
                          endpoint: row.endpoint, payments: parseInt(row.payments),
                          revenue: parseFloat(row.revenue).toFixed(4),
                })),
                daily: dailyStats.rows.map(row => ({
                          date: row.date, calls: parseInt(row.calls),
                          free_calls: parseInt(row.free_calls), paid_calls: parseInt(row.paid_calls),
                })),
        },
        timestamp: Date.now(),
  });
}

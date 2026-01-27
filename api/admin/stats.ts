/**
 * Admin Statistics API Endpoint
 * Returns aggregated statistics for the dashboard
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../../src/database.js';

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

  try {
    // Fetch all statistics in parallel
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
  } catch (error: any) {
    console.error('Failed to fetch stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error.message,
    });
  }
}

/**
 * Admin Statistics & Health API Endpoint
 * Returns aggregated statistics for the dashboard
 * Supports basic stats, full historical stats, and health check
 *
 * Query params:
 *   ?type=full   - Returns full historical statistics (previously full-stats endpoint)
 *   ?type=health - Returns health check and configuration status (previously health endpoint)
 *   default      - Returns realtime dashboard statistics
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

    const type = (req.query.type as string) || 'basic';

    try {
                if (type === 'health') {
                                return handleHealth(req, res);
                } else if (type === 'full') {
                                return handleFullStats(req, res);
                } else {
                                return handleBasicStats(req, res);
                }
    } catch (error: any) {
                console.error('Stats/Health API error:', error);
                return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
}

async function handleHealth(req: VercelRequest, res: VercelResponse) {
        const envStatus = {
                    KV_URL: process.env.KV_REST_API_URL ? '✓ configured' : '✗ missing',
                    KV_TOKEN: process.env.KV_REST_API_TOKEN ? '✓ configured' : '✗ missing',
                    PAYMENT_ADDRESS_BASE: process.env.X402_PAYMENT_ADDRESS_BASE ? '✓ configured' : '> using default',
                    PAYMENT_ADDRESS: process.env.X402_RECEIVE_ADDRESS ? '✓ configured' : '> using default',
                    BASE_SEPOLIA_RPC: process.env.BASE_SEPOLIA_RPC_URL ? '✓ configured' : '✗ missing',
                    RPC_URL: process.env.RPC_URL ? '✓ configured' : '✗ missing',
                    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '✓ configured' : '✗ missing',
        };

    return res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                environment: envStatus,
                version: '1.1.0',
    });
}

async function handleFullStats(req: VercelRequest, res: VercelResponse) {
        const payments = await sql`SELECT COUNT(*) as total, SUM(amount_usd) as total_usd FROM payments WHERE verified = true`;
        const apiCalls = await sql`SELECT COUNT(*) as total, SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful FROM api_calls`;
        const recentPayments = await sql`SELECT tx_hash, chain, amount_usd, endpoint, created_at FROM payments WHERE verified = true ORDER BY created_at DESC LIMIT 20`;
        const endpointStats = await sql`SELECT endpoint, COUNT(*) as calls, AVG(response_time_ms) as avg_time FROM api_calls GROUP BY endpoint ORDER BY calls DESC`;

    return res.status(200).json({
                type: 'full',
                payments: {
                                total: parseInt(payments.rows[0]?.total || '0'),
                                totalUsd: parseFloat(payments.rows[0]?.total_usd || '0'),
                                recent: recentPayments.rows,
                },
                apiCalls: {
                                total: parseInt(apiCalls.rows[0]?.total || '0'),
                                successful: parseInt(apiCalls.rows[0]?.successful || '0'),
                },
                endpoints: endpointStats.rows,
                generatedAt: new Date().toISOString(),
    });
}

async function handleBasicStats(req: VercelRequest, res: VercelResponse) {
        const stats24h = await sql`
                SELECT
                            COUNT(*) as total_calls_24h,
                                        SUM(CASE WHEN tier = 'paid' THEN 1 ELSE 0 END) as paid_calls_24h,
                                                    SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END) as free_calls_24h,
                                                                AVG(response_time_ms) as avg_response_time_24h,
                                                                            SUM(CASE WHEN success THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0) as success_rate_24h
                                                                                    FROM api_calls
                                                                                            WHERE created_at > NOW() - INTERVAL '24 hours'
                                                                                                `;

    const totalPayments = await sql`SELECT COUNT(*) as total, SUM(amount_usd) as total_usd FROM payments WHERE verified = true`;

    return res.status(200).json({
                type: 'basic',
                last24h: {
                                totalCalls: parseInt(stats24h.rows[0]?.total_calls_24h || '0'),
                                paidCalls: parseInt(stats24h.rows[0]?.paid_calls_24h || '0'),
                                freeCalls: parseInt(stats24h.rows[0]?.free_calls_24h || '0'),
                                avgResponseTime: parseFloat(stats24h.rows[0]?.avg_response_time_24h || '0'),
                                successRate: parseFloat(stats24h.rows[0]?.success_rate_24h || '0'),
                },
                payments: {
                                total: parseInt(totalPayments.rows[0]?.total || '0'),
                                totalUsd: parseFloat(totalPayments.rows[0]?.total_usd || '0'),
                },
                generatedAt: new Date().toISOString(),
    });
}

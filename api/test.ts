/**
 * Simple test endpoint to verify Vercel deployment
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    message: 'Vercel serverless function is working!',
    timestamp: Date.now(),
    path: req.url,
    method: req.method
  });
}

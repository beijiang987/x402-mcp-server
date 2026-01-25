/**
 * Vercel Serverless Function Entry Point
 *
 * 这个文件是 Vercel serverless 函数的入口，
 * 它将所有请求转发给 Fastify HTTP 服务器
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/http-server.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 确保 Fastify 已准备好
    await app.ready();

    // 将 Vercel 请求转发给 Fastify
    // @ts-ignore - Fastify 和 Vercel 请求对象兼容
    app.server.emit('request', req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}

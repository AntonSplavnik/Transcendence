import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import authRoutes from './routes/auth.js';
import gameRoutes from './routes/game.js';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Register plugins
await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(websocket);

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'gateway' };
});

// Register routes
fastify.register(authRoutes, { prefix: '/api/auth' });
fastify.register(gameRoutes, { prefix: '/api/game' });

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('🚀 Gateway running on http://0.0.0.0:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

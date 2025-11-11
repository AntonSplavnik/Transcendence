import axios from 'axios';

const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://game:3002';

export default async function gameRoutes(fastify, options) {

  // Create a new game/tournament
  fastify.post('/tournament/create', async (request, reply) => {
    try {
      const response = await axios.post(`${GAME_SERVICE_URL}/tournament/create`, request.body);
      return response.data;
    } catch (error) {
      reply.code(error.response?.status || 500);
      return { error: error.response?.data?.error || 'Failed to create tournament' };
    }
  });

  // Join a tournament
  fastify.post('/tournament/join', async (request, reply) => {
    try {
      const response = await axios.post(`${GAME_SERVICE_URL}/tournament/join`, request.body);
      return response.data;
    } catch (error) {
      reply.code(error.response?.status || 500);
      return { error: error.response?.data?.error || 'Failed to join tournament' };
    }
  });

  // Get tournament info
  fastify.get('/tournament/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const response = await axios.get(`${GAME_SERVICE_URL}/tournament/${id}`);
      return response.data;
    } catch (error) {
      reply.code(error.response?.status || 500);
      return { error: error.response?.data?.error || 'Failed to get tournament' };
    }
  });

  // WebSocket for real-time game
  fastify.get('/play', { websocket: true }, (connection, req) => {
    console.log('Client connected to game');

    connection.on('message', (message) => {
      // Forward to game service (you'll implement this properly later)
      console.log('Received:', message.toString());

      // Echo back for now
      connection.send(JSON.stringify({
        type: 'pong',
        data: 'Message received'
      }));
    });

    connection.on('close', () => {
      console.log('Client disconnected');
    });
  });
}

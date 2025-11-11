import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth:3001';

export default async function authRoutes(fastify, options) {

  // Register new user
  fastify.post('/register', async (request, reply) => {
    try {
      const response = await axios.post(`${AUTH_SERVICE_URL}/register`, request.body);
      return response.data;
    } catch (error) {
      reply.code(error.response?.status || 500);
      return { error: error.response?.data?.error || 'Registration failed' };
    }
  });

  // Login
  fastify.post('/login', async (request, reply) => {
    try {
      const response = await axios.post(`${AUTH_SERVICE_URL}/login`, request.body);
      return response.data;
    } catch (error) {
      reply.code(error.response?.status || 500);
      return { error: error.response?.data?.error || 'Login failed' };
    }
  });

  // Verify token
  fastify.get('/verify', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        reply.code(401);
        return { error: 'No token provided' };
      }

      const response = await axios.get(`${AUTH_SERVICE_URL}/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      reply.code(error.response?.status || 500);
      return { error: error.response?.data?.error || 'Token verification failed' };
    }
  });

  // Get current user profile
  fastify.get('/me', async (request, reply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        reply.code(401);
        return { error: 'No token provided' };
      }

      const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      reply.code(error.response?.status || 500);
      return { error: error.response?.data?.error || 'Failed to get user data' };
    }
  });
}

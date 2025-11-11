import Fastify from 'fastify';
import cors from '@fastify/cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { initDatabase, getDatabase } from './database/init.js';

const fastify = Fastify({
  logger: {
    level: 'info'
  }
});

// Initialize database
initDatabase();

await fastify.register(cors, {
  origin: true,
  credentials: true
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'auth' };
});

// Register new user
fastify.post('/register', async (request, reply) => {
  const { username, email, password, displayName } = request.body;

  if (!username || !email || !password) {
    reply.code(400);
    return { error: 'Username, email, and password are required' };
  }

  // Validate password strength
  if (password.length < 8) {
    reply.code(400);
    return { error: 'Password must be at least 8 characters long' };
  }

  try {
    const db = getDatabase();

    // Check if user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      reply.code(409);
      return { error: 'Username or email already exists' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert user
    const result = db.prepare(
      'INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)'
    ).run(username, email, passwordHash, displayName || username);

    const userId = result.lastInsertRowid;

    // Generate JWT token
    const token = jwt.sign(
      { userId, username, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      success: true,
      token,
      user: {
        id: userId,
        username,
        email,
        displayName: displayName || username
      }
    };
  } catch (error) {
    console.error('Registration error:', error);
    reply.code(500);
    return { error: 'Registration failed' };
  }
});

// Login
fastify.post('/login', async (request, reply) => {
  const { username, password } = request.body;

  if (!username || !password) {
    reply.code(400);
    return { error: 'Username and password are required' };
  }

  try {
    const db = getDatabase();

    const user = db.prepare(
      'SELECT id, username, email, password_hash, display_name, avatar_url FROM users WHERE username = ? OR email = ?'
    ).get(username, username);

    if (!user) {
      reply.code(401);
      return { error: 'Invalid credentials' };
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      reply.code(401);
      return { error: 'Invalid credentials' };
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatarUrl: user.avatar_url
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    reply.code(500);
    return { error: 'Login failed' };
  }
});

// Verify token
fastify.get('/verify', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    reply.code(401);
    return { error: 'No token provided' };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, user: decoded };
  } catch (error) {
    reply.code(401);
    return { valid: false, error: 'Invalid token' };
  }
});

// Get current user
fastify.get('/me', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    reply.code(401);
    return { error: 'No token provided' };
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDatabase();

    const user = db.prepare(
      'SELECT id, username, email, display_name, avatar_url, created_at FROM users WHERE id = ?'
    ).get(decoded.userId);

    if (!user) {
      reply.code(404);
      return { error: 'User not found' };
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      createdAt: user.created_at
    };
  } catch (error) {
    console.error('Get user error:', error);
    reply.code(401);
    return { error: 'Invalid token' };
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('🔐 Auth service running on http://0.0.0.0:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

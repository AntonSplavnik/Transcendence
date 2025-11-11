import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initDatabase, getDatabase } from './database/init.js';
import { PongGame } from './engine/PongGame.js';

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

// In-memory storage for active games (will be moved to Redis later)
const activeGames = new Map();
const activeTournaments = new Map();

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'game' };
});

// Create tournament
fastify.post('/tournament/create', async (request, reply) => {
  const { name, maxPlayers } = request.body;

  if (!name) {
    reply.code(400);
    return { error: 'Tournament name is required' };
  }

  try {
    const db = getDatabase();
    const result = db.prepare(
      'INSERT INTO tournaments (name, max_players) VALUES (?, ?)'
    ).run(name, maxPlayers || 8);

    const tournamentId = result.lastInsertRowid;

    activeTournaments.set(tournamentId, {
      id: tournamentId,
      name,
      players: [],
      maxPlayers: maxPlayers || 8,
      status: 'waiting'
    });

    return {
      success: true,
      tournamentId,
      name,
      maxPlayers: maxPlayers || 8
    };
  } catch (error) {
    console.error('Create tournament error:', error);
    reply.code(500);
    return { error: 'Failed to create tournament' };
  }
});

// Join tournament
fastify.post('/tournament/join', async (request, reply) => {
  const { tournamentId, playerAlias, userId } = request.body;

  if (!tournamentId || !playerAlias) {
    reply.code(400);
    return { error: 'Tournament ID and player alias are required' };
  }

  try {
    const db = getDatabase();

    // Check if tournament exists and has space
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
    if (!tournament) {
      reply.code(404);
      return { error: 'Tournament not found' };
    }

    const playerCount = db.prepare(
      'SELECT COUNT(*) as count FROM tournament_players WHERE tournament_id = ?'
    ).get(tournamentId).count;

    if (playerCount >= tournament.max_players) {
      reply.code(400);
      return { error: 'Tournament is full' };
    }

    // Add player to tournament
    db.prepare(
      'INSERT INTO tournament_players (tournament_id, player_alias, user_id) VALUES (?, ?, ?)'
    ).run(tournamentId, playerAlias, userId || null);

    // Update active tournament
    const activeTournament = activeTournaments.get(tournamentId);
    if (activeTournament) {
      activeTournament.players.push({ alias: playerAlias, userId });
    }

    return {
      success: true,
      tournamentId,
      playerAlias,
      playerCount: playerCount + 1,
      maxPlayers: tournament.max_players
    };
  } catch (error) {
    console.error('Join tournament error:', error);
    reply.code(500);
    return { error: 'Failed to join tournament' };
  }
});

// Get tournament info
fastify.get('/tournament/:id', async (request, reply) => {
  const { id } = request.params;

  try {
    const db = getDatabase();

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(id);
    if (!tournament) {
      reply.code(404);
      return { error: 'Tournament not found' };
    }

    const players = db.prepare(
      'SELECT player_alias, user_id, joined_at FROM tournament_players WHERE tournament_id = ?'
    ).all(id);

    const matches = db.prepare(
      'SELECT * FROM matches WHERE tournament_id = ? ORDER BY round, id'
    ).all(id);

    return {
      id: tournament.id,
      name: tournament.name,
      status: tournament.status,
      maxPlayers: tournament.max_players,
      createdAt: tournament.created_at,
      players,
      matches
    };
  } catch (error) {
    console.error('Get tournament error:', error);
    reply.code(500);
    return { error: 'Failed to get tournament' };
  }
});

// Start a match (for testing)
fastify.post('/match/start', async (request, reply) => {
  const { player1, player2 } = request.body;

  if (!player1 || !player2) {
    reply.code(400);
    return { error: 'Both players are required' };
  }

  const gameId = `game_${Date.now()}`;
  const game = new PongGame(player1, player2);
  game.start();

  activeGames.set(gameId, game);

  return {
    success: true,
    gameId,
    message: 'Game started'
  };
});

// Get game state
fastify.get('/match/:gameId/state', async (request, reply) => {
  const { gameId } = request.params;

  const game = activeGames.get(gameId);
  if (!game) {
    reply.code(404);
    return { error: 'Game not found' };
  }

  return game.getState();
});

// Update game (simulate one frame)
fastify.post('/match/:gameId/update', async (request, reply) => {
  const { gameId } = request.params;

  const game = activeGames.get(gameId);
  if (!game) {
    reply.code(404);
    return { error: 'Game not found' };
  }

  game.update();
  return game.getState();
});

// Move paddle
fastify.post('/match/:gameId/move', async (request, reply) => {
  const { gameId } = request.params;
  const { player, direction } = request.body;

  const game = activeGames.get(gameId);
  if (!game) {
    reply.code(404);
    return { error: 'Game not found' };
  }

  game.movePaddle(player, direction);
  return { success: true };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3002, host: '0.0.0.0' });
    console.log('🎮 Game service running on http://0.0.0.0:3002');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

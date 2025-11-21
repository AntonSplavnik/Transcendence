import { FastifyPluginAsync } from 'fastify';

const matches: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  // POST /matches - Sauvegarder un résultat de match
  fastify.post('/matches', {
    schema: {
      description: 'Sauvegarder le résultat d\'un match',
      tags: ['Matches'],
      body: {
        type: 'object',
        required: ['player1Name', 'player2Name', 'player1Score', 'player2Score', 'winnerName'],
        properties: {
          player1Name: { type: 'string', minLength: 1 },
          player2Name: { type: 'string', minLength: 1 },
          player1Score: { type: 'integer', minimum: 0 },
          player2Score: { type: 'integer', minimum: 0 },
          winnerName: { type: 'string', minLength: 1 },
          durationSeconds: { type: 'integer', minimum: 0 }
        }
      },
      response: {
        201: {
          description: 'Match sauvegardé',
          type: 'object',
          properties: {
            id: { type: 'number' },
            message: { type: 'string' }
          }
        },
        400: {
          description: 'Données invalides',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        500: {
          description: 'Erreur serveur',
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { player1Name, player2Name, player1Score, player2Score, winnerName, durationSeconds } = request.body as {
      player1Name: string;
      player2Name: string;
      player1Score: number;
      player2Score: number;
      winnerName: string;
      durationSeconds?: number;
    };
    
    try {
      const match = fastify.db.saveMatch({
        player1_name: player1Name,
        player2_name: player2Name,
        player1_score: player1Score,
        player2_score: player2Score,
        winner_name: winnerName,
        duration_seconds: durationSeconds
      });
      
      reply.code(201).send({
        id: match.id,
        message: 'Match sauvegardé avec succès'
      });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({ error: 'Erreur lors de la sauvegarde du match' });
    }
  });

  // GET /matches - Récupérer les derniers matchs
  fastify.get('/matches', {
    schema: {
      description: 'Récupérer les derniers matchs',
      tags: ['Matches'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      },
      response: {
        200: {
          description: 'Liste des matchs',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              player1_name: { type: 'string' },
              player2_name: { type: 'string' },
              player1_score: { type: 'number' },
              player2_score: { type: 'number' },
              winner_name: { type: 'string' },
              duration_seconds: { type: 'number' },
              played_at: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { limit } = request.query as { limit?: number };
    const matches = fastify.db.getMatches(limit);
    reply.send(matches);
  });

  // GET /matches/player/:name - Matchs d'un joueur
  fastify.get('/matches/player/:name', {
    schema: {
      description: 'Récupérer les matchs d\'un joueur',
      tags: ['Matches'],
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' }
        }
      },
      response: {
        200: {
          description: 'Liste des matchs du joueur',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              player1_name: { type: 'string' },
              player2_name: { type: 'string' },
              player1_score: { type: 'number' },
              player2_score: { type: 'number' },
              winner_name: { type: 'string' },
              duration_seconds: { type: 'number' },
              played_at: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { name } = request.params as { name: string };
    const matches = fastify.db.getMatchesByPlayer(name);
    reply.send(matches);
  });
};

export default matches;

import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface Match {
  id?: number;
  player1_name: string;
  player2_name: string;
  player1_score: number;
  player2_score: number;
  winner_name: string;
  duration_seconds?: number;
  played_at?: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    db: {
      saveMatch: (match: Match) => Match;
      getMatches: (limit?: number) => Match[];
      getMatchesByPlayer: (playerName: string) => Match[];
    };
  }
}

const dbPlugin: FastifyPluginAsync = async (fastify, opts) => {
  const dbPath = process.env.DB_PATH || '/data/transcendence.db';
  
  fastify.log.info({ dbPath }, 'Initializing database');
  
  const db = new Database(dbPath);
  
  // Initialiser le schéma
  const schemaPath = join(__dirname, '../../db/schema.sql');
  try {
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    fastify.log.info('Database schema initialized');
  } catch (err) {
    fastify.log.warn({ err }, 'Could not read schema file, tables might already exist');
  }
  
  // Préparer les statements
  const insertMatch = db.prepare(`
    INSERT INTO matches (player1_name, player2_name, player1_score, player2_score, winner_name, duration_seconds)
    VALUES (@player1_name, @player2_name, @player1_score, @player2_score, @winner_name, @duration_seconds)
  `);
  
  const selectMatches = db.prepare(`
    SELECT * FROM matches ORDER BY played_at DESC LIMIT ?
  `);
  
  const selectMatchesByPlayer = db.prepare(`
    SELECT * FROM matches 
    WHERE player1_name = ? OR player2_name = ?
    ORDER BY played_at DESC
  `);
  
  // API publique
  fastify.decorate('db', {
    saveMatch: (match: Match): Match => {
      const info = insertMatch.run(match);
      return { ...match, id: info.lastInsertRowid as number };
    },
    
    getMatches: (limit: number = 50): Match[] => {
      return selectMatches.all(limit) as Match[];
    },
    
    getMatchesByPlayer: (playerName: string): Match[] => {
      return selectMatchesByPlayer.all(playerName, playerName) as Match[];
    }
  });
  
  // Fermer la DB proprement
  fastify.addHook('onClose', async (instance) => {
    db.close();
  });
};

export default fp(dbPlugin, {
  name: 'db'
});

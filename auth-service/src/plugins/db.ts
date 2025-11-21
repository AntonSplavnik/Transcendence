import fp from 'fastify-plugin';
import sqliteTyped from 'fastify-sqlite-typed';

export interface DbPluginOptions {
	dbFile?: string
}

export default fp<DbPluginOptions>(async (fastify, dbOpts) => {
	const dbFile = dbOpts.dbFile || ':memory:';

	// print what dbFile we are using
	fastify.log.info(`Using database file: ${dbFile}`);
	// Register the plugin
	await fastify.register(sqliteTyped, {
		dbFilename: dbFile!, // The file where data will be stored
	});

	// Simple "Migration": Create table if it doesn't exist
	const db = fastify.db; // The plugin adds this decorator

	await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL
    );
  `);

	fastify.log.info('Database initialized and tables checked.');
});

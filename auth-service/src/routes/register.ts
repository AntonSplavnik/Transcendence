import argon2 from '@node-rs/argon2';
import { FastifyPluginAsync } from 'fastify';

interface RegisterBody {
	username: string;
	password: string;
}

const register: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post<{ Body: RegisterBody }>('/register', async function (request, reply) {
		const { username, password } = request.body;
		const password_hash = await argon2.hash(password);

		try {
			const result = await fastify.db.run(
				'INSERT INTO users (username, password_hash) VALUES (?, ?)',
				[username, password_hash]
			);

			reply.status(201);
			return { success: true, userId: result.lastID };
		} catch (err: any) {
			if (err.code === 'SQLITE_CONSTRAINT') {
				reply.status(409);
				return { success: false, message: 'Username already exists' };
			}

			request.log.error(err);
			reply.status(500);
			return { success: false, message: 'User registration failed' };
		}
	})
}

export default register

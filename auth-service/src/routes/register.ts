import argon2 from '@node-rs/argon2';
import { FastifyPluginAsync } from 'fastify';

interface RegisterBody {
	username: string;
	password: string;
}

interface RegisterReply {
	201: { success: boolean, userId: number };
	'4xx': { error: string };
	500: {};
}

const register: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.post<{ Body: RegisterBody, Reply: RegisterReply }>('/register', async (request, reply) => {
		const { username, password } = request.body;
		const password_hash = await argon2.hash(password);

		if (password.length < 8 || username.length < 3) {
			reply.code(400).send({ error: 'Invalid username or password: too short' });
			return;
		}

		try {
			const result = await fastify.db.run(
				'INSERT INTO users (username, password_hash) VALUES (?, ?)',
				[username, password_hash]
			);

			reply.code(201).send({ success: true, userId: result.lastID! });
		} catch (err: any) {
			if (err.code === 'SQLITE_CONSTRAINT') {
				reply.code(409).send({ error: 'Username already exists' });
				return;
			}

			request.log.error(err);
			reply.code(500);
		}
	})
}

export default register

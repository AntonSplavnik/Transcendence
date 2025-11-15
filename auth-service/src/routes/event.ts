import { FastifyPluginAsync } from 'fastify';

interface IEventQuery {
	msg: string
}

const event: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get<{ Querystring: IEventQuery }>('/event', async function (request, reply) {
		let pub = fastify.rabbitmq.createPublisher({
			confirm: true,
			maxAttempts: 1,
		});
		await pub.send("auth-test-event", request.query.msg);

		return { success: true }
	})
}

export default event

import fp from 'fastify-plugin';
import fastifyRabbit from 'fastify-rabbitmq';

export interface MqOpts {
	mockRabbitMq?: boolean
}

const mockImpl = fp(async (fastify, opts) => {
	fastify.decorate('rabbitmq', {
		createConsumer: (opts: any, cb: any) => { },
		createPublisher: (opts: any) => ({
			send: async (queue: string, msg: any) => { }
		})
	} as any)
})

export default fp<MqOpts>(async (fastify, opts) => {
	const mockRabbitMq = opts.mockRabbitMq || false;
	let rabbitConnection = process.env.RABBITMQ_URL!;

	if (mockRabbitMq) {
		rabbitConnection = '';
		fastify.log.info('Using mock RabbitMQ implementation for testing.');
	}
	const rabbitPlugin = mockRabbitMq ? mockImpl : fastifyRabbit;

	fastify.register(rabbitPlugin, {
		connection: rabbitConnection
	});

	fastify.ready().then(async () => {
		fastify.rabbitmq.createConsumer(
			{
				queue: 'auth-test-event',
				queueOptions: { durable: true },
			},
			async (msg, _reply) => {
				const body = msg?.body;
				const payload =
					typeof body === 'string'
						? body
						: Buffer.isBuffer(body)
							? body.toString('utf8')
							: JSON.stringify(body);

				fastify.log.info({ payload }, 'received event from rabbit');
			},
		);
	});
});

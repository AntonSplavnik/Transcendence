import { FastifyPluginAsync } from 'fastify'

const internal: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
	fastify.get('/test', async function (request, reply) {
		return 'this is an internal endpoint only reachable from other microservices'
	})
}

export default internal

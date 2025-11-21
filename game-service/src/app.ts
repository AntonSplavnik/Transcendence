import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify'
import cors from '@fastify/cors'
import fastifyRabbit from 'fastify-rabbitmq'
import { join } from 'node:path'

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions> {

}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  // Enable CORS for all origins (en dev)
  await fastify.register(cors, {
    origin: true
  });

  const rabbitConnection = process.env.RABBITMQ_URL!;
  fastify.register(fastifyRabbit, {
    connection: rabbitConnection
  });
  // Place here your custom code!

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
  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  // eslint-disable-next-line no-void
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts
  })
}

export default app
export { app, options }

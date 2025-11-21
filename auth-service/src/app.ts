import AutoLoad, { AutoloadPluginOptions } from '@fastify/autoload'
import { FastifyPluginAsync, FastifyServerOptions } from 'fastify'
import { join } from 'node:path'
import { MqOpts } from './plugins/rabbitmq'

export interface AppOptions extends FastifyServerOptions, Partial<AutoloadPluginOptions>, MqOpts {
}
// Pass --options via CLI arguments in command to enable these options.
const options: AppOptions = {
  mockRabbitMq: true,
}

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts
): Promise<void> => {
  // print options
  fastify.log.info(`App options: ${JSON.stringify(opts)}`);

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

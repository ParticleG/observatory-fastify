import { ErrorObject } from 'ajv/lib/types';
import Fastify from 'fastify';
import { uIOhook } from 'uiohook-napi';

import { Logger, LogLevel } from 'types/Logger';
import * as console from 'console';

const fastify = Fastify({
  logger: {
    level: 'warn'
  }
});

async function main() {
  Logger.info('Config', `Loading server configs...`);

  uIOhook.on('input', (event) => {
    console.log(event);
  });
  uIOhook.start();

  await fastify.register(import('fastify-graceful-shutdown'));
  fastify.gracefulShutdown((signal, next) => {
    console.log(signal);
    uIOhook.stop();
    next();
  });
  await fastify.register(import('@fastify/cors'));
  await fastify.register(import('@fastify/websocket'));
  await fastify.register(import('app/config'));

  fastify.register(import('app/src/app'), fastify.config);
  fastify.listen(
    {
      host: fastify.config.server.host,
      port: fastify.config.server.port
    },
    (err: any) => {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }
    }
  );

  // noinspection HttpUrlsUsage
  Logger.info(
    'Config',
    `Server is listening on ` +
    LogLevel.info(
      `http://${fastify.config.server.host}:${fastify.config.server.port}`
    )
  );
}

main().catch((errors) => {
  if (errors instanceof Array<ErrorObject>) {
    errors.forEach((error: ErrorObject) => {
      Logger.error('Config', 'Invalid config item', LogLevel.warning(`${error.message}`) +
        (error.instancePath ? ' at ' + LogLevel.link(error.instancePath) : ''));
    });
  } else {
    console.log(errors.join('\n'));
  }
  fastify.close().then(
    () => Logger.success('Server', 'Successfully closed'),
    (err) => Logger.error('Server', 'Cannot close', err.message)
  );
});
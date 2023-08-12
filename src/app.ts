import AutoLoad from '@fastify/autoload';
import { FastifyPluginAsync } from 'fastify';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const app: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  const __dirname = dirname(fileURLToPath(import.meta['url']));

  fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts,
  });

  fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: opts,
  });
};

export default app;

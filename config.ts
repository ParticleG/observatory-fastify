import Ajv from 'ajv';
import fastifyPlugin from 'fastify-plugin';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { parse } from 'toml';
import * as process from 'process';

const ajv = new Ajv();

interface ConfigType {
  server: {
    close_delay: number;
    host: string;
    port: number;
  };
}

const validate = ajv.compile({
  type: 'object',
  required: ['server'],
  properties: {
    server: {
      type: 'object',
      properties: {
        close_delay: {
          type: 'number',
          default: 500,
          minimum: 0,
        },
        host: {
          type: 'string',
          default: 'localhost',
        },
        port: {
          type: 'number',
          default: 3000,
          minimum: 0,
          maximum: 65535,
        },
      },
    },
  },
});

export default fastifyPlugin(async (fastify) => {
  const config = parse(
    readFileSync(resolve(join(process.cwd(), 'config.toml'))).toString(),
  );

  if (validate(config)) {
    fastify.config = config as ConfigType;
  } else {
    throw validate.errors;
  }
});

declare module 'fastify' {
  // noinspection JSUnusedGlobalSymbols
  interface FastifyInstance {
    config: ConfigType;
  }
}

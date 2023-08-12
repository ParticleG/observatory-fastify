import { FastifyPluginAsync } from 'fastify';
import { Logger, LogLevel } from 'types/Logger';
import { WsConnection } from 'types/WsConnection';
import { deviceListener } from 'types/DeviceListener';

export default <FastifyPluginAsync>(async (fastify): Promise<void> => {
  fastify.get('/', { websocket: true }, async (connection, request) => {
    Logger.info('Device', `New connection from ${LogLevel.info(request.ip)}`);
    deviceListener.register(new WsConnection(connection.socket));
  });
});

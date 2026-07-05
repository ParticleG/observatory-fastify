import { v4 as uuid } from 'uuid';
import type { RawData, WebSocket } from 'ws';

import type { WsAction } from 'types/actions';
import type { WsId } from 'types/common';
import type { WsResponse } from 'types/wsMessages';
import { parseWsMessage } from 'utils/validator';
import { deviceListener } from 'types/DeviceListenerSingleton';

type MessageHandler = (wsMessage: any) => Promise<void>;

export class WsConnection {
  readonly wsId: WsId = uuid();
  private socket: WebSocket;
  private readonly handlerMap = new Map<WsAction, MessageHandler>();

  constructor(ws: WebSocket) {
    this.socket = ws;

    this.socket.on('message', async (message) => {
      await this.handleMessage(message);
    });

    this.socket.on('close', () => {
      deviceListener.unregister(this.wsId);
    });
  }

  respond(wsResponse: WsResponse) {
    if (wsResponse.result === 'error') {
      this.socket.close(1011, wsResponse.toString());
    } else {
      this.socket.send(wsResponse.toString());
    }
  }

  private async handleMessage(message: RawData) {
    try {
      const wsMessage = parseWsMessage(message.toString());
      await this.handlerMap.get(wsMessage.action)!.call(this, wsMessage);
    } catch (error: any) {
      this.respond(error as WsResponse);
    }
  }
}

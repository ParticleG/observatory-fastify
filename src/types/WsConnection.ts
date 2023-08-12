import { v4 as uuid } from 'uuid';
import { RawData, WebSocket } from 'ws';

import { WsAction } from 'types/actions';
import { WsId } from 'types/common';
import { WsResponse } from 'types/wsMessages';
import { parseWsMessage } from 'utils/validator';
import { deviceListener } from 'types/DeviceListener';

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

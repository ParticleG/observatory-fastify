import { uIOhook } from 'uiohook-napi';

import { WsId } from 'types/common';
import { WsConnection } from 'types/WsConnection';
import { WsDeviceResponse, WsResponse } from 'types/wsMessages';
import { DeviceEventType } from 'types/devices';

class DeviceListener {
  private _wsMap = new Map<WsId, WsConnection>();

  constructor() {
    uIOhook.on('keydown', (event) =>
      this._broadcast(
        new WsDeviceResponse({
          ...event,
          event: DeviceEventType.KeyboardDown,
        }),
      ),
    );
    uIOhook.on('keyup', (event) =>
      this._broadcast(
        new WsDeviceResponse({
          ...event,
          event: DeviceEventType.KeyboardUp,
        }),
      ),
    );
    uIOhook.on('mousedown', (event) =>
      this._broadcast(
        new WsDeviceResponse({
          ...event,
          event: DeviceEventType.MouseDown,
        }),
      ),
    );
    uIOhook.on('mousemove', (event) =>
      this._broadcast(
        new WsDeviceResponse({
          ...event,
          event: DeviceEventType.MouseMove,
        }),
      ),
    );
    uIOhook.on('mouseup', (event) =>
      this._broadcast(
        new WsDeviceResponse({
          ...event,
          event: DeviceEventType.MouseUp,
        }),
      ),
    );
    uIOhook.on('wheel', (event) =>
      this._broadcast(
        new WsDeviceResponse({
          ...event,
          event: DeviceEventType.MouseWheel,
        }),
      ),
    );
  }

  register(wsConnection: WsConnection) {
    this._wsMap.set(wsConnection.wsId, wsConnection);
  }

  unregister(wsId: WsId) {
    this._wsMap.delete(wsId);
  }

  start() {
    uIOhook.start();
  }

  stop() {
    uIOhook.stop();
  }

  private _broadcast(wsResponse: WsResponse) {
    this._wsMap.forEach((ws) => ws.respond(wsResponse));
  }
}

export const deviceListener = new DeviceListener();

import type {
  UiohookKeyboardEvent,
  UiohookMouseEvent,
  UiohookWheelEvent,
} from 'uiohook-napi';

import { WsAction } from 'types/actions';
import type { WsId } from 'types/common';
import { Logger, LogLevel } from 'types/Logger';
import type { WsConnection } from 'types/WsConnection';
import {
  WsDeviceResponse,
  WsFailureResponse,
} from 'types/wsMessages';
import type { WsResponse } from 'types/wsMessages';
import { DeviceEventType } from 'types/devices';
import type { DeviceEvent } from 'types/devices';

type DeviceListenerState =
  | 'idle'
  | 'running'
  | 'unsupported'
  | 'error'
  | 'stopped';

export interface DeviceListenerStatus {
  state: DeviceListenerState;
  message: string;
  reasons: string[];
}

export interface UiohookLike {
  on(event: 'keydown', listener: (event: UiohookKeyboardEvent) => void): this;
  on(event: 'keyup', listener: (event: UiohookKeyboardEvent) => void): this;
  on(event: 'mousedown', listener: (event: UiohookMouseEvent) => void): this;
  on(event: 'mousemove', listener: (event: UiohookMouseEvent) => void): this;
  on(event: 'mouseup', listener: (event: UiohookMouseEvent) => void): this;
  on(event: 'wheel', listener: (event: UiohookWheelEvent) => void): this;
  start(): void;
  stop(): void;
}

export interface DeviceListenerOptions {
  hook?: UiohookLike;
  hookFactory?: () => UiohookLike;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
}

export class DeviceListener {
  private _wsMap = new Map<WsId, WsConnection>();
  private _hook: UiohookLike | undefined;
  private readonly _hookFactory: (() => UiohookLike) | undefined;
  private readonly _platform: NodeJS.Platform;
  private readonly _env: NodeJS.ProcessEnv;
  private _isHookConfigured = false;
  private _status: DeviceListenerStatus = {
    state: 'idle',
    message: 'Device listener has not started.',
    reasons: [],
  };

  constructor(options: DeviceListenerOptions = {}) {
    this._hook = options.hook;
    this._hookFactory = options.hookFactory;
    this._platform = options.platform ?? process.platform;
    this._env = options.env ?? process.env;
  }

  getStatus(): DeviceListenerStatus {
    return {
      state: this._status.state,
      message: this._status.message,
      reasons: [...this._status.reasons],
    };
  }

  register(wsConnection: WsConnection) {
    this._wsMap.set(wsConnection.wsId, wsConnection);

    const response = this._createUnavailableResponse();
    if (response) {
      wsConnection.respond(response);
    }
  }

  unregister(wsId: WsId) {
    this._wsMap.delete(wsId);
  }

  start() {
    if (this._status.state === 'running') {
      return;
    }

    const unsupportedStatus = this._getLinuxUnsupportedStatus();
    if (unsupportedStatus) {
      this._status = unsupportedStatus;
      this._logUnavailableStatus();
      this._broadcastUnavailableStatus();
      return;
    }

    try {
      this._getConfiguredHook().start();
      this._status = {
        state: 'running',
        message: 'Device listener is running.',
        reasons: [],
      };
      Logger.success('Device', 'Input hook started');
    } catch (error) {
      this._status = this._createStartErrorStatus(error);
      this._logUnavailableStatus();
      this._broadcastUnavailableStatus();
    }
  }

  stop() {
    if (this._status.state !== 'running' || !this._hook) {
      return;
    }

    try {
      this._hook.stop();
      this._status = {
        state: 'stopped',
        message: 'Device listener stopped.',
        reasons: [],
      };
    } catch (error) {
      this._status = {
        state: 'error',
        message: 'Failed to stop uiohook-napi input hook.',
        reasons: [this._formatError(error)],
      };
      this._logUnavailableStatus();
    }
  }

  private _getConfiguredHook(): UiohookLike {
    if (!this._hook) {
      if (!this._hookFactory) {
        throw new Error('DeviceListener requires a hook or hookFactory.');
      }

      this._hook = this._hookFactory();
    }

    if (this._isHookConfigured) {
      return this._hook;
    }

    this._hook.on('keydown', (event) =>
      this._broadcastDeviceEvent(event, DeviceEventType.KeyboardDown),
    );
    this._hook.on('keyup', (event) =>
      this._broadcastDeviceEvent(event, DeviceEventType.KeyboardUp),
    );
    this._hook.on('mousedown', (event) =>
      this._broadcastDeviceEvent(event, DeviceEventType.MouseDown),
    );
    this._hook.on('mousemove', (event) =>
      this._broadcastDeviceEvent(event, DeviceEventType.MouseMove),
    );
    this._hook.on('mouseup', (event) =>
      this._broadcastDeviceEvent(event, DeviceEventType.MouseUp),
    );
    this._hook.on('wheel', (event) =>
      this._broadcastDeviceEvent(event, DeviceEventType.MouseWheel),
    );
    this._isHookConfigured = true;

    return this._hook;
  }

  private _broadcastDeviceEvent(
    event: UiohookKeyboardEvent | UiohookMouseEvent | UiohookWheelEvent,
    eventType: DeviceEventType,
  ) {
    this._broadcast(
      new WsDeviceResponse({
        ...event,
        event: eventType,
      } as DeviceEvent),
    );
  }

  private _getLinuxUnsupportedStatus(): DeviceListenerStatus | null {
    if (this._platform !== 'linux') {
      return null;
    }

    const sessionType = (this._env.XDG_SESSION_TYPE ?? '').toLowerCase();
    const isWayland =
      sessionType === 'wayland' ||
      (Boolean(this._env.WAYLAND_DISPLAY) && sessionType !== 'x11');

    if (isWayland) {
      return {
        state: 'unsupported',
        message:
          'Global mouse position is unsupported under Wayland by uiohook-napi.',
        reasons: [
          'uiohook-napi uses the X11/XRecord backend on Linux and only reports rootX/rootY from X11 events.',
          ...this._linuxEnvironmentReasons(),
          'Run the service in an X11 session for the current absolute x/y mouse contract, or add a compositor/portal-specific Wayland implementation.',
        ],
      };
    }

    if (!this._env.DISPLAY) {
      return {
        state: 'unsupported',
        message: 'uiohook-napi requires an X11 DISPLAY on Linux.',
        reasons: [
          'The Linux backend opens an X11 display before installing the XRecord hook.',
          ...this._linuxEnvironmentReasons(),
          'Start the service from a graphical X11 session or set DISPLAY to an accessible X server.',
        ],
      };
    }

    return null;
  }

  private _createStartErrorStatus(error: unknown): DeviceListenerStatus {
    const reasons = [
      this._formatError(error),
      ...this._linuxEnvironmentReasons(),
    ];

    if (this._platform === 'linux') {
      reasons.push(
        'Check that the X11 display is reachable and that the XRecord extension is available.',
      );
    }

    return {
      state: 'error',
      message: 'Failed to load or start uiohook-napi input hook.',
      reasons,
    };
  }

  private _linuxEnvironmentReasons(): string[] {
    if (this._platform !== 'linux') {
      return [];
    }

    return [
      `XDG_SESSION_TYPE=${this._env.XDG_SESSION_TYPE ?? '<unset>'}`,
      `DISPLAY=${this._env.DISPLAY ?? '<unset>'}`,
      `WAYLAND_DISPLAY=${this._env.WAYLAND_DISPLAY ?? '<unset>'}`,
    ];
  }

  private _broadcastUnavailableStatus() {
    const response = this._createUnavailableResponse();

    if (response) {
      this._broadcast(response);
    }
  }

  private _createUnavailableResponse(): WsFailureResponse | null {
    if (this._status.state === 'idle' || this._status.state === 'running') {
      return null;
    }

    return new WsFailureResponse(
      WsAction.Device,
      this._status.message,
      this._status.reasons,
    );
  }

  private _logUnavailableStatus() {
    Logger.warn(
      'Device',
      this._status.message,
      this._status.reasons.map((reason) => LogLevel.warning(reason)).join('\n'),
    );
  }

  private _formatError(error: unknown): string {
    if (error instanceof Error) {
      const code =
        'code' in error && typeof error.code === 'string'
          ? `${error.code}: `
          : '';

      return `${code}${error.message}`;
    }

    return String(error);
  }

  private _broadcast(wsResponse: WsResponse) {
    this._wsMap.forEach((ws) => ws.respond(wsResponse));
  }
}


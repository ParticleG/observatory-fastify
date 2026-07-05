import { test } from 'tap'
import type {
  UiohookKeyboardEvent,
  UiohookMouseEvent,
  UiohookWheelEvent,
} from 'uiohook-napi'

import { DeviceListener } from '../../src/types/DeviceListener.js'
import type { UiohookLike } from '../../src/types/DeviceListener.js'
import type { WsConnection } from '../../src/types/WsConnection.js'
import type { WsResponse } from '../../src/types/wsMessages.js'
import { Logger } from '../../src/types/Logger.js'
import type { Test } from '../helper.js'

class FakeUiohook implements UiohookLike {
  readonly keydownListeners: Array<(event: UiohookKeyboardEvent) => void> = []
  readonly keyupListeners: Array<(event: UiohookKeyboardEvent) => void> = []
  readonly mousedownListeners: Array<(event: UiohookMouseEvent) => void> = []
  readonly mousemoveListeners: Array<(event: UiohookMouseEvent) => void> = []
  readonly mouseupListeners: Array<(event: UiohookMouseEvent) => void> = []
  readonly wheelListeners: Array<(event: UiohookWheelEvent) => void> = []
  startCalls = 0
  stopCalls = 0

  on(event: 'keydown', listener: (event: UiohookKeyboardEvent) => void): this
  on(event: 'keyup', listener: (event: UiohookKeyboardEvent) => void): this
  on(event: 'mousedown', listener: (event: UiohookMouseEvent) => void): this
  on(event: 'mousemove', listener: (event: UiohookMouseEvent) => void): this
  on(event: 'mouseup', listener: (event: UiohookMouseEvent) => void): this
  on(event: 'wheel', listener: (event: UiohookWheelEvent) => void): this
  on(
    event: 'keydown' | 'keyup' | 'mousedown' | 'mousemove' | 'mouseup' | 'wheel',
    listener:
      | ((event: UiohookKeyboardEvent) => void)
      | ((event: UiohookMouseEvent) => void)
      | ((event: UiohookWheelEvent) => void),
  ): this {
    switch (event) {
      case 'keydown':
        this.keydownListeners.push(listener as (event: UiohookKeyboardEvent) => void)
        break
      case 'keyup':
        this.keyupListeners.push(listener as (event: UiohookKeyboardEvent) => void)
        break
      case 'mousedown':
        this.mousedownListeners.push(listener as (event: UiohookMouseEvent) => void)
        break
      case 'mousemove':
        this.mousemoveListeners.push(listener as (event: UiohookMouseEvent) => void)
        break
      case 'mouseup':
        this.mouseupListeners.push(listener as (event: UiohookMouseEvent) => void)
        break
      case 'wheel':
        this.wheelListeners.push(listener as (event: UiohookWheelEvent) => void)
        break
    }

    return this
  }

  start() {
    this.startCalls += 1
  }

  stop() {
    this.stopCalls += 1
  }

  emitMouseMove(event: UiohookMouseEvent) {
    this.mousemoveListeners.forEach((listener) => listener(event))
  }
}

class FakeWsConnection {
  readonly wsId: string
  readonly responses: string[] = []

  constructor(wsId: string) {
    this.wsId = wsId
  }

  respond(response: WsResponse) {
    this.responses.push(response.toString())
  }
}

function register(listener: DeviceListener, connection: FakeWsConnection) {
  // DeviceListener only uses wsId and respond; the production WsConnection has private fields.
  listener.register(connection as unknown as WsConnection)
}

function muteLogger(t: Test) {
  const warn = Logger.warn
  const success = Logger.success

  Logger.warn = () => undefined
  Logger.success = () => undefined

  t.teardown(() => {
    Logger.warn = warn
    Logger.success = success
  })
}


function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function requireRecord(value: unknown, description: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`${description} must be an object`)
  }

  return value
}

function requireString(value: unknown, description: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${description} must be a string`)
  }

  return value
}

function requireNumber(value: unknown, description: string): number {
  if (typeof value !== 'number') {
    throw new Error(`${description} must be a number`)
  }

  return value
}

function requireStringArray(value: unknown, description: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${description} must be a string array`)
  }

  return value
}

test('Linux Wayland reports uiohook unsupported without loading or starting the hook', (t) => {
  muteLogger(t)
  const hook = new FakeUiohook()
  let hookFactoryCalls = 0
  const listener = new DeviceListener({
    hookFactory: () => {
      hookFactoryCalls += 1
      return hook
    },
    platform: 'linux',
    env: {
      XDG_SESSION_TYPE: 'wayland',
      DISPLAY: ':0',
      WAYLAND_DISPLAY: 'wayland-1',
    },
  })

  listener.start()

  const status = listener.getStatus()
  t.equal(status.state, 'unsupported')
  t.equal(hookFactoryCalls, 0)
  t.equal(hook.startCalls, 0)

  const connection = new FakeWsConnection('wayland-client')
  register(listener, connection)

  t.equal(connection.responses.length, 1)
  const response = requireRecord(JSON.parse(connection.responses[0]!) as unknown, 'Wayland response')
  const data = requireRecord(response.data, 'Wayland response data')
  const reasons = requireStringArray(data.reasons, 'Wayland response reasons')

  t.same(
    {
      result: response.result,
      action: response.action,
      message: data.message,
    },
    {
      result: 'failure',
      action: 'Device',
      message: 'Global mouse position is unsupported under Wayland by uiohook-napi.',
    },
  )
  t.match(reasons.join('\n'), /uiohook-napi uses the X11\/XRecord backend/)
  t.match(reasons.join('\n'), /XDG_SESSION_TYPE=wayland/)
  t.match(reasons.join('\n'), /DISPLAY=:0/)
  t.match(reasons.join('\n'), /WAYLAND_DISPLAY=wayland-1/)
  t.end()
})

test('Linux without DISPLAY reports unsupported without starting the hook', (t) => {
  muteLogger(t)
  const hook = new FakeUiohook()
  let hookFactoryCalls = 0
  const listener = new DeviceListener({
    hookFactory: () => {
      hookFactoryCalls += 1
      return hook
    },
    platform: 'linux',
    env: {
      XDG_SESSION_TYPE: 'tty',
    },
  })

  listener.start()

  const status = listener.getStatus()
  t.equal(status.state, 'unsupported')
  t.equal(status.message, 'uiohook-napi requires an X11 DISPLAY on Linux.')
  t.same(status.reasons, [
    'The Linux backend opens an X11 display before installing the XRecord hook.',
    'XDG_SESSION_TYPE=tty',
    'DISPLAY=<unset>',
    'WAYLAND_DISPLAY=<unset>',
    'Start the service from a graphical X11 session or set DISPLAY to an accessible X server.',
  ])
  t.equal(hookFactoryCalls, 0)
  t.equal(hook.startCalls, 0)
  t.end()
})

test('Linux X11 starts the hook and forwards absolute mousemove coordinates', (t) => {
  muteLogger(t)
  const hook = new FakeUiohook()
  const listener = new DeviceListener({
    hook,
    platform: 'linux',
    env: {
      XDG_SESSION_TYPE: 'x11',
      DISPLAY: ':0',
    },
  })
  const connection = new FakeWsConnection('x11-client')
  register(listener, connection)

  listener.start()
  hook.emitMouseMove({
    type: 9 as UiohookMouseEvent['type'],
    time: 123,
    altKey: false,
    ctrlKey: true,
    metaKey: false,
    shiftKey: true,
    x: 321,
    y: 654,
    button: 0,
    clicks: 0,
  })

  t.equal(listener.getStatus().state, 'running')
  t.equal(hook.startCalls, 1)
  t.equal(connection.responses.length, 1)

  const response = requireRecord(JSON.parse(connection.responses[0]!) as unknown, 'X11 response')
  const data = requireRecord(response.data, 'X11 response data')

  t.same(
    {
      result: response.result,
      action: response.action,
      event: data.event,
      x: requireNumber(data.x, 'X11 response x'),
      y: requireNumber(data.y, 'X11 response y'),
      ctrlKey: data.ctrlKey,
      shiftKey: data.shiftKey,
    },
    {
      result: 'success',
      action: 'Device',
      event: 'MouseMove',
      x: 321,
      y: 654,
      ctrlKey: true,
      shiftKey: true,
    },
  )
  t.equal(requireString(data.event, 'X11 response event'), 'MouseMove')
  t.end()
})

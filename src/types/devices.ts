export enum DeviceEventType {
  KeyboardDown = 'KeyboardDown',
  KeyboardUp = 'KeyboardUp',
  MouseDown = 'MouseDown',
  MouseMove = 'MouseMove',
  MouseUp = 'MouseUp',
  MouseWheel = 'MouseWheel',
}

export enum WheelDirection {
  VERTICAL = 3,
  HORIZONTAL = 4,
}

interface DeviceEventBase {
  event: DeviceEventType;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export interface KeyboardEvent extends DeviceEventBase {
  event: DeviceEventType.KeyboardDown | DeviceEventType.KeyboardUp;
  keycode: number;
}

export interface MouseEvent extends DeviceEventBase {
  event:
    | DeviceEventType.MouseDown
    | DeviceEventType.MouseMove
    | DeviceEventType.MouseUp;
  x: number;
  y: number;
  button: unknown;
  clicks: number;
}

export interface WheelEvent extends DeviceEventBase {
  x: number;
  y: number;
  clicks: number;
  amount: number;
  direction: WheelDirection;
  rotation: number;
}

export type DeviceEvent = KeyboardEvent | MouseEvent | WheelEvent;

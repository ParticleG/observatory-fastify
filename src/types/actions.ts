export enum WsAction {
  Device = 'Device',
  Invalid = 'Invalid',
}

export interface ActionBase {
  action: WsAction;
  data?: unknown;
}

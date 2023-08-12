import { WsAction } from 'types/actions';
import { DeviceEvent } from 'types/devices';

type WsResult = 'success' | 'failure' | 'error';

export interface WsRequest {
  action: WsAction;
  data?: any;
}

export interface DeviceRequest extends WsRequest {
  action: WsAction.Device;
  account: undefined;
  data: undefined;
}

export class WsResponse implements WsRequest {
  result: WsResult;
  action: WsAction;
  data: any;

  constructor(result: WsResult, action?: WsAction, data?: any) {
    if (action === undefined || !Object.values(WsAction).includes(action)) {
      this.action = WsAction.Invalid;
      this.result = 'error';
    } else {
      this.action = action;
      this.result = result;
    }
    this.data = data;
  }

  toString() {
    return JSON.stringify({
      result: this.result,
      action: this.action,
      data: this.data,
    });
  }
}

export class WsErrorResponse extends WsResponse {
  data: {
    message: string;
    reasons?: string[];
  };

  constructor(action: WsAction, message?: string, reasons?: string[]) {
    super('error', action);
    this.data = {
      message: message || 'Unknown error',
      reasons: reasons,
    };
  }

  static fromRequest(request: WsRequest, message?: string, reasons?: string[]) {
    return new this(request.action, message, reasons);
  }
}

export class WsFailureResponse extends WsResponse {
  data: {
    message: string;
    reasons?: string[];
  };

  constructor(action: WsAction, message?: string, reasons?: string[]) {
    super('failure', action);
    this.data = {
      message: message || 'Unknown error',
      reasons: reasons ?? [],
    };
  }

  static fromRequest(request: WsRequest, message?: string, reasons?: string[]) {
    return new this(request.action, message, reasons);
  }
}

export class WsSuccessResponse extends WsResponse {
  constructor(action: WsAction, data?: any) {
    super('success', action, data);
  }

  static fromRequest(request: WsRequest, data?: any) {
    return new this(request.action, data);
  }
}

export class WsDeviceResponse extends WsSuccessResponse {
  constructor(data: DeviceEvent) {
    super(WsAction.Device, data);
  }
}

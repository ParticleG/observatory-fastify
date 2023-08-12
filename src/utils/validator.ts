import Ajv, { JTDSchemaType, ValidateFunction } from 'ajv/dist/jtd';

import { WsAction } from 'types/actions';
import { Logger } from 'types/Logger';
import { DeviceRequest, WsFailureResponse, WsRequest } from 'types/wsMessages';

Logger.info('Utility', 'Initializing message validators...');

const ajv = new Ajv();

const sharedProperties = (
  additionalProperties?: any,
  optionalProperties?: any,
) => {
  const result: { [key: string]: any } = {
    properties: {
      ...additionalProperties,
      action: {
        enum: Object.values(WsAction),
      },
    },
    additionalProperties: false,
  };
  if (optionalProperties) {
    result.optionalProperties = optionalProperties;
  }
  return result;
};

const WsMessageParser = ajv.compileParser(
  sharedProperties(null, {
    data: { nullable: true },
  }) as JTDSchemaType<WsRequest>,
);

const wsMessageValidators = new Map<WsAction, ValidateFunction>();

wsMessageValidators.set(
  WsAction.Invalid,
  ajv.compile({
    properties: {
      action: {
        enum: Object.values(WsAction),
      },
    },
    additionalProperties: true,
  } as JTDSchemaType<any>),
);

wsMessageValidators.set(
  WsAction.Device,
  ajv.compile(sharedProperties() as JTDSchemaType<DeviceRequest>),
);

Object.values(WsAction).forEach((action) => {
  if (!wsMessageValidators.has(action)) {
    throw new Error(`Missing data validator for action: ${action}`);
  }
});

Logger.info('Utility', 'Message validators loaded');

export function parseWsMessage(raw: string): WsRequest {
  const message: WsRequest | undefined = WsMessageParser(raw);
  if (message === undefined) {
    throw new WsFailureResponse(WsAction.Invalid, WsMessageParser.message, [
      `Error at: ${WsMessageParser.position}`,
    ]);
  }
  const validator = wsMessageValidators.get(message.action)!;
  if (!validator(message)) {
    throw WsFailureResponse.fromRequest(
      message,
      'Invalid message data',
      validator.errors?.map(
        (e) =>
          `${e.instancePath} ${e.message ? e.message : 'has unknown error'}`,
      ),
    );
  }
  return message;
}

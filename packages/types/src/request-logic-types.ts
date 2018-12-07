import * as Identity from './identity-types';
import * as Signature from './signature-types';

const bigNumber: any = require('bn.js');

/** Request Logic layer */
export interface IRequestLogic {
  createRequest: (
    requestParameters: IRequestLogicCreateParameters,
    signatureParams: Signature.ISignatureParameters,
    indexes: string[],
  ) => Promise<IRequestLogicReturnCreateRequest>;
  acceptRequest: (
    requestParameters: IRequestLogicAcceptParameters,
    signatureParams: Signature.ISignatureParameters,
  ) => Promise<IRequestLogicReturn>;
  cancelRequest: (
    requestParameters: IRequestLogicCancelParameters,
    signatureParams: Signature.ISignatureParameters,
  ) => Promise<IRequestLogicReturn>;
  increaseExpectecAmountRequest: (
    requestParameters: IRequestLogicIncreaseExpectedAmountParameters,
    signatureParams: Signature.ISignatureParameters,
  ) => Promise<IRequestLogicReturn>;
  reduceExpectecAmountRequest: (
    requestParameters: IRequestLogicReduceExpectedAmountParameters,
    signatureParams: Signature.ISignatureParameters,
  ) => Promise<IRequestLogicReturn>;
  getRequestById: (
    requestId: RequestLogicRequestId,
  ) => Promise<IRequestLogicReturnGetRequestById>;
}

/** return of IRequestLogic functions */
export interface IRequestLogicReturn {
  /** result of the execution */
  result?: any;
  /** meta information */
  meta: {
    /** meta data given by the layer below (data-access) */
    dataAccessMeta: any;
  };
}

/** return of the function createRequest */
export interface IRequestLogicReturnCreateRequest extends IRequestLogicReturn {
  result: { requestId: RequestLogicRequestId };
}

/** return of the function getRequestById */
export interface IRequestLogicReturnGetRequestById extends IRequestLogicReturn {
  result: { request: RequestLogicRequestId | null };
}

/** Interface of a request logic action */
export interface IRequestLogicAction {
  data: IRequestLogicUnsignedAction;
  signature: Signature.ISignature;
}

/** Interface of a request logic unsigned action */
export interface IRequestLogicUnsignedAction {
  name: REQUEST_LOGIC_ACTION_NAME;
  version: string;
  parameters: any;
}

/** Request in request logic */
export interface IRequestLogicRequest {
  version: string;
  // request identifier
  requestId: RequestLogicRequestId;
  // indentity of the request creator (the one who initiates it)
  creator: Identity.IIdentity;
  currency: REQUEST_LOGIC_CURRENCY;
  state: REQUEST_LOGIC_STATE;
  expectedAmount: RequestLogicAmount;
  payee?: Identity.IIdentity;
  payer?: Identity.IIdentity;
  // Array of extensions data linked to the request
  extensionsData?: any[];
  events: IRequestLogicEvent[];
}

/** Amounts in request logic */
export type RequestLogicAmount = number | string | typeof bigNumber;

/** RequestId */
export type RequestLogicRequestId = string;

/** Configuration for the versionning */
export interface IRequestLogicVersionSupportConfig {
  // current version of the specification supported by this implementation
  // will be use to check if the implemenation can handle action with different specs version
  current: string;
  // list of versions not supported in any case
  exceptions: string[];
}

/** Parameters to create a request */
export interface IRequestLogicCreateParameters {
  currency: REQUEST_LOGIC_CURRENCY;
  expectedAmount: RequestLogicAmount;
  payee?: Identity.IIdentity;
  payer?: Identity.IIdentity;
  extensionsData?: any[];
}

/** Parameters to accept a request */
export interface IRequestLogicAcceptParameters {
  requestId: RequestLogicRequestId;
  extensionsData?: any[];
}

/** Parameters to cancel a request */
export interface IRequestLogicCancelParameters {
  requestId: RequestLogicRequestId;
  extensionsData?: any[];
}

/** Parameters to increase amount of a request */
export interface IRequestLogicIncreaseExpectedAmountParameters {
  deltaAmount: RequestLogicAmount;
  requestId: RequestLogicRequestId;
  extensionsData?: any[];
}

/** Parameters to reduce amount of a request */
export interface IRequestLogicReduceExpectedAmountParameters {
  deltaAmount: RequestLogicAmount;
  requestId: RequestLogicRequestId;
  extensionsData?: any[];
}

/** Event */
export interface IRequestLogicEvent {
  // Name of this event is actually an action
  name: REQUEST_LOGIC_ACTION_NAME;
  // the information given in the event
  parameters?: any;
  actionSigner: Identity.IIdentity;
}

/** Enum of name possible in a action */
export enum REQUEST_LOGIC_ACTION_NAME {
  CREATE = 'create',
  BROADCAST = 'broadcastSignedRequest',
  ACCEPT = 'accept',
  CANCEL = 'cancel',
  REDUCE_EXPECTED_AMOUNT = 'reduceExpectedAmount',
  INCREASE_EXPECTED_AMOUNT = 'increaseExpectedAmount',
}

/** Supported currencies */
export enum REQUEST_LOGIC_CURRENCY {
  ETH = 'ETH',
  BTC = 'BTC',
}

/** States of a request */
export enum REQUEST_LOGIC_STATE {
  CREATED = 'created',
  ACCEPTED = 'accepted',
  CANCELLED = 'cancelled',
}

/** Identity roles */
export enum REQUEST_LOGIC_ROLE {
  PAYEE = 'payee',
  PAYER = 'payer',
  THIRD_PARTY = 'thirdparty',
}
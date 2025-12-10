export enum MessageType {
  HANDSHAKE_ACCEPT = "handshake_accept",
  HANDSHAKE_REJECT = "handshake_reject",
  HANDSHAKE_DISCONNECT = 'handshake_disconnect',
  SIGN_REQUEST = "sign_request",
  SIGN_REQUEST_APPROVED = "sign_request_approved",
  SIGN_REQUEST_REJECTED = "sign_request_rejected",
  SIGN_REQUEST_ERROR = 'sign_request_error'
}

export enum SigningRequestType {
  SIGN_RAW_MESSAGE = "sign_raw_message",
  SUBMIT_TRANSACTION = "submit_transaction",
}

export interface WebSocketMessage {
  type: MessageType;
  requestId?: string;
  data?: {
    requestType?: SigningRequestType;
    payload?: any;
    reason?: string;
    signature?: string;
    [key: string]: any;
  };
}

// response types for the application to handle
export enum SignRequestResponseType {
  SIGN_REQUEST_APPROVED = "sign_request_approved",
  SIGN_REQUEST_REJECTED = "sign_request_rejected",
  SIGN_REQUEST_ERROR = "sign_request_error"
}

export interface SignRequestApprovedResponse {
  signature?: string; // in case of sign_raw_message request
  updateId?: string; // in case of submit_transaction request
}

export interface SignRequestRejectedResponse {
  reason?: string;
}

export interface SignRequestErrorResponse {
  error: string;
}

export interface SignRequestResponse {
  type: SignRequestResponseType;
  data: SignRequestApprovedResponse | SignRequestRejectedResponse | SignRequestErrorResponse;
}

export interface Instrument {
  id: string;
  admin: string;
}

export interface CreateTransferCommandParams {
  receiverPartyId: string;
  amount: string;
  instrument: Instrument;
  memo?: string;
  expiryDate?: string; // ISO Date String, will default to 24 hours from now
}

export type TransactionInstructionChoice = 'Accept' | 'Reject' | 'Withdraw';

export interface CreateTransactionChoiceCommandParams {
  transferContractId: string;
  choice: TransactionInstructionChoice;
  instrument: Instrument;
}

export interface TransactionCommand {
  command: any;
  disclosedContracts: any[];
}
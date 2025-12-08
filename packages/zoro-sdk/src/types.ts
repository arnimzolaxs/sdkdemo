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
  SIGN_TRANSACTION = "sign_transaction",
}

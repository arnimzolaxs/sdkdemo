export enum MessageType {
  WALLET_CONNECT_ACCEPTED = "connection:approved",
  WALLET_CONNECT_REJECTED = "connection:rejected",
  WALLET_DISCONNECTED = "wallet_disconnected",
  SIGN_RAW_MESSAGE = "rawMessage",
  SIGN_TRANSACTION = "transaction",
  SIGN_REQUEST_APPROVED = "signing:approved",
  SIGN_REQUEST_REJECTED = "signing:rejected",
}


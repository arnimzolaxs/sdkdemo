import { Connection } from './connection';
import { RequestTimeoutError, RejectRequestError } from './errors';
import { MessageType, SigningRequestType, SignRequestResponse, WebSocketMessage } from './types';

export function generateUUID(): string {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => {
    const gCrypto = globalThis.crypto;
    if (!gCrypto?.getRandomValues) {
      const n2 = Number(c);
      return (n2 ^ Math.random() * 16 >> n2 / 4).toString(16);
    }
    const arr = gCrypto.getRandomValues(new Uint8Array(1));
    const byte = arr[0];
    const n = Number(c);
    return (n ^ (byte & 15) >> n / 4).toString(16);
  });
}

export function generateRequestId(): string {
  const gCrypto = globalThis.crypto;
  if (gCrypto?.randomUUID) {
    return gCrypto.randomUUID();
  }
  return generateUUID();
}

export class Provider {
  connection: Connection;
  partyId: string;
  publicKey: string;
  email?: string;
  authToken: string;
  requests = new Map<string, (response: SignRequestResponse) => void>();
  requestTimeout = 30000;
  openWallet: ((url: string) => void) | null = null;
  walletUrl: string | null = null;

  constructor({
    connection,
    partyId,
    publicKey,
    authToken,
    email,
    requestTimeout,
    openWallet,
    walletUrl
  }: {
    connection: Connection;
    partyId: string;
    publicKey: string;
    authToken: string;
    email?: string;
    requestTimeout?: number;
    openWallet?: (url: string) => void;
    walletUrl?: string;
  }) {
    if (!connection) {
      throw new Error("Provider requires a connection object.");
    }

    this.connection = connection;
    this.partyId = partyId;
    this.publicKey = publicKey;
    this.email = email;
    this.authToken = authToken;
    this.requestTimeout = requestTimeout || 30000;
    this.openWallet = openWallet || null;
    this.walletUrl = walletUrl || null;
  }

  handleResponse(message: WebSocketMessage) {
    console.log("Received response:", message);
    
    if (message.requestId && this.requests.has(message.requestId)) {
      const onResponse = this.requests.get(message.requestId);
      if (onResponse) {
        onResponse({
          type: message.type as any,
          data: message.data as any
        });
        this.requests.delete(message.requestId);
      } else {
        console.error("No onResponse function found for requestId:", message.requestId);
      }
    } else {
      console.error("No requestId found in message:", message);
    }
  }

  async getHoldingTransactions(): Promise<{ transactions: any[], nextOffset: number }> {
    return this.connection.getHoldingTransactions(this.authToken);
  }

  async getPendingTransactions() {
    return this.connection.getPendingTransactions(this.authToken);
  }

  async getHoldingUtxos() {
    return this.connection.getHoldingUtxos(this.authToken);
  }

  async getActiveContractsByInterfaceId(interfaceId: string) {
    return this.connection.getActiveContracts(this.authToken, { interfaceId });
  }

  async getActiveContractsByTemplateId(templateId: string) {
    return this.connection.getActiveContracts(this.authToken, { templateId });
  }

  // async submitTransaction(payload: any) {
  //   return this.sendRequest(SigningRequestType.SIGN_TRANSACTION, { txn: payload }, undefined);
  // }

  signMessage(message: string, onResponse?: (signature: any) => void) {
    this.sendRequest(SigningRequestType.SIGN_RAW_MESSAGE, { message }, onResponse);
  }

  sendRequest(
    requestType: SigningRequestType,
    payload: any = {},
    onResponse?: (response: any) => void
  ) {
    if (!this.connection.ws || this.connection.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected.");
    }

    const requestId = generateRequestId();

    this.connection.ws.send(JSON.stringify({
      requestId: requestId,
      type: MessageType.SIGN_REQUEST,
      data: {
        requestType,
        payload
      }
    }));

    if (onResponse) {
      this.requests.set(requestId, onResponse);
    }

    if (this.openWallet) {
      const url = new URL("/connect/sign", this.connection.walletUrl);
      url.searchParams.set("requestId", requestId);
      const connectUrl = url.toString();
      this.openWallet(connectUrl);
    }
  }
}

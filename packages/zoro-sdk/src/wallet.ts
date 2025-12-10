import { Connection } from "./connection";
import {
  CreateTransactionChoiceCommandParams,
  CreateTransferCommandParams,
  MessageType,
  SigningRequestType,
  SignRequestResponse,
  TransactionCommand,
  WebSocketMessage,
} from "./types";
import { generateRequestId } from "./utils";

export class Wallet {
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
    walletUrl,
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
          data: message.data as any,
        });
        this.requests.delete(message.requestId);
      } else {
        console.error(
          "No onResponse function found for requestId:",
          message.requestId
        );
      }
    } else {
      console.error("No requestId found in message:", message);
    }
  }

  async getHoldingTransactions(): Promise<{
    transactions: any[];
    nextOffset: number;
  }> {
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

  async createTransferCommand(
    params: CreateTransferCommandParams
  ): Promise<TransactionCommand> {
    return this.connection.createTransferCommand(this.authToken, params);
  }

  async createTransactionChoiceCommand(
    params: CreateTransactionChoiceCommandParams
  ): Promise<TransactionCommand> {
    return this.connection.createTransactionChoiceCommand(
      this.authToken,
      params
    );
  }

  submitTransactionCommand(
    transactionCommand: TransactionCommand,
    onResponse: (response: SignRequestResponse) => void
  ) {
    return this.sendRequest(
      SigningRequestType.SUBMIT_TRANSACTION,
      { transactionCommand: JSON.stringify(transactionCommand) },
      onResponse
    );
  }

  signMessage(
    message: string,
    onResponse: (response: SignRequestResponse) => void
  ) {
    this.sendRequest(
      SigningRequestType.SIGN_RAW_MESSAGE,
      { message },
      onResponse
    );
  }

  sendRequest(
    requestType: SigningRequestType,
    payload: any = {},
    onResponse: (response: SignRequestResponse) => void
  ) {
    if (
      !this.connection.ws ||
      this.connection.ws.readyState !== WebSocket.OPEN
    ) {
      throw new Error("Not connected.");
    }

    const requestId = generateRequestId();

    this.connection.ws.send(
      JSON.stringify({
        requestId: requestId,
        type: MessageType.SIGN_REQUEST,
        data: {
          requestType,
          payload,
        },
      })
    );

    this.requests.set(requestId, onResponse);

    if (this.openWallet) {
      const url = new URL("/connect/sign", this.connection.walletUrl);
      url.searchParams.set("requestId", requestId);
      const connectUrl = url.toString();
      this.openWallet(connectUrl);
    }
  }
}

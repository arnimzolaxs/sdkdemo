import { Connection } from "./connection";
import {
  CreateTransactionChoiceCommandParams,
  CreateTransferCommandParams,
  SigningRequestType,
  SignRequestResponse,
  TransactionCommand,
} from "./types";

export class Wallet {
  #connection: Connection;
  #partyId: string;
  #publicKey: string;
  #authToken: string;

  constructor({
    connection,
    partyId,
    publicKey,
    authToken,
  }: {
    connection: Connection;
    partyId: string;
    publicKey: string;
    authToken: string;
  }) {
    if (!connection) {
      throw new Error("Provider requires a connection object.");
    }

    this.#connection = connection;
    this.#partyId = partyId;
    this.#publicKey = publicKey;
    this.#authToken = authToken;
  }

  getPartyId(): string {
    return this.#partyId;
  }

  getPublicKey(): string {
    return this.#publicKey;
  }

  async getHoldingTransactions(): Promise<{
    transactions: any[];
    nextOffset: number;
  }> {
    return this.#connection.getHoldingTransactions(this.#authToken);
  }

  async getPendingTransactions() {
    return this.#connection.getPendingTransactions(this.#authToken);
  }

  async getHoldingUtxos() {
    return this.#connection.getHoldingUtxos(this.#authToken);
  }

  async getActiveContractsByInterfaceId(interfaceId: string) {
    return this.#connection.getActiveContracts(this.#authToken, { interfaceId });
  }

  async getActiveContractsByTemplateId(templateId: string) {
    return this.#connection.getActiveContracts(this.#authToken, { templateId });
  }

  async createTransferCommand(
    params: CreateTransferCommandParams
  ): Promise<TransactionCommand> {
    return this.#connection.createTransferCommand(this.#authToken, params);
  }

  async createTransactionChoiceCommand(
    params: CreateTransactionChoiceCommandParams
  ): Promise<TransactionCommand> {
    return this.#connection.createTransactionChoiceCommand(
      this.#authToken,
      params
    );
  }

  submitTransactionCommand(
    transactionCommand: TransactionCommand,
    onResponse: (response: SignRequestResponse) => void
  ) {
    return this.#connection.sendRequest(
      SigningRequestType.SUBMIT_TRANSACTION,
      { transactionCommand: JSON.stringify(transactionCommand) },
      onResponse
    );
  }

  signMessage(
    message: string,
    onResponse: (response: SignRequestResponse) => void
  ) {
    this.#connection.sendRequest(
      SigningRequestType.SIGN_RAW_MESSAGE,
      { message },
      onResponse
    );
  }
}

import { Connection } from "./connection";
import {
  CreateTransactionChoiceCommandParams,
  CreateTransferCommandParams,
  SigningRequestType,
  SignRequestResponse,
  TransactionCommand,
} from "./types";

export class Wallet {
  private connection: Connection;
  private partyId: string;
  private publicKey: string;
  private authToken: string;

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

    this.connection = connection;
    this.partyId = partyId;
    this.publicKey = publicKey;
    this.authToken = authToken;
  }

  public getPartyId(): string {
    return this.partyId;
  }

  public getPublicKey(): string {
    return this.publicKey;
  }

  public async getHoldingTransactions(): Promise<{
    transactions: any[];
    nextOffset: number;
  }> {
    return this.connection.getHoldingTransactions(this.authToken);
  }

  public async getPendingTransactions() {
    return this.connection.getPendingTransactions(this.authToken);
  }

  public async getHoldingUtxos() {
    return this.connection.getHoldingUtxos(this.authToken);
  }

  public async getActiveContractsByInterfaceId(interfaceId: string) {
    return this.connection.getActiveContracts(this.authToken, { interfaceId });
  }

  public async getActiveContractsByTemplateId(templateId: string) {
    return this.connection.getActiveContracts(this.authToken, { templateId });
  }

  public async createTransferCommand(
    params: CreateTransferCommandParams
  ): Promise<TransactionCommand> {
    return this.connection.createTransferCommand(this.authToken, params);
  }

  public async createTransactionChoiceCommand(
    params: CreateTransactionChoiceCommandParams
  ): Promise<TransactionCommand> {
    return this.connection.createTransactionChoiceCommand(
      this.authToken,
      params
    );
  }

  public submitTransactionCommand(
    transactionCommand: TransactionCommand,
    onResponse: (response: SignRequestResponse) => void
  ) {
    return this.connection.sendRequest(
      SigningRequestType.SUBMIT_TRANSACTION,
      { transactionCommand: JSON.stringify(transactionCommand) },
      onResponse
    );
  }

  public signMessage(
    message: string,
    onResponse: (response: SignRequestResponse) => void
  ) {
    this.connection.sendRequest(
      SigningRequestType.SIGN_RAW_MESSAGE,
      { message },
      onResponse
    );
  }
}

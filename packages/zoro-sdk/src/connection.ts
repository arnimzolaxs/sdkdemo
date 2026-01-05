import {
  CreateTransactionChoiceCommandParams,
  CreateTransferCommandParams,
  MessageType,
  Network,
  SigningRequestType,
  SignRequestResponse,
  WebSocketMessage,
} from "./types";
import { generateRequestId } from "./utils";
//dfsghjkl;
export class Connection {
  walletUrl: string = "https://zorowallet.com";
  apiUrl: string = "https://api.zorowallet.com";
  network: Network = "mainnet";
  openWalletForRequest: (requestId: string) => void;
  closeWallet: () => void;
  ws: WebSocket | undefined = undefined;

  #requests = new Map<string, (response: SignRequestResponse) => void>();

  constructor({
    network,
    walletUrl,
    apiUrl,
    openWalletForRequest,
    closeWallet,
  }: {
    network?: Network;
    walletUrl?: string;
    apiUrl?: string;
    openWalletForRequest: (requestId: string) => void;
    closeWallet: () => void;
  }) {
    this.network = network ?? "mainnet";
    this.openWalletForRequest = openWalletForRequest;
    this.closeWallet = closeWallet;

    switch (this.network) {
      case "local":
        this.walletUrl = "http://localhost:3000";
        this.apiUrl = "http://localhost:8080";
        break;
      case "mainnet":
        this.walletUrl = "https://zorowallet.com";
        this.apiUrl = "https://api.zorowallet.com";
        break;
      default:
        throw new Error("Invalid network.");
    }

    if (walletUrl) {
      this.walletUrl = walletUrl;
    }

    if (apiUrl) {
      this.apiUrl = apiUrl;
    }
  }

  async getTicket(
    appName: string,
    sessionId: string,
    version?: string,
    iconUrl?: string
  ) {
    const response = await fetch(`${this.apiUrl}/api/v1/connect/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appName,
        sessionId,
        iconUrl,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get ticket from server.");
    }

    return response.json();
  }

  async getHoldingTransactions(authToken: string) {
    const response = await fetch(
      `${this.apiUrl}/api/v1/connect/wallet/holding-transactions`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get holding transactions.");
    }

    return response.json();
  }

  async getPendingTransactions(authToken: string) {
    const response = await fetch(
      `${this.apiUrl}/api/v1/connect/wallet/pending-transactions`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get pending transactions.");
    }

    return response.json();
  }

  async getHoldingUtxos(authToken: string) {
    const response = await fetch(
      `${this.apiUrl}/api/v1/connect/wallet/holding-utxos`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get holding utxos.");
    }

    return response.json();
  }

  async getActiveContracts(
    authToken: string,
    params?: {
      templateId?: string;
      interfaceId?: string;
    }
  ) {
    const response = await fetch(
      `${this.apiUrl}/api/v1/connect/wallet/active-contracts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get active contracts.");
    }

    return response.json();
  }

  async verifySession(ticketId: string, authToken: string) {
    const response = await fetch(
      `${this.apiUrl}/api/v1/connect/ticket/${ticketId}/verify`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Session verification failed.");
    }

    const data = await response.json();

    if (!data?.partyId || !data?.publicKey) {
      throw new Error("Invalid session verification response.");
    }

    const verifiedAccount = {
      partyId: data.partyId,
      publicKey: data.publicKey,
      authToken,
    };

    return verifiedAccount;
  }

  async createTransferCommand(
    authToken: string,
    params: CreateTransferCommandParams
  ) {
    const response = await fetch(
      `${this.apiUrl}/api/v1/connect/wallet/create-transfer-command`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create transfer command.");
    }

    return response.json();
  }

  async createTransactionChoiceCommand(
    authToken: string,
    params: CreateTransactionChoiceCommandParams
  ) {
    const response = await fetch(
      `${this.apiUrl}/api/v1/connect/wallet/create-choice-command`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(params),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to create transaction choice command.");
    }

    return response.json();
  }

  connectWebSocket(
    ticketId: string,
    onMessage: (event: MessageEvent) => void,
    onDisconnect: () => void
  ) {
    const wsUrl = this.#websocketUrl(ticketId);
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = onMessage;
    this.ws.onopen = () => {
      console.log("Connected to ticket server.");
    };
    this.ws.onclose = (event: CloseEvent) => {
      console.log("Disconnected from ticket server.", event);
      if (event.code === 1000) {
        console.log("Disconnected from ticket server gracefully.");
        onDisconnect();
      } else {
        console.log("Disconnected from ticket server unexpectedly.");
        onDisconnect();
      }
      this.ws?.close();
      this.ws = undefined;
    };
  }

  sendRequest(
    requestType: SigningRequestType,
    payload: any = {},
    onResponse: (response: SignRequestResponse) => void
  ) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Not connected.");
    }

    const requestId = generateRequestId();

    this.ws.send(
      JSON.stringify({
        requestId: requestId,
        type: MessageType.SIGN_REQUEST,
        data: {
          requestType,
          payload,
        },
      })
    );

    this.#requests.set(requestId, onResponse);

    this.openWalletForRequest(requestId);
  }

  handleResponse(message: WebSocketMessage) {
    console.log("Received response:", message);

    if (message.requestId && this.#requests.has(message.requestId)) {
      const onResponse = this.#requests.get(message.requestId);
      if (onResponse) {
        onResponse({
          type: message.type as any,
          data: message.data as any,
        });
        this.#requests.delete(message.requestId);
      } else {
        console.error(
          "No onResponse function found for requestId:",
          message.requestId
        );
      }
      if (this.closeWallet) {
        this.closeWallet();
      }
    } else {
      console.error("No requestId found in message:", message);
    }
  }

  #websocketUrl(ticketId: string): string {
    const protocol = this.network === "local" ? "ws" : "wss";
    const baseUrl = this.apiUrl.replace("https://", "").replace("http://", "");
    return `${protocol}://${baseUrl}/connect/ws?ticketId=${ticketId}`;
  }
}

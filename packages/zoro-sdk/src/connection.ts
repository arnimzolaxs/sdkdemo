import { CreateTransferCommandParams } from "./types";

export class Connection {
  walletUrl = "https://zorowallet.com";
  apiUrl = "https://api.zorowallet.com";
  ws: WebSocket | null = null;
  network = "main";

  constructor({ network, walletUrl, apiUrl }: {
    network?: string;
    walletUrl?: string;
    apiUrl?: string;
  }) {
    this.network = network || "mainnet";

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

  async getTicket(appName: string, sessionId: string, version?: string) {
    const response = await fetch(`${this.apiUrl}/api/v1/connect/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        appName: appName,
        sessionId: sessionId,
      })
    });

    if (!response.ok) {
      throw new Error("Failed to get ticket from server.");
    }

    return response.json();
  }

  async getHoldingTransactions(authToken: string) {
    const response = await fetch(`${this.apiUrl}/api/v1/connect/wallet/holding-transactions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to get holding transactions.");
    }

    return response.json();
  }

  async getPendingTransactions(authToken: string) {
    const response = await fetch(`${this.apiUrl}/api/v1/connect/wallet/pending-transactions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to get pending transactions.");
    }

    return response.json();
  }

  async getHoldingUtxos(authToken: string) {
    const response = await fetch(`${this.apiUrl}/api/v1/connect/wallet/holding-utxos`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error("Failed to get holding utxos.");
    }

    return response.json();
  }

  async getActiveContracts(authToken: string, params?: {
    templateId?: string;
    interfaceId?: string;
  }) {
    const response = await fetch(`${this.apiUrl}/api/v1/connect/wallet/active-contracts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error("Failed to get active contracts.");
    }

    return response.json();
  }

  async verifySession(ticketId: string, authToken: string) {
    const response = await fetch(`${this.apiUrl}/api/v1/connect/ticket/${ticketId}/verify`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      }
    });

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

  async createTransferCommand(authToken: string, params: CreateTransferCommandParams) {
    const response = await fetch(`${this.apiUrl}/api/v1/connect/wallet/create-transfer-command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      throw new Error("Failed to create transfer command.");
    }

    return response.json();
  }

  websocketUrl(ticketId: string): string {
    const protocol = this.network === "local" ? "ws" : "wss";
    const baseUrl = this.apiUrl.replace("https://", "").replace("http://", "");
    return `${protocol}://${baseUrl}/connect/ws?ticketId=${ticketId}`;
  }

  connectWebSocket(ticketId: string, onMessage: (event: MessageEvent) => void, onDisconnect: () => void) {
    const wsUrl = this.websocketUrl(ticketId);
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
      this.ws = null;
    };
  }
}


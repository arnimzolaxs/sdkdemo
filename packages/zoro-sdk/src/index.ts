import QRCode from "qrcode";
import { Connection } from "./connection";
import { Wallet } from "./wallet";
import { generateRequestId } from "./utils";
import { MessageType, Network } from "./types";

export * from "./types";

export { type Wallet } from "./wallet";

// Main SDK class
export class ZoroSDK {
  #version: string = "0.0.1";
  appName: string = "Unknown";
  iconUrl?: string;
  onAccept?: (wallet: Wallet) => void;
  onReject?: () => void;
  onDisconnect?: () => void;
  
  #connection?: Connection;
  #wallet?: Wallet;
  #openMode: "popup" | "redirect" = "popup";
  #popupWindow?: Window;
  #redirectUrl?: string;
  #overlay?: HTMLElement;
  #ticketId?: string;

  init({
    appName,
    iconUrl,
    network,
    walletUrl,
    apiUrl,
    onAccept,
    onReject,
    onDisconnect,
  }: {
    appName: string;
    iconUrl?: string;
    network?: Network;
    walletUrl?: string;
    apiUrl?: string;
    onAccept: (wallet: Wallet) => void;
    onReject?: () => void;
    onDisconnect?: () => void;
  }) {
    this.appName = appName;
    this.iconUrl = iconUrl;
    this.onAccept = onAccept;
    this.onReject = onReject;
    this.onDisconnect = onDisconnect;

    const resolvedOptions = {
      openMode: "popup" as "popup" | "redirect",
      redirectUrl: undefined,
    };

    this.#openMode = resolvedOptions.openMode;
    this.#redirectUrl = resolvedOptions.redirectUrl;
    this.#connection = new Connection({
      network,
      walletUrl,
      apiUrl,
      openWalletForRequest: this.#openWalletForRequest.bind(this),
      closeWallet: this.#closePopup.bind(this),
    });
  }

  async connect() {
    if (typeof window === "undefined") {
      console.warn(
        "ZoroSDK.connect() can only be called in a browser environment."
      );
      return;
    }

    if (!this.#connection) {
      throw new Error("SDK not initialized. Call init() first.");
    }

    const existingConnectionRaw = localStorage.getItem("zoro_connect");

    if (existingConnectionRaw) {
      try {
        let canReuseTicket = true;
        const { ticketId, authToken, partyId, publicKey } = JSON.parse(
          existingConnectionRaw
        );

        if (ticketId && authToken && partyId && publicKey) {
          try {
            const verifiedAccount = await this.#connection.verifySession(
              ticketId,
              authToken
            );

            if (
              verifiedAccount.partyId === partyId &&
              verifiedAccount.publicKey === publicKey
            ) {
              this.#wallet = new Wallet({
                connection: this.#connection,
                partyId,
                authToken,
                publicKey,
              });

              this.onAccept?.(this.#wallet);

              this.#connection.connectWebSocket(
                ticketId,
                this.#handleWebSocketMessage.bind(this),
                this.#handleDisconnect.bind(this)
              );

              return;
            } else {
              console.warn(
                "[ZoroSDK] Stored partyId does not match verified account. Clearing cached session."
              );
              canReuseTicket = false;
              localStorage.removeItem("zoro_connect");
            }
          } catch (err) {
            console.error(
              "Auto-login failed, token is invalid. Starting new connection.",
              err
            );
            canReuseTicket = false;
            localStorage.removeItem("zoro_connect");
          }
        }

        if (ticketId && canReuseTicket) {
          this.#ticketId = ticketId;
          const url = new URL("/connect/", this.#connection.walletUrl);
          url.searchParams.set("ticketId", ticketId);

          if (this.#redirectUrl) {
            url.searchParams.set("redirectUrl", this.#redirectUrl);
          }

          const connectUrl = url.toString();
          this.#showQrCode(connectUrl);
          this.#connection.connectWebSocket(
            ticketId,
            this.#handleWebSocketMessage.bind(this),
            this.#handleDisconnect.bind(this)
          );
          return;
        }
      } catch (error) {
        console.error(
          "Failed to parse existing connection info, creating a new one.",
          error
        );
      }
      localStorage.removeItem("zoro_connect");
    }

    const sessionId = generateRequestId();

    try {
    const { ticketId } = await this.#connection!.getTicket(
      this.appName,
      sessionId,
      this.#version,
      this.iconUrl
    );
    this.#ticketId = ticketId;

      localStorage.setItem(
        "zoro_connect",
        JSON.stringify({ sessionId, ticketId })
      );

    const url = new URL("/connect", this.#connection!.walletUrl);
      url.searchParams.set("ticketId", ticketId);

    if (this.#redirectUrl) {
      url.searchParams.set("redirectUrl", this.#redirectUrl);
      }

      const connectUrl = url.toString();
      this.#showQrCode(connectUrl);
    this.#connection!.connectWebSocket(
        ticketId,
        this.#handleWebSocketMessage.bind(this),
        this.#handleDisconnect.bind(this)
      );
    } catch (error) {
      console.error(error);
      return;
    }
  }

  disconnect() {
    this.#handleDisconnect(false);
  }

  hideQrCode() {
    if (this.#overlay && this.#overlay.parentElement) {
      this.#overlay.parentElement.removeChild(this.#overlay);
      this.#overlay = undefined;
    }
  }

  #handleWebSocketMessage(event: MessageEvent) {
    console.log("[ZoroSDK] WS message received:", event.data);
    const message = JSON.parse(event.data);

    if (message.type === MessageType.HANDSHAKE_ACCEPT) {
      console.log("[ZoroSDK] Entering HANDSHAKE_ACCEPT flow");

      const { authToken, partyId, publicKey } = message.data || {};

      if (authToken && partyId && publicKey) {
        this.#wallet = new Wallet({
          connection: this.#connection!,
          partyId,
          authToken,
          publicKey,
        });

        const connectionInfoRaw = localStorage.getItem("zoro_connect");

        if (connectionInfoRaw) {
          try {
            const connectionInfo = JSON.parse(connectionInfoRaw);
            connectionInfo.authToken = authToken;
            connectionInfo.partyId = partyId;
            connectionInfo.publicKey = publicKey;

            localStorage.setItem(
              "zoro_connect",
              JSON.stringify(connectionInfo)
            );
            this.onAccept?.(this.#wallet);
            this.hideQrCode();

            this.#connection?.connectWebSocket(
              connectionInfo.ticketId,
              this.#handleWebSocketMessage.bind(this),
              this.#handleDisconnect.bind(this)
            );

            this.#closePopup();
          } catch (error) {
            console.error(
              "Failed to update local storage with auth token.",
              error
            );
          }
        }
      }
    } else if (message.type === MessageType.HANDSHAKE_REJECT) {
      console.log("[ZoroSDK] Entering HANDSHAKE_REJECT flow");

      localStorage.removeItem("zoro_connect");
      this.#connection?.ws?.close();
      this.onReject?.();
      this.hideQrCode();

      this.#closePopup();
    } else if (message.type === MessageType.HANDSHAKE_DISCONNECT) {
      console.log("[ZoroSDK] Entering HANDSHAKE_DISCONNECT flow");
      console.log("message", message);
      this.#handleDisconnect();
    } else if (
      this.#connection &&
      (message.type === MessageType.SIGN_REQUEST_APPROVED ||
        message.type === MessageType.SIGN_REQUEST_REJECTED ||
        message.type === MessageType.SIGN_REQUEST_ERROR)
    ) {
      this.#connection.handleResponse(message);
    } else {
      console.warn("[ZoroSDK] Unknown message type:", message.type);
    }
  }

  #handleDisconnect(isClosedByWallet: boolean = true) {
    localStorage.removeItem("zoro_connect");
    if (this.#connection?.ws) {
      this.#connection.ws.close();
    }
    if (isClosedByWallet) {
      this.onDisconnect?.();
    }

    this.hideQrCode();

    console.log("[ZoroSDK] HANDSHAKE_DISCONNECT: closing popup (if exists)");
    if (this.#popupWindow && !this.#popupWindow.closed) {
      this.#popupWindow.close();
    }
    this.#popupWindow = undefined;
    this.#wallet = undefined;
    this.#ticketId = undefined;
  }

  #openWallet(url: string) {
    if (typeof window === "undefined") {
      return;
    }

    if (this.#openMode === "popup") {
      const width = 480;
      const height = 720;
      const left = (window.innerWidth - width) / 2 + window.screenX;
      const top = (window.innerHeight - height) / 2 + window.screenY;
      const features =
        `width=${width},height=${height},` +
        `left=${left},top=${top},` +
        "menubar=no,toolbar=no,location=no," +
        "resizable=yes,scrollbars=yes,status=no";

      const popup = window.open(url, "zoro-wallet", features);

      if (!popup) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      this.#popupWindow = popup;

      try {
        popup.focus();
      } catch (e) {
        // Ignore focus errors
      }

      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  #openWalletForRequest(requestId: string) {
    if (!this.#ticketId) {
      throw new Error("Ticket ID is not set. Call connect() first.");
    }
    if (!this.#connection) {
      throw new Error("Connection is not set. Call init() first.");
    }

    const url = new URL("/connect", this.#connection.walletUrl);
    url.searchParams.append("ticketId", this.#ticketId);
    url.searchParams.append("requestId", requestId);
    this.#openWallet(url.toString());
  }

  #showQrCode(url: string) {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    QRCode.toDataURL(url, (err: Error | null | undefined, dataUrl: string) => {
      if (err) {
        console.error("Failed to generate QR code", err);
        return;
      }

      const overlay = document.createElement("div");
      overlay.id = "zoro-sdk-connect-overlay";
      overlay.className = "zoro-sdk-connect-overlay";
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.backgroundColor = "rgba(0,0,0,0.95)";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.style.zIndex = "1000";
      overlay.style.flexDirection = "column";

      const content = document.createElement("div");
      content.className = "zoro-sdk-connect-content";
      content.style.display = "flex";
      content.style.flexDirection = "column";
      content.style.alignItems = "center";
      content.style.justifyContent = "center";
      content.style.width = "350px";
      content.style.backgroundColor = "#141414";
      content.style.borderRadius = "16px";
      content.style.border = "1px solid #303030";

      const header = document.createElement("div");
      header.className = "zoro-sdk-connect-header";
      header.style.display = "flex";
      header.style.flexDirection = "column";
      header.style.alignItems = "center";
      header.style.justifyContent = "center";
      header.style.marginBottom = "12px";
      header.style.padding = "12px";
      header.style.borderBottom = "1px solid #303030";
      header.style.width = "100%";

      const title = document.createElement("h2");
      title.className = "zoro-sdk-connect-title";
      title.style.fontWeight = "400";
      title.style.color = "#E5E7EB";
      title.textContent = "Connect to Zoro Wallet";
      title.style.margin = "0px";
      title.style.padding = "0px";

      header.appendChild(title);
      content.appendChild(header);

      const qrCodeContainer = document.createElement("div");
      qrCodeContainer.className = "zoro-sdk-connect-qr-code-container";
      qrCodeContainer.style.display = "flex";
      qrCodeContainer.style.flexDirection = "column";
      qrCodeContainer.style.alignItems = "center";
      qrCodeContainer.style.justifyContent = "center";
      qrCodeContainer.style.margin = "0px";
      qrCodeContainer.style.padding = "24px";
      qrCodeContainer.style.width = "90%";

      const img = document.createElement("img");
      img.src = dataUrl;
      img.style.width = "100%";
      img.style.objectFit = "contain";
      img.style.borderRadius = "16px";
      img.style.marginBottom = "12px";
      qrCodeContainer.appendChild(img);

      const description = document.createElement("p");
      description.className = "zoro-sdk-connect-description";
      description.style.fontSize = "14px";
      description.style.color = "#808080";
      description.textContent = "Scan this QR code with your phone";
      qrCodeContainer.appendChild(description);

      content.appendChild(qrCodeContainer);

      const btn = document.createElement("button");
      btn.textContent = "Connect";
      btn.style.color = "#0A0A0A";
      btn.style.width = "90%";
      btn.style.margin = "24px";
      btn.style.marginTop = "0px";
      btn.style.padding = "0px 16px";
      btn.style.borderRadius = "16px";
      btn.style.backgroundColor = "#e9b873";
      btn.style.cursor = "pointer";
      btn.style.border = "none";
      btn.style.outline = "none";
      btn.style.display = "flex";
      btn.style.alignItems = "center";
      btn.style.justifyContent = "center";
      btn.style.textAlign = "center";
      btn.style.verticalAlign = "middle";
      btn.style.lineHeight = "40px";
      btn.style.fontSize = "14px";
      btn.style.fontWeight = "550";
      btn.onclick = (e) => {
        e.preventDefault();
        this.#openWallet(url);
      };

      content.appendChild(btn);
      overlay.appendChild(content);

      overlay.onclick = (e) => {
        if (e.target === overlay) {
          this.hideQrCode();
        }
      };

      document.body.appendChild(overlay);
      this.#overlay = overlay;
    });
  }

  #closePopup() {
    console.log("closing popup gracefully...");
    // close after 1 second to ensure the popup is closed gracefully
    setTimeout(() => {
      if (this.#popupWindow && !this.#popupWindow.closed) {
        this.#popupWindow.close();
      }
      this.#popupWindow = undefined;
    }, 1000);
  }
}

// Export a default instance
export const zoro = new ZoroSDK();

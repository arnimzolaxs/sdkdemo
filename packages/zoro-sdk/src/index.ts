import QRCode from 'qrcode';
import { Connection } from './connection';
import { Provider } from './provider';
import { generateRequestId } from './provider';

export * from './types';
export * from './connection';
export * from './provider';
export * from './errors';

export { MessageType } from './types';

// Main SDK class
export class ZoroSDK {
  version = "0.0.1";
  appName = "Unknown";
  connection: Connection | null = null;
  provider: Provider | null = null;
  openMode = "popup";
  popupWindow: Window | null = null;
  redirectUrl?: string;
  onAccept: ((provider: Provider) => void) | null = null;
  onReject: (() => void) | null = null;
  overlay: HTMLElement | null = null;
  ticketId: string | null = null;

  constructor() {}

  init({
    appName,
    network,
    walletUrl,
    apiUrl,
    onAccept,
    onReject,
    options
  }: {
    appName: string;
    network?: string;
    walletUrl?: string;
    apiUrl?: string;
    onAccept?: (provider: Provider) => void;
    onReject?: () => void;
    options?: {
      openMode?: string;
      redirectUrl?: string;
    };
  }) {
    this.appName = appName;
    this.onAccept = onAccept || null;
    this.onReject = onReject || null;

    const resolvedOptions = {
      openMode: "popup",
      redirectUrl: undefined,
      ...options ?? {}
    };

    this.openMode = resolvedOptions.openMode;
    this.redirectUrl = resolvedOptions.redirectUrl;
    this.connection = new Connection({ network, walletUrl, apiUrl });
  }

  async connect() {
    if (typeof window === "undefined") {
      console.warn("ZoroSDK.connect() can only be called in a browser environment.");
      return;
    }

    if (!this.connection) {
      throw new Error("SDK not initialized. Call init() first.");
    }

    const existingConnectionRaw = localStorage.getItem("zoro_connect");
    
    if (existingConnectionRaw) {
      try {
        let canReuseTicket = true;
        const { ticketId, authToken, partyId, publicKey, email } = JSON.parse(existingConnectionRaw);
        
        if (authToken && partyId && publicKey) {
          try {
            const verifiedAccount = await this.connection.verifySession(authToken);
            
            if (verifiedAccount.party_id === partyId) {
              this.provider = new Provider({
                connection: this.connection,
                party_id: partyId,
                auth_token: authToken,
                public_key: publicKey,
                email
              });
              
              this.onAccept?.(this.provider);
              
              if (ticketId) {
                this.connection.connectWebSocket(ticketId, this.handleWebSocketMessage.bind(this));
              }
              
              return;
            } else {
              console.warn("[ZoroSDK] Stored partyId does not match verified account. Clearing cached session.");
              canReuseTicket = false;
              localStorage.removeItem("zoro_connect");
            }
          } catch (err) {
            console.error("Auto-login failed, token is invalid. Starting new connection.", err);
            canReuseTicket = false;
            localStorage.removeItem("zoro_connect");
          }
        }

        if (ticketId && canReuseTicket) {
          this.ticketId = ticketId;
          const url = new URL("/connect/", this.connection.walletUrl);
          url.searchParams.set("ticketId", ticketId);
          
          if (this.redirectUrl) {
            url.searchParams.set("redirectUrl", this.redirectUrl);
          }
          
          const connectUrl = url.toString();
          this.showQrCode(connectUrl);
          this.connection.connectWebSocket(ticketId, this.handleWebSocketMessage.bind(this));
          return;
        }
      } catch (error) {
        console.error("Failed to parse existing connection info, creating a new one.", error);
      }
      localStorage.removeItem("zoro_connect");
    }

    const sessionId = generateRequestId();
    
    try {
      const { ticketId } = await this.connection.getTicket(this.appName, sessionId, this.version);
      this.ticketId = ticketId;
      
      localStorage.setItem("zoro_connect", JSON.stringify({ sessionId, ticketId }));
      
      const url = new URL("/connect/", this.connection.walletUrl);
      url.searchParams.set("ticketId", ticketId);
      
      if (this.redirectUrl) {
        url.searchParams.set("redirectUrl", this.redirectUrl);
      }
      
      const connectUrl = url.toString();
      this.showQrCode(connectUrl);
      this.connection.connectWebSocket(ticketId, this.handleWebSocketMessage.bind(this));
    } catch (error) {
      console.error(error);
      return;
    }
  }

  handleWebSocketMessage(event: MessageEvent) {
    console.log("[ZoroSDK] WS message received:", event.data);
    const message = JSON.parse(event.data);
    console.log("[ZoroSDK] WS message parsed:", message);

    if (message.type === "connection:approved") {
      console.log("[ZoroSDK] Entering HANDSHAKE_ACCEPT flow");
      
      const { authToken, partyId, publicKey, email } = message.data || {};
      
      if (authToken && partyId && publicKey) {
        this.provider = new Provider({
          connection: this.connection!,
          party_id: partyId,
          auth_token: authToken,
          public_key: publicKey,
          email,
          openWallet: this.openWallet.bind(this),
          walletUrl: this.connection!.walletUrl
        });
        
        const connectionInfoRaw = localStorage.getItem("zoro_connect");
        
        if (connectionInfoRaw) {
          try {
            const connectionInfo = JSON.parse(connectionInfoRaw);
            connectionInfo.authToken = authToken;
            connectionInfo.partyId = partyId;
            connectionInfo.publicKey = publicKey;
            connectionInfo.email = email;
            
            localStorage.setItem("zoro_connect", JSON.stringify(connectionInfo));
            this.onAccept?.(this.provider);
            this.hideQrCode();
            
            this.connection?.connectWebSocket(connectionInfo.ticketId, this.handleWebSocketMessage.bind(this));
            
            console.log("[ZoroSDK] HANDSHAKE_ACCEPT: closing popup (if exists)");
            this.popupWindow = null;
          } catch (error) {
            console.error("Failed to update local storage with auth token.", error);
          }
        }
      }
    } else if (message.type === "connection:rejected") {
      console.log("[ZoroSDK] Entering HANDSHAKE_REJECT flow");
      
      localStorage.removeItem("zoro_connect");
      this.connection?.ws?.close();
      this.onReject?.();
      this.hideQrCode();
      
      console.log("[ZoroSDK] HANDSHAKE_REJECT: closing popup (if exists)");
      if (this.popupWindow && !this.popupWindow.closed) {
        this.popupWindow.close();
      }
      this.popupWindow = null;
    } else if (message.type === "signing:approved" || message.type === "signing:rejected") {
      this.provider?.handleResponse(message);
    }
  }

  openWallet(url: string) {
    if (typeof window === "undefined") {
      return;
    }

    if (this.openMode === "popup") {
      const width = 480;
      const height = 720;
      const left = (window.innerWidth - width) / 2 + window.screenX;
      const top = (window.innerHeight - height) / 2 + window.screenY;
      const features = `width=${width},height=${height},` +
        `left=${left},top=${top},` +
        "menubar=no,toolbar=no,location=no," +
        "resizable=yes,scrollbars=yes,status=no";

      const popup = window.open(url, "zoro-wallet", features);
      
      if (!popup) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }

      this.popupWindow = popup;

      try {
        popup.focus();
      } catch (e) {
        // Ignore focus errors
      }

      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  showQrCode(url: string) {
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
      overlay.style.backgroundColor = "rgba(0,0,0,0.9)";
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

      const img = document.createElement("img");
      img.src = dataUrl;
      content.appendChild(img);

      const link = document.createElement("a");
      link.href = url;
      link.textContent = "Or click here to connect";
      link.style.color = "white";
      link.style.marginTop = "20px";
      link.onclick = (e) => {
        e.preventDefault();
        this.openWallet(url);
      };

      content.appendChild(link);
      overlay.appendChild(content);

      overlay.onclick = (e) => {
        if (e.target === overlay) {
          this.hideQrCode();
        }
      };

      document.body.appendChild(overlay);
      this.overlay = overlay;
    });
  }

  hideQrCode() {
    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}

// Export a default instance
export const zoro = new ZoroSDK();

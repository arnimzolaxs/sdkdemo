import QRCode from 'qrcode';
import { Connection } from './connection';
import { Provider } from './provider';
import { generateRequestId } from './provider';
import { MessageType } from './types';


export {
  SignRequestResponseType,
  type SignRequestApprovedResponse,
  type SignRequestRejectedResponse,
  type SignRequestErrorResponse,
  type SignRequestResponse,
  type Instrument,
  type CreateTransferCommandParams
} from './types';

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
  onDisconnect: (() => void) | null = null;
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
      // redirectUrl?: string;
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
        const { ticketId, authToken, partyId, publicKey } = JSON.parse(existingConnectionRaw);
        
        if (ticketId && authToken && partyId && publicKey) {
          try {
            const verifiedAccount = await this.connection.verifySession(ticketId, authToken);
            
            if (verifiedAccount.partyId === partyId && verifiedAccount.publicKey === publicKey) {
              this.provider = new Provider({
                connection: this.connection,
                partyId,
                authToken,
                publicKey,
                openWallet: this.openWallet.bind(this),
                walletUrl: this.connection!.walletUrl
              });
              
              this.onAccept?.(this.provider);
              
              this.connection.connectWebSocket(ticketId, this.handleWebSocketMessage.bind(this), this.handleDisconnect.bind(this));
              
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
          this.connection.connectWebSocket(ticketId, this.handleWebSocketMessage.bind(this), this.handleDisconnect.bind(this));
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
      this.connection.connectWebSocket(ticketId, this.handleWebSocketMessage.bind(this), this.handleDisconnect.bind(this));
    } catch (error) {
      console.error(error);
      return;
    }
  }

  disconnect() {
    this.handleDisconnect(false);
  }

  handleWebSocketMessage(event: MessageEvent) {
    console.log("[ZoroSDK] WS message received:", event.data);
    const message = JSON.parse(event.data);

    if (message.type === MessageType.HANDSHAKE_ACCEPT) {
      console.log("[ZoroSDK] Entering HANDSHAKE_ACCEPT flow");
      
      const { authToken, partyId, publicKey, email } = message.data || {};
      
      if (authToken && partyId && publicKey) {
        this.provider = new Provider({
          connection: this.connection!,
          partyId,
          authToken,
          publicKey,
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
            
            this.connection?.connectWebSocket(connectionInfo.ticketId, this.handleWebSocketMessage.bind(this), this.handleDisconnect.bind(this));
            
            console.log("[ZoroSDK] HANDSHAKE_ACCEPT: closing popup (if exists)");
            this.popupWindow = null;
          } catch (error) {
            console.error("Failed to update local storage with auth token.", error);
          }
        }
      }
    } else if (message.type === MessageType.HANDSHAKE_REJECT) {
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
    } else if (message.type === MessageType.HANDSHAKE_DISCONNECT) {
      console.log("[ZoroSDK] Entering HANDSHAKE_DISCONNECT flow");
      console.log("message", message);
      this.handleDisconnect();
    }
    else if (this.provider && (message.type === MessageType.SIGN_REQUEST_APPROVED || message.type === MessageType.SIGN_REQUEST_REJECTED || message.type === MessageType.SIGN_REQUEST_ERROR)) {
      this.provider.handleResponse(message);
    } else {
      console.warn("[ZoroSDK] Unknown message type:", message.type);
    }
  }

  handleDisconnect(isClosedByWallet: boolean = true) {
    localStorage.removeItem("zoro_connect");
    if (this.connection?.ws) {
      this.connection.ws.close();
    }
    if (isClosedByWallet) {
      this.onDisconnect?.();
    }

    this.hideQrCode();

    console.log("[ZoroSDK] HANDSHAKE_DISCONNECT: closing popup (if exists)");
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close();
    }
    this.popupWindow = null;
    this.provider = null;
    this.ticketId = null;
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

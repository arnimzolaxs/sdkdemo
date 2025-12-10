import { useState, useEffect } from "react";
import { zoro, SignRequestResponseType } from "@openvector/zoro-sdk";
import "./App.css";

function App() {
  const [provider, setProvider] = useState(null);
  const [status, setStatus] = useState({
    text: "Not connected",
    connected: false,
  });
  const [result, setResult] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Initialize the SDK
    zoro.init({
      appName: "Zoro SDK Demo",
      network: "local",
      onAccept: (provider) => {
        console.log("Connected!", provider);
        setProvider(provider);
        setStatus({ text: "Connected", connected: true });
        setIsConnecting(false);
      },
      onReject: () => {
        console.log("Connection rejected");
        setStatus({ text: "Connection rejected", connected: false });
        setIsConnecting(false);
      },
      onDisconnect: () => {
        console.log("Disconnected");
        setStatus({ text: "Disconnected", connected: false });
        setIsConnecting(false);
        setProvider(null);
        setResult(null);
      },
      walletUrl: "http://localhost:8081",
      apiUrl: "http://localhost:1337",
    });
  }, []);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setStatus({ text: "Connecting...", connected: false });
      await zoro.connect();
    } catch (error) {
      console.error("Connection error:", error);
      setStatus({ text: `Error: ${error.message}`, connected: false });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    zoro.disconnect();
    setProvider(null);
    setStatus({ text: "Disconnected", connected: false });
    setResult(null);
  };

  const handleGetHoldingTransactions = async () => {
    if (!provider) {
      setResult({ title: "Error", data: "Not connected" });
      return;
    }

    try {
      const holdingTransactions = await provider.getHoldingTransactions();
      setResult({
        title: "Holding Transactions",
        data: holdingTransactions.transactions,
      });
    } catch (error) {
      setResult({ title: "Error", data: error.message });
    }
  };

  const handleSignMessage = () => {
    if (!provider) {
      setResult({ title: "Error", data: "Not connected" });
      return;
    }

    const message = prompt("Enter message to sign:");
    if (!message) return;

    provider.signMessage(message, (response) => {
      switch (response.type) {
        case SignRequestResponseType.SIGN_REQUEST_APPROVED:
          setResult({ title: "Signature", data: response.data.signature });
          break;
        case SignRequestResponseType.SIGN_REQUEST_REJECTED:
          setResult({ title: "Error", data: "Request rejected by the wallet" });
          break;
        case SignRequestResponseType.SIGN_REQUEST_ERROR:
          setResult({ title: "Error", data: response.data.error });
          break;
        default:
          setResult({ title: "Error", data: "Unknown response type" });
          break;
      }
    });
  };

  const handleCreateTransferCommand = async () => {
    if (!provider) {
      setResult({ title: "Error", data: "Not connected" });
      return;
    }

    const transferCommand = await provider.createTransferCommand({
      receiverPartyId: "receiverPartyId",
      amount: "10",
      instrument: {
        id: "Amulet",
        admin:
          "DSO::1220b1431ef217342db44d516bb9befde802be7d8899637d290895fa58880f19accc",
      },
      memo: "Demo dapp transfer",
    });
    setResult({ title: "Transfer Command", data: { transferCommand } });
  };

  const handleSubmitTransactionCommand = async () => {
    if (!provider) {
      setResult({ title: "Error", data: "Not connected" });
      return;
    }

    if (!result.data.transferCommand) {
      setResult({ title: "Error", data: "No transfer command found" });
      return;
    }

    provider.submitTransactionCommand(
      result.data.transferCommand,
      (response) => {
        switch (response.type) {
          case SignRequestResponseType.SIGN_REQUEST_APPROVED:
            setResult({ title: "updateId", data: response.data.updateId });
            break;
          case SignRequestResponseType.SIGN_REQUEST_REJECTED:
            setResult({
              title: "Error",
              data: "Request rejected by the wallet",
            });
            break;
          case SignRequestResponseType.SIGN_REQUEST_ERROR:
            setResult({ title: "Error", data: response.data.error });
            break;
          default:
            setResult({ title: "Error", data: "Unknown response type" });
            break;
        }
      }
    );
  };

  return (
    <div className="app">
      <div className="container">
        <h1>Zoro SDK Demo</h1>

        <div
          className={`status ${status.connected ? "connected" : ""} ${
            status.text.includes("Error") ? "error" : ""
          }`}
        >
          <strong>Status:</strong> <span>{status.text}</span>
        </div>

        <div className="buttons">
          <button
            onClick={handleConnect}
            disabled={status.connected || isConnecting}
          >
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
          <button onClick={handleDisconnect} disabled={!status.connected}>
            Disconnect
          </button>
        </div>

        {status.connected && (
          <div className="actions">
            <h2>Actions</h2>
            <button onClick={handleGetHoldingTransactions}>
              Get Holding Transactions
            </button>
            <button onClick={handleSignMessage}>Sign Message</button>
            <button onClick={handleCreateTransferCommand}>
              Create Transfer Command
            </button>
            {/* <button onClick={handleCreateTransactionChoiceCommand}>Create Transaction Choice Command</button> */}
            <button onClick={handleSubmitTransactionCommand}>
              Submit Transaction Command
            </button>
          </div>
        )}

        {result && (
          <div className="result">
            <h3>{result.title}</h3>
            <pre>
              {typeof result.data === "string"
                ? result.data
                : JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

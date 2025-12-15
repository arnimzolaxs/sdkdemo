import { useEffect, useState } from "react";
import {
  zoro,
  SignRequestResponseType,
  SignRequestResponse,
  TransactionCommand,
  Wallet,
  SignRequestApprovedResponse,
  SignRequestRejectedResponse,
  SignRequestErrorResponse,
  TransactionInstructionChoice,
} from "@open-vector/zoro-sdk";
import "./App.css";

type ResultState = null | {
  title: string;
  data: any;
};

const transferInstrument = {
  id: "Amulet",
  admin:
    "DSO::1220b1431ef217342db44d516bb9befde802be7d8899637d290895fa58880f19accc",
};

function App() {
  const [wallet, setWallet] = useState<Wallet | undefined>(undefined);
  const [status, setStatus] = useState<{ text: string; connected: boolean }>({
    text: "Not connected",
    connected: false,
  });
  const [result, setResult] = useState<ResultState>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    zoro.init({
      appName: "Zoro SDK Demo",
      network: "local",
      onAccept: (connectedWallet: Wallet) => {
        setWallet(connectedWallet);
        setStatus({ text: "Connected", connected: true });
        setIsConnecting(false);
      },
      onReject: () => {
        setStatus({ text: "Connection rejected", connected: false });
        setIsConnecting(false);
      },
      onDisconnect: () => {
        setStatus({ text: "Disconnected", connected: false });
        setIsConnecting(false);
        setWallet(undefined);
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
    } catch (error: any) {
      setStatus({
        text: `Error: ${error?.message ?? "Unknown error"}`,
        connected: false,
      });
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    zoro.disconnect();
    setWallet(undefined);
    setStatus({ text: "Disconnected", connected: false });
    setResult(null);
  };

  const handleGetHoldingTransactions = async () => {
    if (!wallet) {
      setResult({ title: "Error", data: "Not connected" });
      return;
    }

    try {
      const holdingTransactions = await wallet.getHoldingTransactions();
      setResult({
        title: "Holding Transactions",
        data: holdingTransactions.transactions,
      });
    } catch (error: any) {
      setResult({ title: "Error", data: error?.message ?? "Unknown error" });
    }
  };

  const handleGetPendingTransactions = async () => {
    if (!wallet) {
      setResult({ title: "Error", data: "Not connected" });
      return;
    }

    try {
      const pendingTransactions = await wallet.getPendingTransactions();
      setResult({
        title: "Pending Transactions",
        data: { pendingTransactions },
      });
    } catch (error: any) {
      setResult({ title: "Error", data: error?.message ?? "Unknown error" });
    }
  };

  const handleSignMessage = () => {
    if (!wallet) {
      setResult({ title: "Error", data: "Not connected" });
      return;
    }

    const message = prompt("Enter message to sign:");
    if (!message) return;

    wallet.signMessage(message, (response: SignRequestResponse) => {
      switch (response.type) {
        case SignRequestResponseType.SIGN_REQUEST_APPROVED:
          setResult({
            title: "Signature",
            data: (response.data as SignRequestApprovedResponse).signature,
          });
          break;
        case SignRequestResponseType.SIGN_REQUEST_REJECTED:
          setResult({
            title: "Error",
            data: (response.data as SignRequestRejectedResponse).reason,
          });
          break;
        case SignRequestResponseType.SIGN_REQUEST_ERROR:
          setResult({
            title: "Error",
            data: (response.data as SignRequestErrorResponse).error,
          });
          break;
        default:
          setResult({ title: "Error", data: "Unknown response type" });
          break;
      }
    });
  };

  const handleCreateTransferCommand = async () => {
    if (!wallet) {
      setResult({ title: "Error", data: "Not connected" });
      return;
    }

    try {
      const transferCommand = await wallet.createTransferCommand({
        receiverPartyId:
          "a1124243993ba9223263a237ce387b72::1220959da192d32f46f1f2013875b08edfb8845bceed9dffafc18d84a3e75aba61b7",
        amount: "1",
        instrument: transferInstrument,
        memo: "Demo dapp transfer",
      });
      setResult({ title: "Transfer Command", data: { transferCommand } });
    } catch (error: any) {
      setResult({ title: "Error", data: error?.message ?? "Unknown error" });
    }
  };

  const handleCreateTransactionChoiceCommand = async () => {
    if (!wallet) {
      setResult({ title: "Error", data: "Not connected" });
      return;
    }

    const pendingTransactions = (result?.data as any)?.pendingTransactions;
    if (!pendingTransactions || pendingTransactions.length === 0) {
      setResult({ title: "Error", data: "No pending transactions found" });
      return;
    }

    const choice = prompt("Enter choice (Accept, Reject, Withdraw):");
    if (!choice) return;

    try {
      const transactionChoiceCommand =
        await wallet.createTransactionChoiceCommand({
          transferContractId: pendingTransactions[0]?.contractId,
          choice: choice as TransactionInstructionChoice,
          instrument:
            pendingTransactions[0]?.interfaceViewValue?.transfer?.instrumentId,
        });
      setResult({
        title: "Transaction Choice Command",
        data: { transactionChoiceCommand },
      });
    } catch (error: any) {
      setResult({ title: "Error", data: error?.message ?? "Unknown error" });
    }
  };

  const handleSubmitTransactionCommand = async () => {
    if (!wallet) {
      setResult({ title: "Error", data: "Not connected" });
      return;
    }

    const transactionCommand =
      (result?.data as any)?.transferCommand ??
      (result?.data as any)?.transactionChoiceCommand;
    if (!transactionCommand) {
      setResult({ title: "Error", data: "No transfer command found" });
      return;
    }

    wallet.submitTransactionCommand(transactionCommand, (response) => {
      switch (response.type) {
        case SignRequestResponseType.SIGN_REQUEST_APPROVED:
          setResult({
            title: "Update ID",
            data: (response.data as SignRequestApprovedResponse).updateId,
          });
          break;
        case SignRequestResponseType.SIGN_REQUEST_REJECTED:
          setResult({
            title: "Error",
            data: (response.data as SignRequestRejectedResponse).reason,
          });
          break;
        case SignRequestResponseType.SIGN_REQUEST_ERROR:
          setResult({
            title: "Error",
            data: (response.data as SignRequestErrorResponse).error,
          });
          break;
        default:
          setResult({ title: "Error", data: "Unknown response type" });
          break;
      }
    });
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
            <button onClick={handleGetPendingTransactions}>
              Get Pending Transactions
            </button>
            <button onClick={handleSignMessage}>Sign Message</button>
            <button onClick={handleCreateTransferCommand}>
              Create Transfer Command
            </button>
            {result?.data?.pendingTransactions && (
              <button onClick={handleCreateTransactionChoiceCommand}>
                Create Transaction Choice Command
              </button>
            )}
            {(result?.data?.transferCommand ||
              result?.data?.transactionChoiceCommand) && (
              <button onClick={handleSubmitTransactionCommand}>
                Submit Transaction Command
              </button>
            )}
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

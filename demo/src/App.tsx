import { useEffect, useState } from "react";
import {
  zoro,
  SignRequestResponseType,
  SignRequestResponse,
  Wallet,
  SignRequestApprovedResponse,
  SignRequestRejectedResponse,
  SignRequestErrorResponse,
  TransactionInstructionChoice,
  loop
} from "@open-vector/zoro-sdk";

type ResultState = null | {
  title: string;
  data: any;
};

const transferInstrument_cc = {
  id: "Amulet",
  admin:
    "DSO::1220b1431ef217342db44d516bb9befde802be7d8899637d290895fa58880f19accc",
};
const transferInstrument_cbtc= {
      id: "CBTC",
      admin:
        "cbtc-network::12205af3b949a04776fc48cdcc05a060f6bda2e470632935f375d1049a8546a3b262",
    };

  
function App() {
  const [wallet, setWallet] = useState<Wallet | undefined>(undefined);
  const [walletChoice, setWalletChoice] = useState<"loop" | "zoro" | null>(null);
  const[walletChoiceModal,setWalletChoiceModal]=useState(false);

  const[transferInstrument,setTransferInstrument]=useState<typeof transferInstrument_cc>(transferInstrument_cc);
  const [status, setStatus] = useState<{ text: string; connected: boolean }>({
    text: "Not connected",
    connected: false,
  });
  const [result, setResult] = useState<ResultState>(null);
  const [raw_messageResult, setRaw_messageResult] = useState<ResultState>(null);
  const [txnsignResult, setTxnsignResult] = useState<ResultState>(null);
  const [getHoldingTransactionsresult, setGetHoldingTransactionsresult] =
    useState<ResultState>(null);
  const[createTransferCommandresult,setCreateTransferCommandresult]=useState<ResultState>(null);
  const[createTransactionChoiceCommandresult,setCreateTransactionChoiceCommandresult]=useState<ResultState>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [showSignModal, setShowSignModal] = useState(false);
  const [signMessage, setSignMessage] = useState("");
  const[showSubmitTransferModal,setShowSubmitTransferModal]=useState(false);
  const[showSubmitTransferChoiceModal,setShowSubmitTransferChoiceModal]=useState(false);
  const [showChoiceModal, setShowChoiceModal] = useState(false);
  const [transactionChoice, setTransactionChoice] =
    useState<TransactionInstructionChoice>("Accept");
  const [selectedPendingIndex, setSelectedPendingIndex] = useState<number | null>(
  null
);
const [showTransferModal, setShowTransferModal] = useState(false);
const [transferReceiver, setTransferReceiver] = useState("");
const [transferAmount, setTransferAmount] = useState("");
const [transferMemo, setTransferMemo] = useState("");
const [expandedTxnIndex, setExpandedTxnIndex] = useState<number | null>(null);

  useEffect(() => {
    loop.init({
    appName: 'My Awesome dApp',
    network: 'devnet', // or 'devnet', 'mainnet'
    options: {
        openMode: 'popup', // 'popup' (default) or 'tab'
        requestSigningMode: 'popup', // 'popup' (default) or 'tab'
        // redirectUrl: 'https://myapp.com/after-connect', // optional redirect after approval
    },
    onAccept: (connectedWallet: any) => {
         setWallet(connectedWallet);
        setStatus({ text: "Connected", connected: true });
        setIsConnecting(false);
        
    },
    onReject: () => {
        setStatus({ text: "Connection rejected", connected: false });
        setIsConnecting(false);
        setWallet(undefined);
        setResult(null);
    },
});
    zoro.init({
      appName: "Zoro SDK Demo",
      network: "mainnet",
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
      walletUrl: "http://canton-wallet-preview.vercel.app",
      apiUrl: "https://dev-api.zorowallet.com",
      
    });
    const handleUnload = () => {
    zoro.disconnect();
  };
    window.addEventListener("beforeunload", handleUnload);
   
  return () => {
    window.removeEventListener("beforeunload", handleUnload);
    zoro.disconnect();
  };



  });

 const handleConnect = async (choice?: "zoro" | "loop") => {
  setIsConnecting(true);
  setStatus({ text: "Connecting...", connected: false });

  try {
    if (choice === "zoro") {
      await zoro.connect();
      setWalletChoice("zoro");
    }

    if (choice === "loop") {
      await loop.connect();
      setWalletChoice("loop");
    }
  } catch (error: any) {
    setStatus({
      text: `Error: ${error?.message ?? "Unknown error"}`,
      connected: false,
    });
    setIsConnecting(false);
  }
};


  const handleDisconnect = () => {
    if(walletChoice=='loop'){
      loop.logout();
    }
    else if(walletChoice=="zoro"){
    zoro.disconnect();
  }
    setWallet(undefined);
    setStatus({ text: "Disconnected", connected: false });
    setResult(null);
  };

  const handleGetHoldingTransactions = async () => {
    if (!wallet) return;
    setLoadingAction("holding");
    if(walletChoice=="loop"){
      try {
      const holdingTransactions = await wallet.getHolding();
      console.log(holdingTransactions);
      setGetHoldingTransactionsresult({
        title: "Holding Transactions",
        data: holdingTransactions,
      });
    } catch (error: any) {
      setGetHoldingTransactionsresult({ title: "Error", data: error?.message ?? "Unknown error" });
    }
    setLoadingAction(null);
    return;
    }
    try {
      const holdingTransactions = await wallet.getHoldingTransactions();
      setGetHoldingTransactionsresult({
        title: "Holding Transactions",
        data: holdingTransactions.transactions,
      });
    } catch (error: any) {
      setGetHoldingTransactionsresult({ title: "Error", data: error?.message ?? "Unknown error" });
    }
    setLoadingAction(null);
  };

  const handleGetPendingTransactions = async () => {
    if (!wallet) return;
    setLoadingAction("pending");
    try {
      const pendingTransactions = await wallet.getPendingTransactions();
      setResult({
        title: "Pending Transactions",
        data: { pendingTransactions },
      });
    } catch (error: any) {
      setResult({ title: "Error", data: error?.message ?? "Unknown error" });
    }
    setLoadingAction(null);
  };

  const handleSignMessage = async () => {
    
    if (!wallet || !signMessage) return;
    setLoadingAction("sign");
    if (walletChoice=='loop'){
    try {
    const signature = await wallet.signMessage(signMessage);
   
    setRaw_messageResult({
            title: "Signature",
            data: signature.signature,
          });
} catch (error) {
    console.error('Signing failed:', error);
}}
    else if(walletChoice=='zoro'){
    wallet.signMessage(signMessage, (response: SignRequestResponse) => {
      switch (response.type) {
        case SignRequestResponseType.SIGN_REQUEST_APPROVED:
          setRaw_messageResult({
            title: "Signature",
            data: (response.data as SignRequestApprovedResponse).signature,
          });
          break;
        case SignRequestResponseType.SIGN_REQUEST_REJECTED:
          setRaw_messageResult({
            title: "Error",
            data: (response.data as SignRequestRejectedResponse).reason,
          });
          break;
        case SignRequestResponseType.SIGN_REQUEST_ERROR:
          setRaw_messageResult({
            title: "Error",
            data: (response.data as SignRequestErrorResponse).error,
          });
          break;
      }
      
    });}
    setLoadingAction(null);
      
    setSignMessage("");
  };

const handleCreateTransferCommand = async () => {
  if (!wallet) return;
  setLoadingAction("transfer");
  
 
  try {
     if(walletChoice=='loop'){
      
    setShowTransferModal(false);
    setShowSubmitTransferModal(true);
     setCreateTransferCommandresult({ title: "Transfer Command", data: "" });
    
  }
   else if(walletChoice=='zoro'){
    const transferCommand = await wallet.createTransferCommand({
      receiverPartyId: transferReceiver,
      amount: transferAmount,
      instrument: transferInstrument,
      memo: transferMemo,
    });
  setCreateTransferCommandresult({ title: "Transfer Command", data: { transferCommand } });}
    
    setShowTransferModal(false);
    setShowSubmitTransferModal(true);

   
  } catch (error: any) {
    setCreateTransferCommandresult({ title: "Error", data: error?.message ?? "Unknown error" });
  }
  setLoadingAction(null);
};


  const handleCreateTransactionChoiceCommand = async () => {
  if (!wallet) return;
  const pendingTransactions = (result?.data as any)?.pendingTransactions;
  if (
    selectedPendingIndex === null ||
    !pendingTransactions?.[selectedPendingIndex]
  )
    return;
  setLoadingAction("choice");
  try {
    const selectedTxn = pendingTransactions[selectedPendingIndex];
    const transactionChoiceCommand =
      await wallet.createTransactionChoiceCommand({
        transferContractId: selectedTxn.contractId,
        choice: transactionChoice,
        instrument:
          selectedTxn?.interfaceViewValue?.transfer?.instrumentId,
      });
    setCreateTransactionChoiceCommandresult({
      title: "Transaction Choice Command",
      data: { transactionChoiceCommand },
    });
  } catch (error: any) {
    setCreateTransactionChoiceCommandresult({ title: "Error", data: error?.message ?? "Unknown error" });
  }
  setLoadingAction(null);
  setShowChoiceModal(false);
  setShowSubmitTransferChoiceModal(true);
};

  const handleSubmitTransactionCommand = async () => {
    if (!wallet) return;
    if(walletChoice=='loop'){
      try {
        
      
      setLoadingAction("submit");
      const res=await wallet.transfer(transferReceiver,transferAmount,transferInstrument,{message: transferMemo});
      setTxnsignResult({
            title: "Submission id",
            data: res,
          });
     } catch (error: any) {
    setTxnsignResult({
    title: "error",
    data: error?.message ?? "Transaction rejected"
  });
}
return;

    }
    
    const transactionCommand =
      (createTransferCommandresult?.data as any)?.transferCommand 
    if (!transactionCommand) return;
    setLoadingAction("submit");
    wallet.submitTransactionCommand(transactionCommand, (response) => {
      switch (response.type) {
        case SignRequestResponseType.SIGN_REQUEST_APPROVED:
          setTxnsignResult({
            title: "Update ID",
            data: (response.data as SignRequestApprovedResponse).updateId,
          });
          break;
        case SignRequestResponseType.SIGN_REQUEST_REJECTED:
          setTxnsignResult({
            title: "Error",
            data: (response.data as SignRequestRejectedResponse).reason,
          });
          break;
        case SignRequestResponseType.SIGN_REQUEST_ERROR:
          setTxnsignResult({
            title: "Error",
            data: (response.data as SignRequestErrorResponse).error,
          });
          break;
      }
      setLoadingAction(null);
    });
    
  };
  const handleSubmitTransactionChoiceCommand = async () => {
    if (!wallet) return;
    const transactionCommand =
      (createTransactionChoiceCommandresult?.data as any)?.transactionChoiceCommand;
    if (!transactionCommand) return;
    setLoadingAction("submit");
    wallet.submitTransactionCommand(transactionCommand, (response) => {
      switch (response.type) {
        case SignRequestResponseType.SIGN_REQUEST_APPROVED:
          setTxnsignResult({
            title: "Update ID",
            data: (response.data as SignRequestApprovedResponse).updateId,
          });
          break;
        case SignRequestResponseType.SIGN_REQUEST_REJECTED:
          setTxnsignResult({
            title: "Error",
            data: (response.data as SignRequestRejectedResponse).reason,
          });
          break;
        case SignRequestResponseType.SIGN_REQUEST_ERROR:
          setTxnsignResult({
            title: "Error",
            data: (response.data as SignRequestErrorResponse).error,
          });
          break;
      }
      setLoadingAction(null);
      setShowSubmitTransferChoiceModal(false);
    });
  };
  

  const handleCancel = () => {
    setShowTransferModal(false);
    setCreateTransferCommandresult(null);
    setShowChoiceModal(false);
    setSelectedPendingIndex(null);
    setCreateTransactionChoiceCommandresult(null);
    setShowSubmitTransferModal(false);
  }

 return (
  <div className="min-h-screen bg-black text-gray-200 p-6">
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-semibold tracking-wide">Zoro SDK Demo</h1>

      <div
        className={`p-4 rounded-xl border ${
          status.connected
            ? "bg-[#0f1a14] border-green-800 text-green-400"
            : "bg-[#111] border-gray-800 text-gray-400"
        }`}
      >
        {status.text}
      </div>

      <div className="flex gap-3">
        <button
          onClick={()=>setWalletChoiceModal(true)}
          disabled={status.connected || isConnecting}
          className="px-4 py-2 rounded-xl bg-[#c8a15a] text-black font-medium disabled:opacity-50"
        >
          {isConnecting ? "Connecting..." : "Connect"}
        </button>
        <button
          onClick={handleDisconnect}
          disabled={!status.connected}
          className="px-4 py-2 rounded-xl bg-[#1a1a1a] border border-gray-700 disabled:opacity-50"
        >
          Disconnect
        </button>
      </div>
{walletChoiceModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl">
      
      <div className="mb-4 text-center">
        <h2 className="text-lg font-semibold text-white">
          Connect Wallet
        </h2>
        <p className="mt-1 text-sm text-gray-400">
          Choose a wallet to continue
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => {
            setWalletChoiceModal(false)
            handleConnect("zoro")
          }}
          className="group flex w-full items-center gap-3 rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-3 transition hover:border-red-500/50 hover:bg-[#161616]"
        >
          <img
            src="https://zorowallet.com/favicon.ico"
            alt="Zoro Wallet"
            className="h-8 w-8 rounded-md"
          />
          <div className="flex flex-col text-left">
            <span className="font-medium text-white">Zoro Wallet</span>
           
          </div>
          <span className="ml-auto text-gray-500 group-hover:text-white">
            →
          </span>
        </button>

        <button
          onClick={() => {
            setWalletChoiceModal(false)
            handleConnect("loop")
          }}
          className="group flex w-full items-center gap-3 rounded-xl border border-gray-700 bg-[#1a1a1a] px-4 py-3 transition hover:border-red-500/50 hover:bg-[#161616]"
        >
          <img
            src="https://cantonloop.com/favicon.ico"
            alt="Loop Wallet"
            className="h-8 w-8 rounded-md"
          />
          <div className="flex flex-col text-left">
            <span className="font-medium text-white">Loop Wallet</span>
           
          </div>
          <span className="ml-auto text-gray-500 group-hover:text-white">
            →
          </span>
        </button>
      </div>
      <div className="mt-5 flex justify-center">
        <button
          onClick={() => setWalletChoiceModal(false)}
          className="text-sm text-gray-400 hover:text-white transition"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}




      {status.connected && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <button onClick={() => setShowSignModal(true)} className="btn bg-[#1a1a1a] border border-gray-800 rounded-xl">
            Sign Message
          </button>
          <button onClick={handleGetHoldingTransactions} className="btn bg-[#1a1a1a] border border-gray-800 rounded-xl">
            {loadingAction === "holding" ? "Loading..." : "Holding"}
          </button>
          <button onClick={handleGetPendingTransactions} className="btn bg-[#1a1a1a] border border-gray-800 rounded-xl">
            {loadingAction === "pending" ? "Loading..." : "Pending"}
          </button>
          <button onClick={() => setShowTransferModal(true)} className="btn bg-[#1a1a1a] border border-gray-800 rounded-xl">
            Create Transfer
          </button>
        </div>
      )}

      {result?.data?.pendingTransactions && (
        <div className="space-y-4">
          {(result.data as any).pendingTransactions.map(
            (ptxn: any, index: number) => {
              const transfer =
                ptxn?.activeContract?.createdEvent?.createArgument?.transfer;
              return (
                <div
                  key={ptxn.contractId}
                  className={`cursor-pointer rounded-2xl p-5 border bg-gradient-to-b from-[#141414] to-[#0c0c0c] ${
                    selectedPendingIndex === index
                      ? "border-[#c8a15a]"
                      : "border-gray-800"
                  }`}
                  onClick={() => {
                    setSelectedPendingIndex(index);
                    setShowChoiceModal(true);
                  }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <div className="text-sm text-gray-400">Receiving</div>
                      <div className="text-yellow-400 text-sm">Pending</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-semibold">
                        +{transfer?.amount}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-400 space-y-1">
                    <div>From: {transfer?.sender}</div>
                    <div>To: {transfer?.receiver}</div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTxnIndex(
                        expandedTxnIndex === index ? null : index
                      );
                    }}
                    className="mt-3 text-xs text-[#c8a15a]"
                  >
                    {expandedTxnIndex === index
                      ? "Hide Raw Details"
                      : "Show Raw Details"}
                  </button>

                  {expandedTxnIndex === index && (
                    <pre className="mt-2 text-xs bg-black border border-gray-800 rounded-xl p-3 overflow-x-auto">
                      {JSON.stringify(ptxn, null, 2)}
                    </pre>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}
    </div>

    {showSignModal && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
        <div className="bg-[#0f0f0f] p-6 rounded-2xl space-y-4 w-full max-w-md border border-gray-800">
          <h2 className="text-lg font-semibold">Sign Message</h2>
          <input
            value={signMessage}
            onChange={(e) => setSignMessage(e.target.value)}
            className="w-full bg-black border border-gray-800 p-2 rounded-xl"
            placeholder="Message"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowSignModal(false)}
              className="px-3 py-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSignMessage}
              className="px-3 py-1 bg-[#c8a15a] text-black rounded-xl"
            >
              {loadingAction === "sign" ? "Signing..." : "Sign"}
            </button>
          </div>
        {raw_messageResult && (
  <div className={`border p-4 rounded-xl ${
    raw_messageResult.title === "Signature" 
      ? "bg-green-500/10 border-green-800" 
      : "bg-red-500/10 border-red-800"
  }`}>
    <div className="flex items-center gap-2 mb-3">
      {raw_messageResult.title === "Signature" ? (
        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <div className="text-sm font-semibold">{raw_messageResult.title}</div>
    </div>
    {raw_messageResult.title === "Signature" ? (
      <div className="font-mono text-xs break-all text-green-400 bg-black/50 p-3 rounded-lg">
        {raw_messageResult.data}
      </div>
    ) : (
      <div className="text-sm text-red-400">
        {typeof raw_messageResult.data === 'string' 
          ? raw_messageResult.data 
          : JSON.stringify(raw_messageResult.data, null, 2)}
      </div>
    )}
  </div>
    )}
        </div>
      </div>
    )}
{showTransferModal && (
  <div
    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
    onClick={handleCancel}
  >
    <div
      className="bg-[#0f0f0f] p-6 rounded-2xl space-y-4 w-full max-w-md border border-gray-800"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-lg font-semibold">Create Transfer</h2>

      <div className="inline-flex rounded-xl border border-gray-700 bg-black p-1">
        <button
          onClick={() => setTransferInstrument(transferInstrument_cc)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
            transferInstrument.id === transferInstrument_cc.id
              ? "bg-[#c8a15a] text-black"
              : "text-gray-400 hover:text-white"
          }`}
        >
          CC
        </button>
        <button
          onClick={() => setTransferInstrument(transferInstrument_cbtc)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
            transferInstrument.id === transferInstrument_cbtc.id
              ? "bg-[#c8a15a] text-black"
              : "text-gray-400 hover:text-white"
          }`}
        >
          CBTC
        </button>
      </div>

      <input
        value={transferReceiver}
        onChange={(e) => setTransferReceiver(e.target.value)}
        className="w-full bg-black border border-gray-800 p-2 rounded-xl"
        placeholder="Receiver Party ID"
      />

      <div className="relative">
        <input
          value={transferAmount}
          onChange={(e) => setTransferAmount(e.target.value)}
          className="w-full bg-black border border-gray-800 p-2 pr-14 rounded-xl"
          placeholder="Amount"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
          {transferInstrument.id === transferInstrument_cc.id ? "CC" : "CBTC"}
        </span>
      </div>


      <input
        value={transferMemo}
        onChange={(e) => setTransferMemo(e.target.value)}
        className="w-full bg-black border border-gray-800 p-2 rounded-xl"
        placeholder="Memo"
      />

      <div className="flex justify-end gap-2">
        <button onClick={()=>handleCancel()}>Cancel</button>
        <button
          onClick={handleCreateTransferCommand}
          disabled={
            !transferReceiver ||
            !transferAmount ||
            loadingAction === "transfer"
          }
          className="px-3 py-1 bg-[#c8a15a] text-black rounded-xl disabled:opacity-50"
        >
          {loadingAction === "transfer" ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  </div>
)}
{showSubmitTransferModal && createTransferCommandresult && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div
      className="bg-[#0f0f0f] p-6 rounded-2xl space-y-4 w-full max-w-md border border-gray-800 max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-lg font-semibold">Submit Transfer</h2>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Instrument</span>
          <span>{transferInstrument.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Receiver</span>
          <span className="truncate max-w-[220px]">
            {transferReceiver}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Amount</span>
          <span>{transferAmount}</span>
        </div>
        {transferMemo && (
          <div className="flex justify-between">
            <span className="text-gray-400">Memo</span>
            <span className="truncate max-w-[220px]">
              {transferMemo}
            </span>
          </div>
        )}
      </div>

      <details className="border border-gray-800 rounded-xl">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
          Show raw transfer command
        </summary>
        <pre className="text-xs p-3 overflow-x-auto bg-black border-t border-gray-800 rounded-b-xl">
          {JSON.stringify(
            createTransferCommandresult.data,
            null,
            2
          )}
        </pre>
      </details>

      <div className="flex justify-end gap-2">
        <button onClick={handleCancel}>
          Cancel
        </button>
        <button
          onClick={handleSubmitTransactionCommand}
          disabled={loadingAction === "submit"}
          className="px-3 py-1 bg-[#c8a15a] text-black rounded-xl disabled:opacity-50"
        >
          {loadingAction === "submit"
            ? "Submitting..."
            : "Submit Transfer"}
        </button>
      </div>
    </div>
  </div>
)}




{showChoiceModal && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div
      className="bg-[#0f0f0f] p-6 rounded-2xl space-y-4 w-full max-w-md border border-gray-800 max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-lg font-semibold">Transaction Choice</h2>

      <select
        value={transactionChoice}
        onChange={(e) =>
          setTransactionChoice(
            e.target.value as TransactionInstructionChoice
          )
        }
        className="w-full bg-black border border-gray-800 p-2 rounded-xl"
      >
        <option value="Accept">Accept</option>
        <option value="Reject">Reject</option>
        <option value="Withdraw">Withdraw</option>
      </select>

      <div className="flex justify-end gap-2">
        <button onClick={() => handleCancel()} className="px-3 py-1">
          Cancel
        </button>

        <button
          onClick={handleCreateTransactionChoiceCommand}
          disabled={selectedPendingIndex === null || loadingAction === "choice"}
          className="px-3 py-1 bg-[#c8a15a] text-black rounded-xl disabled:opacity-50"
        >
          {loadingAction === "choice" ? "Processing..." : "Confirm"}
        </button>
      </div>
    </div>
  </div>
)}

{showSubmitTransferChoiceModal && createTransactionChoiceCommandresult && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div
      className="bg-[#0f0f0f] p-6 rounded-2xl space-y-4 w-full max-w-md border border-gray-800 max-h-[80vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-black border border-gray-800 p-3 rounded-xl">
        <div className="text-sm font-semibold mb-2">
          Transaction Choice Command Prepared
        </div>
        <pre className="text-xs overflow-x-auto">
          {JSON.stringify(
            createTransactionChoiceCommandresult.data,
            null,
            2
          )}
        </pre>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => handleCancel()} className="px-3 py-1">
          Cancel
        </button>

        <button
          onClick={handleSubmitTransactionChoiceCommand}
          disabled={loadingAction === "submit"}
          className="px-3 py-1 bg-[#c8a15a] text-black rounded-xl disabled:opacity-50"
        >
          {loadingAction === "submit"
            ? "Submitting..."
            : "Submit Choice Command"}
        </button>
      </div>
    </div>
  </div>
)}

    {getHoldingTransactionsresult && (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
        <div className="bg-[#0f0f0f] p-6 rounded-2xl space-y-4 w-full max-w-4xl max-h-[80vh] overflow-y-auto border border-gray-800">
          <h2 className="text-lg font-semibold">Holding Transactions</h2>
          
          <div className="space-y-4">
            {getHoldingTransactionsresult.data?.map((txn: any, index: number) => (
              <div key={index} className="bg-black border border-gray-800 p-4 rounded-xl">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(txn, null, 2)}
                </pre>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setGetHoldingTransactionsresult(null)}
              className="px-3 py-1"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}

{txnsignResult && (
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
    <div className="bg-[#0f0f0f] p-6 rounded-2xl space-y-4 w-full max-w-md border border-gray-800">
      <div className="flex items-center gap-3">
        {txnsignResult.title === "Update ID"||"Submission id" ? (
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
        <h2 className="text-lg font-semibold">
          {txnsignResult.title === "Update ID" ? "Transaction Submitted" : txnsignResult.title}
        </h2>
      </div>

      <div className="bg-black border border-gray-800 p-4 rounded-xl">
        {txnsignResult.title === "Update ID"||"Submission id" ? (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Update ID</div>
            <div className="font-mono text-sm break-all text-green-400">
              {txnsignResult.data}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-gray-400">Error Details</div>
            <div className="text-sm text-red-400">
              {typeof txnsignResult.data === 'string' 
                ? txnsignResult.data 
                : JSON.stringify(txnsignResult.data, null, 2)}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            setTxnsignResult(null);
            setShowSubmitTransferModal(false);
            setShowSubmitTransferChoiceModal(false);
            setCreateTransferCommandresult(null);
            setCreateTransactionChoiceCommandresult(null);
          }}
          className="px-4 py-2 bg-[#c8a15a] text-black rounded-xl font-medium"
        >
          Done
        </button>
      </div>
    </div>
  </div>
)}
  </div>
);}

export default App;
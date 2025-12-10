# @openvector/zoro-sdk

Zoro SDK for client-side applications to connect to Zoro Wallet.

## Installation

```bash
npm install @openvector/zoro-sdk
```

## Quick Start

```typescript
import { zoro } from '@openvector/zoro-sdk';

// Initialize the SDK
zoro.init({
  appName: 'My App',
  network: 'mainnet',
  onAccept: (wallet) => {
    console.log('Connected!', wallet);
    // Use wallet to interact with Zoro Wallet
  },
  onReject: () => {
    console.log('Connection rejected');
  },
  onDisconnect: () => {
    console.log('Disconnected');
  }
});

// Connect to wallet
await zoro.connect();
```

## Configuration

### Network Options

- `mainnet` or `main` - Main network (default)
- `testnet` or `test` - Test network
- `devnet` or `dev` - Development network
- `local` - Local development

### Initialization Options

```typescript
zoro.init({
  appName: string,                    // Your application name (required)
  network?: string,                    // Network to connect to (default: 'main')
  walletUrl?: string,                  // Custom wallet URL
  apiUrl?: string,                     // Custom API URL
  onAccept?: (wallet: Wallet) => void, // Callback when connection is accepted
  onReject?: () => void,               // Callback when connection is rejected
  onDisconnect?: () => void,           // Callback when wallet disconnects
  options?: {
    openMode?: 'popup' | 'redirect',   // How to open wallet (default: 'popup')
  }
});
```

## Usage

### Connecting to Wallet

```typescript
await zoro.connect();
```

This will:
1. Check for existing connection in localStorage
2. If no connection exists, create a new ticket and show QR code
3. Wait for wallet approval via WebSocket
4. Call `onAccept` callback with wallet instance when connected

### Disconnecting

```typescript
zoro.disconnect();
```

This will disconnect from the wallet and clear the connection state.

### Using the Wallet

Once connected, you'll receive a `Wallet` instance in the `onAccept` callback:

```typescript
zoro.init({
  appName: 'My App',
  onAccept: async (wallet) => {
    // Get holding transactions
    const { transactions, nextOffset } = await wallet.getHoldingTransactions();
    console.log('Transactions:', transactions);

    // Get pending transactions
    const pending = await wallet.getPendingTransactions();
    console.log('Pending:', pending);

    // Get holding UTXOs
    const utxos = await wallet.getHoldingUtxos();
    console.log('UTXOs:', utxos);

    // Get active contracts by interface ID
    const contracts = await wallet.getActiveContractsByInterfaceId('interface-id');
    console.log('Contracts:', contracts);

    // Get active contracts by template ID
    const templateContracts = await wallet.getActiveContractsByTemplateId('template-id');
    console.log('Template Contracts:', templateContracts);

    // Sign a message
    wallet.signMessage('Hello, Zoro!', (response) => {
      if (response.type === SignRequestResponseType.SIGN_REQUEST_APPROVED) {
        console.log('Signature:', response.data.signature);
      } else if (response.type === SignRequestResponseType.SIGN_REQUEST_REJECTED) {
        console.log('Request rejected:', response.data.reason);
      }
    });

    // Create and submit a transfer command
    const transferCommand = await wallet.createTransferCommand({
      receiverPartyId: 'receiver-party-id',
      amount: '10',
      instrument: {
        id: 'Amulet',
        admin: 'DSO::1220b1431ef217342db44d516bb9befde802be7d8899637d290895fa58880f19accc'
      },
      memo: 'Payment for services'
    });

    wallet.submitTransactionCommand(transferCommand, (response) => {
      if (response.type === SignRequestResponseType.SIGN_REQUEST_APPROVED) {
        console.log('Transaction submitted:', response.data.updateId);
      }
    });
  }
});
```

## Wallet API

### Methods

#### `getHoldingTransactions()`

Get holding transactions for the connected wallet.

```typescript
const { transactions, nextOffset } = await wallet.getHoldingTransactions();
```

Returns:
- `transactions`: Array of transaction objects
- `nextOffset`: Offset for pagination

#### `getPendingTransactions()`

Get pending transactions.

```typescript
const pending = await wallet.getPendingTransactions();
```

#### `getHoldingUtxos()`

Get holding UTXOs (Unspent Transaction Outputs).

```typescript
const utxos = await wallet.getHoldingUtxos();
```

#### `getActiveContractsByInterfaceId(interfaceId: string)`

Get active contracts filtered by interface ID.

```typescript
const contracts = await wallet.getActiveContractsByInterfaceId('interface-id');
```

#### `getActiveContractsByTemplateId(templateId: string)`

Get active contracts filtered by template ID.

```typescript
const contracts = await wallet.getActiveContractsByTemplateId('template-id');
```

#### `createTransferCommand(params: CreateTransferCommandParams)`

Create a transfer command.

```typescript
const transferCommand = await wallet.createTransferCommand({
  receiverPartyId: string,
  amount: string,
  instrument: {
    id: string,
    admin: string
  },
  memo?: string,
  expiryDate?: string  // ISO Date String, defaults to 24 hours from now
});
```

#### `createTransactionChoiceCommand(params: CreateTransactionChoiceCommandParams)`

Create a transaction choice command.

```typescript
const choiceCommand = await wallet.createTransactionChoiceCommand({
  transferContractId: string,
  choice: 'Accept' | 'Reject' | 'Withdraw',
  instrument: {
    id: string,
    admin: string
  }
});
```

#### `submitTransactionCommand(transactionCommand: TransactionCommand, onResponse: (response: SignRequestResponse) => void)`

Submit a transaction command for signing.

```typescript
wallet.submitTransactionCommand(transferCommand, (response) => {
  switch (response.type) {
    case SignRequestResponseType.SIGN_REQUEST_APPROVED:
      console.log('Update ID:', response.data.updateId);
      break;
    case SignRequestResponseType.SIGN_REQUEST_REJECTED:
      console.log('Rejected:', response.data.reason);
      break;
    case SignRequestResponseType.SIGN_REQUEST_ERROR:
      console.log('Error:', response.data.error);
      break;
  }
});
```

#### `signMessage(message: string, onResponse: (response: SignRequestResponse) => void)`

Sign a raw message.

```typescript
wallet.signMessage('Message to sign', (response) => {
  switch (response.type) {
    case SignRequestResponseType.SIGN_REQUEST_APPROVED:
      console.log('Signature:', response.data.signature);
      break;
    case SignRequestResponseType.SIGN_REQUEST_REJECTED:
      console.log('Rejected:', response.data.reason);
      break;
    case SignRequestResponseType.SIGN_REQUEST_ERROR:
      console.log('Error:', response.data.error);
      break;
  }
});
```

### Wallet Properties

- `partyId`: Party ID of the connected wallet
- `publicKey`: Public key of the wallet
- `email`: Email address (if available)
- `authToken`: Authentication token

## Types

### SignRequestResponseType

Enum for sign request response types:

```typescript
enum SignRequestResponseType {
  SIGN_REQUEST_APPROVED = "sign_request_approved",
  SIGN_REQUEST_REJECTED = "sign_request_rejected",
  SIGN_REQUEST_ERROR = "sign_request_error"
}
```

### SignRequestResponse

Response object for sign requests:

```typescript
interface SignRequestResponse {
  type: SignRequestResponseType;
  data: SignRequestApprovedResponse | SignRequestRejectedResponse | SignRequestErrorResponse;
}
```

### Instrument

Instrument interface for transfers:

```typescript
interface Instrument {
  id: string;
  admin: string;
}
```

### CreateTransferCommandParams

Parameters for creating a transfer command:

```typescript
interface CreateTransferCommandParams {
  receiverPartyId: string;
  amount: string;
  instrument: Instrument;
  memo?: string;
  expiryDate?: string;  // ISO Date String
}
```

### TransactionCommand

Transaction command object:

```typescript
interface TransactionCommand {
  command: any;
  disclosedContracts: any[];
}
```

## Examples

### React Example

```typescript
import { useEffect, useState } from 'react';
import { zoro, SignRequestResponseType } from '@openvector/zoro-sdk';

function App() {
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    zoro.init({
      appName: 'My React App',
      network: 'mainnet',
      onAccept: (wallet) => {
        setWallet(wallet);
      },
      onReject: () => {
        console.log('Connection rejected');
      },
      onDisconnect: () => {
        setWallet(null);
      }
    });
  }, []);

  const handleConnect = async () => {
    await zoro.connect();
  };

  const handleSign = () => {
    if (!wallet) return;
    
    wallet.signMessage('Hello!', (response) => {
      if (response.type === SignRequestResponseType.SIGN_REQUEST_APPROVED) {
        console.log('Signed:', response.data.signature);
      }
    });
  };

  return (
    <div>
      {!wallet && (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
      {wallet && (
        <button onClick={handleSign}>Sign Message</button>
      )}
    </div>
  );
}
```

### Vanilla JavaScript Example

```javascript
import { zoro, SignRequestResponseType } from '@openvector/zoro-sdk';

let wallet = null;

zoro.init({
  appName: 'My App',
  network: 'mainnet',
  onAccept: (connectedWallet) => {
    wallet = connectedWallet;
    console.log('Connected!', wallet);
  },
  onDisconnect: () => {
    wallet = null;
    console.log('Disconnected');
  }
});

// Connect when button is clicked
document.getElementById('connectBtn').addEventListener('click', async () => {
  await zoro.connect();
});

// Sign message
document.getElementById('signBtn').addEventListener('click', () => {
  if (!wallet) return;
  
  wallet.signMessage('Hello!', (response) => {
    if (response.type === SignRequestResponseType.SIGN_REQUEST_APPROVED) {
      console.log('Signature:', response.data.signature);
    }
  });
});
```

## Browser Support

This SDK requires:
- Modern browsers with WebSocket support
- ES2020+ support
- LocalStorage API

## License

ISC

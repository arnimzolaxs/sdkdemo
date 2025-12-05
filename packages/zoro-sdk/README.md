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
  onAccept: (provider) => {
    console.log('Connected!', provider);
    // Use provider to interact with wallet
  },
  onReject: () => {
    console.log('Connection rejected');
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
  appName: string,           // Your application name
  network?: string,          // Network to connect to (default: 'main')
  walletUrl?: string,        // Custom wallet URL
  apiUrl?: string,           // Custom API URL
  onAccept?: (provider) => void,  // Callback when connection is accepted
  onReject?: () => void,    // Callback when connection is rejected
  options?: {
    openMode?: 'popup' | 'redirect',  // How to open wallet (default: 'popup')
    redirectUrl?: string,    // Redirect URL for redirect mode
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
4. Call `onAccept` callback with provider when connected

### Using the Provider

Once connected, you'll receive a `Provider` instance in the `onAccept` callback:

```typescript
zoro.init({
  appName: 'My App',
  onAccept: async (provider) => {
    // Get account holdings
    const holdings = await provider.getHolding();
    console.log('Holdings:', holdings);

    // Get active contracts
    const contracts = await provider.getActiveContracts();
    console.log('Contracts:', contracts);

    // Get contracts by template ID
    const templateContracts = await provider.getActiveContracts({
      templateId: 'template-id'
    });

    // Sign a message
    provider.signMessage('Hello, Zoro!', (signature) => {
      console.log('Signature:', signature);
    });

    // Submit a transaction
    await provider.submitTransaction({
      // transaction payload
    });
  }
});
```

### Provider Methods

#### `getHolding()`

Get account holdings.

```typescript
const holdings = await provider.getHolding();
```

#### `getActiveContracts(params?)`

Get active contracts for the account.

```typescript
// Get all active contracts
const contracts = await provider.getActiveContracts();

// Filter by template ID
const contracts = await provider.getActiveContracts({
  templateId: 'template-id'
});

// Filter by interface ID
const contracts = await provider.getActiveContracts({
  interfaceId: 'interface-id'
});
```

#### `signMessage(message, callback)`

Sign a raw message.

```typescript
provider.signMessage('Message to sign', (signature) => {
  console.log('Signature:', signature);
});
```

#### `submitTransaction(payload)`

Submit a transaction.

```typescript
await provider.submitTransaction({
  txn: {
    // transaction data
  }
});
```

## API Reference

### Classes

#### `ZoroSDK`

Main SDK class. A singleton instance `zoro` is exported by default.

**Methods:**

- `init(options)` - Initialize the SDK
- `connect()` - Connect to wallet
- `openWallet(url)` - Open wallet in popup or new tab
- `showQrCode(url)` - Display QR code overlay
- `hideQrCode()` - Hide QR code overlay

#### `Provider`

Provider instance returned after successful connection.

**Properties:**

- `party_id` - Party ID
- `public_key` - Public key
- `email` - Email (if available)
- `auth_token` - Authentication token
- `connection` - Connection instance

**Methods:**

- `getHolding()` - Get account holdings
- `getActiveContracts(params?)` - Get active contracts
- `signMessage(message, callback)` - Sign a message
- `submitTransaction(payload)` - Submit a transaction

#### `Connection`

Connection management class.

**Methods:**

- `getTicket(appName, sessionId, version?)` - Get connection ticket
- `getHolding(authToken)` - Get holdings
- `getActiveContracts(authToken, params?)` - Get active contracts
- `verifySession(authToken)` - Verify session
- `connectWebSocket(ticketId, onMessage)` - Connect WebSocket

### Types

#### `MessageType`

Enum of message types:

- `HANDSHAKE_ACCEPT`
- `HANDSHAKE_REJECT`
- `RUN_TRANSACTION`
- `RUN_TRANSACTION_RESPONSE`
- `SIGN_RAW_MESSAGE`
- `SIGN_RAW_MESSAGE_RESPONSE`
- `REJECT_REQUEST`

### Errors

#### `RequestTimeoutError`

Thrown when a request times out.

#### `RejectRequestError`

Thrown when a request is rejected by the wallet.

## Examples

### React Example

```typescript
import { useEffect, useState } from 'react';
import { zoro, Provider } from '@openvector/zoro-sdk';

function App() {
  const [provider, setProvider] = useState<Provider | null>(null);

  useEffect(() => {
    zoro.init({
      appName: 'My React App',
      network: 'mainnet',
      onAccept: (provider) => {
        setProvider(provider);
      },
      onReject: () => {
        console.log('Connection rejected');
      }
    });
  }, []);

  const handleConnect = async () => {
    await zoro.connect();
  };

  const handleSign = () => {
    if (!provider) return;
    provider.signMessage('Hello!', (signature) => {
      console.log('Signed:', signature);
    });
  };

  return (
    <div>
      {!provider && (
        <button onClick={handleConnect}>Connect Wallet</button>
      )}
      {provider && (
        <button onClick={handleSign}>Sign Message</button>
      )}
    </div>
  );
}
```

### Vanilla JavaScript Example

```javascript
import { zoro } from '@openvector/zoro-sdk';

zoro.init({
  appName: 'My App',
  network: 'mainnet',
  onAccept: async (provider) => {
    console.log('Connected!', provider);
    
    // Get holdings
    const holdings = await provider.getHolding();
    console.log('Holdings:', holdings);
  }
});

// Connect when button is clicked
document.getElementById('connectBtn').addEventListener('click', async () => {
  await zoro.connect();
});
```

## Browser Support

This SDK requires:
- Modern browsers with WebSocket support
- ES2020+ support
- LocalStorage API

## License

ISC


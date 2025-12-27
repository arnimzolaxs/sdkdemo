# Zoro SDK

TypeScript SDK package for client-side applications.

## Project Structure

```
zoro_sdk/
├── packages/
│   └── zoro-sdk/          # Main package
└── demo/                  # Demo web app
```
## Demo web app link
  -[http://34.60.156.152/]

## Development

### Install Dependencies

This project uses [pnpm](https://pnpm.io/) for package management. Install pnpm first if you haven't:

```bash
npm install -g pnpm
```

Then install dependencies:

```bash
pnpm install
```

### Build Package

```bash
pnpm run build
```

This will build the package in `packages/zoro-sdk/dist/` with both ESM and CommonJS outputs.

### Run Demo

```bash
pnpm run dev
```

This will start the React demo app at `http://localhost:3000`.

## Package Usage

```typescript
import { zoro } from '@open-vector/zoro-sdk';

zoro.init({
  appName: 'My App',
  network: 'mainnet',
  onAccept: (wallet) => {
    console.log('Connected!', wallet);
  }
});

await zoro.connect();
```

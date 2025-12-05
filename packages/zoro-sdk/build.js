import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));

const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const baseConfig = {
  entryPoints: [join(__dirname, 'src/index.ts')],
  bundle: true,
  external,
  sourcemap: true,
  minify: false,
  target: 'es2020',
  platform: 'browser',
};

// Build ESM
await esbuild.build({
  ...baseConfig,
  format: 'esm',
  outfile: join(__dirname, 'dist/index.js'),
});

// Build CommonJS
await esbuild.build({
  ...baseConfig,
  format: 'cjs',
  outfile: join(__dirname, 'dist/index.cjs'),
});

console.log('Build completed successfully!');


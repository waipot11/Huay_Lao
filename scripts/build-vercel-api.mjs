import { build } from 'esbuild';
import path from 'path';

const rootDir = process.cwd();

await build({
  entryPoints: [path.join(rootDir, 'src/server/app.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  packages: 'external',
  outfile: path.join(rootDir, 'api/_server.cjs'),
  sourcemap: false,
  logLevel: 'info',
});

import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const withMDX = createMDX({
  outDir: fileURLToPath(new URL('./.source', import.meta.url)),
});

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  basePath: '/guide',
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  }
};

export default withMDX(config);

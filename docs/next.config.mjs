import { createMDX } from 'fumadocs-mdx/next';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  turbopack: {
    root: fileURLToPath(new URL('..', import.meta.url)),
  },
};

const withMDX = createMDX();

export default withMDX(config);

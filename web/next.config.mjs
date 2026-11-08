// GITHUB_PAGES=true builds a static site for GitHub Pages (see .github/workflows/pages.yml).
// Pages has no server, so that build drops the recap API and the chronicle uses the plain ledger version.
const isPages = process.env.GITHUB_PAGES === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(isPages
    ? {
        output: "export",
        basePath: process.env.PAGES_BASE_PATH || "",
        trailingSlash: true,
      }
    : {}),
  webpack: (config, { isServer }) => {
    // Anchor and web3.js reference a few Node modules they never use in the browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;

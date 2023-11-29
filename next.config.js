/** @type {import('next').NextConfig} */
const nextConfig = {
  // To enable a static export
  output: 'export',

  // Optional: Change links `/me` -> `/me/` and emit `/me.html` -> `/me/index.html`
  trailingSlash: true,
  swcMinify: true,

  // prevent double rerendering
  reactStrictMode: false,

  // required by connectkit: https://docs.family.co/connectkit/getting-started#getting-started-nextjs
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty');
    return config;
  },
};

module.exports = nextConfig;

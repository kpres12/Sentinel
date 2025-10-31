/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_MQTT_WS_URL: process.env.NEXT_PUBLIC_MQTT_WS_URL || 'ws://localhost:8083/mqtt',
    NEXT_PUBLIC_FEATURE_FLAGS_URL: process.env.NEXT_PUBLIC_FEATURE_FLAGS_URL || '/config/flags.json',
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
}

module.exports = nextConfig

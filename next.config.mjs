/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: 10 * 1024 * 1024,  // Changed from maxRequestBodySize to bodySizeLimit
    },
  },
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com'
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com'
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 添加输出文件跟踪根目录配置，解决多个 lockfile 警告
  outputFileTracingRoot: process.cwd(),
  
  // 简化的 Webpack 配置来处理 node: 协议
  webpack: (config, { isServer }) => {
    // 只在服务器端处理 Google Cloud 相关的包
    if (isServer) {
      // 服务器端：允许使用 Node.js 内置模块
      config.externals = config.externals || [];
      config.externals.push({
        '@google-cloud/firestore': 'commonjs @google-cloud/firestore',
        '@google-cloud/storage': 'commonjs @google-cloud/storage',
        '@google-cloud/text-to-speech': 'commonjs @google-cloud/text-to-speech',
      });
    } else {
      // 客户端：完全排除 Google Cloud 包
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
        os: false,
        path: false,
        // 完全禁用 Google Cloud 相关包在客户端的使用
        '@google-cloud/firestore': false,
        '@google-cloud/storage': false,
        '@google-cloud/text-to-speech': false,
      };
    }

    return config;
  },
};

export default nextConfig;

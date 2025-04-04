/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // ...
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },


  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.aceternity.com",
        port: "",
      },
      {
        protocol: "https",
        hostname: "t.me",
        port: "",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
      },
    ],
  },
};

export default nextConfig;

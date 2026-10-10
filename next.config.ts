import type { NextConfig } from "next";
import path from "node:path";
const nextConfig: NextConfig = {
  webpack(config, { webpack }) {
    const runtime = path.resolve(process.cwd(), "lib/runtime-node.ts");
    config.resolve.alias["@runtime"] = runtime;
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /(?:^@runtime$|runtime-cloudflare(?:\.ts)?$)/,
        runtime,
      ),
    );
    return config;
  },
  serverExternalPackages: ["@neondatabase/serverless"],
};
export default nextConfig;

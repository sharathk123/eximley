import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ['@xenova/transformers', 'onnxruntime-node', 'pdfkit'],

};

export default nextConfig;

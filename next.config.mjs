/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // pdf-parse (v2) wraps pdfjs-dist and ships the native @napi-rs/canvas binary.
  // Bundling it breaks pdfjs's dynamic worker import ("Cannot find module
  // pdf.worker.mjs") and can't handle the .node binary. Externalizing lets it
  // run as a plain Node require in the API route, where both resolve correctly.
  serverExternalPackages: ['pdf-parse'],
}

export default nextConfig

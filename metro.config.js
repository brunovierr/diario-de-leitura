const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// SQLite on web loads WebAssembly and uses SharedArrayBuffer.
config.resolver.assetExts.push('wasm');
const enhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const handler = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    return handler(req, res, next);
  };
};

module.exports = config;

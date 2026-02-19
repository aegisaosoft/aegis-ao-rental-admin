const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://localhost:7163',
      changeOrigin: true,
      secure: false, // разрешить self-signed сертификат
    })
  );
};

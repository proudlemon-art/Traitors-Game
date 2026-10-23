import app from './src/server/app.ts';
import http from 'http';
import path from 'path';
import express from 'express';

const server = http.createServer(app);
const port = parseInt(process.env.PORT || '3000', 10);

// Development vs Production Server Entry
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
    server.listen(port, '0.0.0.0', () => {
      console.log(`🏰 Traitors Castle server running at http://0.0.0.0:${port}`);
    });
  } else {
    const viteReadyPromise = import('vite').then(({ createServer }) =>
      createServer({
        server: { middlewareMode: true },
        appType: 'spa',
      })
    );

    app.use(async (req, res, next) => {
      try {
        const vite = await viteReadyPromise;
        return vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });

    server.listen(port, '0.0.0.0', () => {
      console.log(`🏰 Traitors Castle server running at http://0.0.0.0:${port}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;

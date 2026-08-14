import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function inlineAssetsPlugin() {
  return {
    name: 'inline-assets-for-vercel-access',
    apply: 'build',
    closeBundle() {
      const distDir = path.resolve(process.cwd(), 'dist');
      const indexPath = path.join(distDir, 'index.html');
      if (!fs.existsSync(indexPath)) return;

      let html = fs.readFileSync(indexPath, 'utf8');

      html = html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+)">/g,
        (_, href) => {
          const assetPath = path.join(distDir, href.replace(/^\//, ''));
          if (!fs.existsSync(assetPath)) return _;
          return `<style>${fs.readFileSync(assetPath, 'utf8')}</style>`;
        }
      );

      html = html.replace(
        /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
        (_, src) => {
          const assetPath = path.join(distDir, src.replace(/^\//, ''));
          if (!fs.existsSync(assetPath)) return _;
          const js = fs.readFileSync(assetPath, 'utf8').replace(/<\/script/gi, '<\\/script');
          return `<script type="module">${js}</script>`;
        }
      );

      fs.writeFileSync(indexPath, html);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gasDeployId = env.VITE_GAS_DEPLOY_ID;

  return {
    plugins: [react(), inlineAssetsPlugin()],
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: gasDeployId ? {
        '/api': {
          target: 'https://script.google.com',
          changeOrigin: true,
          // Strategy endpoints (strategy*) are handled by api/index.js at Vercel edge.
          // In dev, if GAS proxy is active, strategy calls won't work locally.
          // Use `vercel dev` or deploy to test strategy features.
          rewrite: (path) => {
            const url = new URL(path, 'http://localhost');
            const ep = url.searchParams.get('endpoint');
            if (ep && ep.startsWith('strategy')) return path; // stays local, no GAS proxy
            return '/macros/s/' + gasDeployId + '/exec';
          },
          bypass: (req) => {
            const url = new URL(req.url, 'http://localhost');
            const ep = url.searchParams.get('endpoint');
            if (ep && ep.startsWith('strategy')) return req.url; // bypass proxy, serve locally
            return null;
          }
        }
      } : {}
    }
  };
});

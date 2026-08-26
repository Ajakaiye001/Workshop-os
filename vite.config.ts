import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

/**
 * GitHub Pages serves 404.html for any path it has no file for. This app is a
 * single-page app, so a deep link like /app/jobs would 404 on a hard refresh.
 * Shipping a copy of index.html as 404.html hands those requests to the router.
 */
function spaFallback(): Plugin {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      const out = path.resolve(__dirname, 'dist')
      const fs = require('node:fs') as typeof import('node:fs')
      const index = path.join(out, 'index.html')
      if (fs.existsSync(index)) {
        fs.copyFileSync(index, path.join(out, '404.html'))
        // stop Pages running the output through Jekyll
        fs.writeFileSync(path.join(out, '.nojekyll'), '')
      }
    },
  }
}

export default defineConfig(({ mode }) => ({
  // served from https://<user>.github.io/Workshop-os/ in production, root in dev
  base: mode === 'production' ? '/Workshop-os/' : '/',
  plugins: [react(), spaFallback()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 4260, strictPort: true },
  preview: { port: 4261, strictPort: true },
}))

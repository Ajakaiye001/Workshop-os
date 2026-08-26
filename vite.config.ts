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

/**
 * Where the app is served from differs per host: Vercel and local dev serve it
 * at the root, GitHub Pages at /Workshop-os/. Hard-coding either one breaks the
 * other, so the sub-path is passed in and the default is root.
 */
const base = process.env.VITE_BASE || '/'

export default defineConfig(() => ({
  base,
  plugins: [react(), spaFallback()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 4260, strictPort: true },
  preview: { port: 4261, strictPort: true },
}))

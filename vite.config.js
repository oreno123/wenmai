import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// Dev-only: write endpoint for curation page
function writeFilePlugin() {
  return {
    name: 'write-file-plugin',
    configureServer(server) {
      server.middlewares.use('/__write', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('POST only')
          return
        }
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { file, data } = JSON.parse(body)
            const abs = path.resolve(process.cwd(), file)
            // Safety: only allow writing to public/elements/
            if (!abs.startsWith(path.resolve(process.cwd(), 'public', 'elements'))) {
              res.statusCode = 403
              res.end('Forbidden path')
              return
            }
            fs.writeFileSync(abs, data, 'utf-8')
            res.statusCode = 200
            res.end('OK')
          } catch (e) {
            res.statusCode = 400
            res.end(e.message)
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    writeFilePlugin(),
  ],
})

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
  server: {
    proxy: {
      // dev 下把 /vlm 转到生产反代（key 在服务器 nginx 注入），与生产同一条代码路径
      '/vlm': {
        target: 'https://wenmai-api.ruoziqing.cn',
        changeOrigin: true,
      },
    },
  },
  test: {
    // 排除 .claude/worktrees 旧 worktree 里的过时测试副本（vitest 会递归扫到）
    exclude: ['**/node_modules/**', '**/dist/**', '**/.claude/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**'],
  },
})

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import dotenv from 'dotenv'

// Load base first
dotenv.config({ path: '.env' })
// Then override with local
dotenv.config({ path: '.env.local', override: true })

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  server: {
    port: Number(process.env.PLAYGROUNDPORT),
  },
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
    },
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MyPackage',
      fileName: 'index',
    },
  },
})

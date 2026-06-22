import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import dotenv from 'dotenv'
import preact from '@preact/preset-vite'
// Load base first
dotenv.config({ path: '.env' })
// Then override with local
dotenv.config({ path: '.env.local', override: true })

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' if testing UI
    include: ['src/tests/**/*.test.ts'],
    //exclude: ['tests/**', 'e2e/**'], // ❌ ignore playwright
  },
  plugins: [preact()],
  server: {
    port: Number(process.env.PLAYGROUNDPORT),
  },
  base: './', // 🔥 VERY IMPORTANT for Chrome extensions
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
      '@ui': path.resolve(root, 'ui'),
      zentrace: path.resolve(root, 'src/index.ts'),
    },
  },
  build: {
    outDir: 'extension',
    emptyOutDir: false,
    cssCodeSplit: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        content: path.resolve(root, 'ui/main.tsx'),
      },
      output: {
        format: 'es',
        entryFileNames: '[name].js',
        assetFileNames: 'assets/[name][extname]',
        inlineDynamicImports: true,
      },
    },
  },
})

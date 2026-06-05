import { defineConfig } from 'cypress'
import dotenv from 'dotenv'

// Load base first
dotenv.config({ path: '.env' })
// Then override with local
dotenv.config({ path: '.env.local', override: true })

const port = process.env.PLAYGROUNDPORT

export default defineConfig({
  e2e: {
    baseUrl: `http://localhost:${port}`,
    setupNodeEvents(on, config) {
      config.env.port = port
      return config
    },
  },
})

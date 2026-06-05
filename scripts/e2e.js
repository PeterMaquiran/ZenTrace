import 'dotenv/config'
import { spawn } from 'node:child_process'

const port = Number(process.env.PLAYGROUNDPORT)

const startCmd = 'npx vite playground'
const url = `http://localhost:${port}`
const testCmd = 'npx cypress run'

const child = spawn(
  'npx',
  ['start-server-and-test', `"${startCmd}"`, url, `"${testCmd}"`],
  {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      PLAYGROUNDPORT: String(port),
    },
  },
)

child.on('exit', (code) => process.exit(code))

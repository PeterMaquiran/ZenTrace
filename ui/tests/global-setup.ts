import { execSync } from 'node:child_process'

export default function globalSetup() {
  execSync('pnpm exec vite build', {
    cwd: process.cwd(),
    stdio: 'inherit',
  })
}

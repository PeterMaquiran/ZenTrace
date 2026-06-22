import { execSync } from 'child_process'

const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim()

// Format: type/scope/short-name
const pattern = /^[a-z]{2,10}\/[a-z0-9-]{1,20}\/[a-z0-9-]{1,20}$/

const validTypes = ['feat', 'fix', 'chore', 'refactor', 'test', 'docs']

const [type] = branch.split('/')

// ✅ allow developer branch
if (branch === 'developer') {
  console.log('✅ Branch name OK:', branch)
  process.exit(0)
}

if (!pattern.test(branch)) {
  console.log('\n❌ Invalid branch name:', branch)

  console.log('\n✅ Expected format:')
  console.log('  <type>/<scope>/<short-name>')

  console.log('\n📌 Examples:')
  console.log('  feat/auth/login')
  console.log('  fix/ui/button')
  console.log('  chore/ci/lint')

  process.exit(1)
}

if (!validTypes.includes(type)) {
  console.log('\n❌ Invalid type:', type)
  console.log('Allowed types:', validTypes.join(', '))
  process.exit(1)
}

console.log('✅ Branch name OK:', branch)

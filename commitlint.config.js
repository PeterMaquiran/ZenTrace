export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'test', 'perf'],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    ////
    'type-empty': [2, 'never'],
    // ✅ LIMIT SCOPE LENGTH
    'type-max-length': [2, 'always', 10],
    'scope-max-length': [2, 'always', 20],
    'subject-max-length': [2, 'always', 100],
    // ❌ disallow footer
    'footer-max-length': [2, 'always', 0],
  },
}

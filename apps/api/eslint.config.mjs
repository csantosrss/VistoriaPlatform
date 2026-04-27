import node from '@vistoria/config/eslint/node';

export default [
  ...node,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      // NestJS DI relies on emitted decorator metadata; classes used as DI tokens
      // appear "only as types" to ESLint, so disable this rule for api code.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    ignores: ['dist/**', 'coverage/**', 'prisma/migrations/**'],
  },
];

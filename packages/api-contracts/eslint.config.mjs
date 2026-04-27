import base from '@vistoria/config/eslint/base';

export default [
  ...base,
  {
    ignores: ['dist/**', 'coverage/**'],
  },
];

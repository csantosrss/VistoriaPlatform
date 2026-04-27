import node from "@vistoria/config/eslint/node";

export default [
  ...node,
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    ignores: ["dist/**", "coverage/**", "prisma/migrations/**"],
  },
];

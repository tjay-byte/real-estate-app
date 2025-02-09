import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    ignores: [
      ".next/",
      "out/",
      "build/",
      "dist/",
      "node_modules/",
      ".cache/",
      ".eslintcache",
      "coverage/",
      ".vercel"
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      'no-unused-vars': 'off',
      'react/no-unescaped-entities': ['error', {
        forbid: ['>', '}']
      }],
      '@next/next/no-img-element': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    },
  },
  ...compat.extends("next/core-web-vitals"),
];

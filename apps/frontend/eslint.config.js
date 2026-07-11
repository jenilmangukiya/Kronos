import { config as reactInternalConfig } from "@kronos/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...reactInternalConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

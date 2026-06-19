import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import astro from "eslint-plugin-astro";
import globals from "globals";
import path from "node:path";
import tseslint from "typescript-eslint";

const localRules = {
  rules: {
    "astro-page-index-routes": {
      meta: {
        type: "problem",
        docs: {
          description:
            "enforce directory-based Astro page routes under src/pages",
        },
        messages: {
          useIndexRoute:
            "Astro pages must use directory routes. Move '{{route}}' to '{{target}}'.",
        },
        schema: [],
      },
      create(context) {
        return {
          Program(node) {
            const relativePath = path
              .relative(process.cwd(), context.filename)
              .split(path.sep)
              .join("/");
            const match = relativePath.match(/^src\/pages\/(.+\.astro)$/);

            if (!match) return;

            const routePath = match[1];
            if (path.posix.basename(routePath) === "index.astro") return;

            const target = `src/pages/${routePath.replace(/\.astro$/, "/index.astro")}`;

            context.report({
              node,
              messageId: "useIndexRoute",
              data: {
                route: relativePath,
                target,
              },
            });
          },
        };
      },
    },
  },
};

export default defineConfig(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    plugins: {
      local: localRules,
    },
    rules: {
      "local/astro-page-index-routes": "error",
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    ignores: [".astro/", "dist/", "node_modules/"],
  },
);

import { defineConfig } from 'vite-plus'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
  fmt: {
    singleQuote: true,
    jsxSingleQuote: true,
    trailingComma: 'es5',
    semi: false,
    tabWidth: 2,
    printWidth: 100,
    ignorePatterns: ['dist/**', 'node_modules/**', '**/*.css', 'bun.lock', 'bun.lockb'],
  },
  plugins: [
    tailwindcss(),
    react(),
    viteSingleFile({
      // see https://github.com/richardtallent/vite-plugin-singlefile/pull/119
      useRecommendedBuildConfig: false,
    }),
  ],
  build: {
    outDir: 'dist',
    // viteSingleFile inlines all JS/CSS into index.html — required for data: URL loading
    assetsInlineLimit: 100_000_000,
  },
})

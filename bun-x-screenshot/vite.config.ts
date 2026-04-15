import { defineConfig } from 'vite-plus'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  lint: { options: { typeAware: true, typeCheck: true } },
  plugins: [tailwindcss(), react(), viteSingleFile()],
  build: {
    outDir: 'dist-renderer',
    // viteSingleFile inlines all JS/CSS into index.html — required for data: URL loading
    assetsInlineLimit: 100_000_000,
  },
})

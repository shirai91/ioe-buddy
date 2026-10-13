import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'backend',
          environment: 'node',
          include: ['src/sw/**/*.test.js', 'src/sw.test.js'],
          setupFiles: ['fake-indexeddb/auto'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.{js,jsx}'],
          exclude: ['src/sw/**', 'src/sw.test.js'],
          setupFiles: ['./vitest.setup.ui.js'],
        },
      },
    ],
  },
})

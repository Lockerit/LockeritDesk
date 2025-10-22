const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react-swc');
const path = require('node:path');

module.exports = defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist' },
  resolve: {
    alias: {
      '@app': path.resolve(process.cwd(), 'src/app'),
      '@features': path.resolve(process.cwd(), 'src/features'),
      '@shared': path.resolve(process.cwd(), 'src/shared'),
      '@services': path.resolve(process.cwd(), 'src/services'),
      '@assets': path.resolve(process.cwd(), 'src/assets'),
    },
  },
});

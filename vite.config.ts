import path from 'path';
import { defineConfig } from 'vite';
import browserslist from 'browserslist';
import { browserslistToTargets } from 'lightningcss';

export default defineConfig({
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: browserslistToTargets(browserslist('>= 0.25%')),
      cssModules: {
        pattern: '[name]_[local]_[hash]',
        dashedIdents: false, // Disable CSS variable scoping
      }
    }
  },
  build: {
    cssMinify: 'lightningcss'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  },
  test: {
    globals: true,
    environment: 'node',
  }
});

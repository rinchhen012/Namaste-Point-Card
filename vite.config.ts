import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Define plugins array with optional analyzer
  const plugins = [react()];

  // Add visualizer plugin when ANALYZE is true
  if (process.env.ANALYZE === 'true') {
    plugins.push(
      visualizer({
        filename: 'stats.html',
        open: true,
        gzipSize: true,
        brotliSize: true,
      })
    );
  }

  // Define chunk configuration - this is safe without type issues
  const manualChunks = {
    vendor: ['react', 'react-dom', 'react-router-dom'],
    firebase: [
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'firebase/functions'
    ],
    ui: [
      'date-fns',
      'i18next',
      'react-i18next'
    ]
  };

  const mainConfig = {
    plugins,
    build: {
      minify: mode === 'production' ? 'terser' : false,
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production'
        }
      },
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          manualChunks,
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      }
    }
  };

  // Admin app build config
  const adminConfig = {
    plugins,
    build: {
      minify: mode === 'production' ? 'terser' : false,
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production'
        }
      },
      rollupOptions: {
        input: {
          admin: resolve(__dirname, 'admin.html'),
        },
        output: {
          manualChunks,
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      }
    }
  };

  // In dev mode, we want to serve both files
  if (command === 'serve') {
    return {
      ...mainConfig,
      server: {
        historyApiFallback: {
          rewrites: [
            // Serve admin.html for URLs that start with /admin.html
            { from: /^\/admin\.html\/.*$/, to: '/admin.html' },
            // Default - serve index.html
            { from: /./, to: '/index.html' }
          ]
        }
      },
      build: {
        minify: mode === 'production' ? 'terser' : false,
        terserOptions: {
          compress: {
            drop_console: mode === 'production',
            drop_debugger: mode === 'production'
          }
        },
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'),
            admin: resolve(__dirname, 'admin.html')
          },
          output: {
            manualChunks,
            chunkFileNames: 'assets/js/[name]-[hash].js',
            entryFileNames: 'assets/js/[name]-[hash].js',
            assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
          }
        }
      }
    };
  }

  // In production build mode, use the specific config based on the target
  return process.env.TARGET === 'admin' ? adminConfig : mainConfig;
})

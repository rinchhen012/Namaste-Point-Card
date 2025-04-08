import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const mainConfig = {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        }
      }
    }
  };

  // Admin app build config
  const adminConfig = {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          admin: resolve(__dirname, 'admin.html'),
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
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'),
            admin: resolve(__dirname, 'admin.html')
          }
        }
      }
    };
  }

  // In production build mode, use the specific config based on the target
  return process.env.TARGET === 'admin' ? adminConfig : mainConfig;
})

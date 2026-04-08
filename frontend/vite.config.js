import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    // Chỉ định dùng terser để nén code thay vì mặc định
    minify: 'terser',
    terserOptions: {
      compress: {
        // Tự động xóa sạch console.log và debugger khi build Production
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Is line ko change karke apne GitHub Repository ka naam likhein.
  // Agar aapka repo name 'fashion-app' hai, toh ye '/fashion-app/' hona chahiye.
  // Agar slash nahi lagayenge toh screen blank (white) dikhegi.
  base: '/fashion-gen-app/', 
})

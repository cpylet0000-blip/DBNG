
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173, 
    allowedHosts: [
      'gambf.vercel.app',
      'localhost',
      'gadmin-xi.vercel.app',
      'game-frontend-puce.vercel.app',
      'commorant-inkiest-homer.ngrok-free.dev',
      'commorant-inkiest-homer.ngrok-free.dev',
      'calcifugous-noella-reportable.ngrok-free.dev',
      'untried-stonework-undermost.ngrok-free.dev',
      'viper-provolone-mocker.ngrok-free.dev'

    ]
  }
})

// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     host: true,
//     allowedHosts: [
//       'gambf.vercel.app',
//       'gadmin-xi.vercel.app',
//       'localhost',
//       'calcifugous-noella-reportable.ngrok-free.dev',
//           'commorant-inkiest-homer.ngrok-free.dev',
//       'preposterous-ornamentally-janiece.ngrok-free.dev',
//     ]
//   }
// })

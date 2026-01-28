// server.ts
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { CircuitHub } from './src/lib/signalr/hubs/CircuitHub'
 
const port = parseInt(process.env.PORT || '3000', 10)
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()
 
app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  // Setup Socket.IO server with CORS
  const io = new SocketIOServer(server, {
    cors: {
      origin: dev ? ['http://localhost:3000', 'http://127.0.0.1:3000'] : process.env.ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io/',
    transports: ['websocket', 'polling']
  })

  // Initialize SignalR hub
  const circuitHub = new CircuitHub(io)
  
  console.log('✓ SignalR hub initialized')

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`)
    console.log(`> Socket.IO server running on ws://localhost:${port}`)
  })
})
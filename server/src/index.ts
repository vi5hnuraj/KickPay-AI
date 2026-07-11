import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as crypto from 'crypto';

if (!process.env.PORT) {
  throw new Error(`[Relay Service] Missing required PORT environment variable. Please configure it in your .env file.`);
}

const PORT = process.env.PORT;

interface ClientSession {
  ws: WebSocket;
  did?: string;
  topic?: string;
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('KickPay Relay Service Active\n');
});

const wss = new WebSocketServer({ server });
const sessions = new Map<string, ClientSession>(); // sessionId -> session

wss.on('connection', (ws: WebSocket, req) => {
  const sessionId = crypto.randomUUID();
  console.log(`[Relay] New connection: session_id=${sessionId}`);
  
  sessions.set(sessionId, { ws });

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'register':
          // Register client with DID and optional swarm topic
          const session = sessions.get(sessionId);
          if (session) {
            session.did = data.did;
            session.topic = data.topic;
            console.log(`[Relay] Registered: session_id=${sessionId}, DID=${data.did}, topic=${data.topic}`);
            ws.send(JSON.stringify({ type: 'registered', sessionId, status: 'success' }));
          }
          break;

        case 'signal':
          // Forward signaling payload (e.g., ICE candidates or metadata) to target DID or broadcast to topic peers
          const { targetDid, payload } = data;
          const currentSession = sessions.get(sessionId);
          let forwardedCount = 0;

          if (targetDid === 'broadcast_topic_peers') {
            const topic = currentSession?.topic;
            console.log(`[Relay] Broad-signaling from ${sessionId} on topic: ${topic}`);
            for (const [sId, sess] of sessions.entries()) {
              if (sess.topic === topic && sId !== sessionId) {
                sess.ws.send(JSON.stringify({
                  type: 'signal',
                  fromSessionId: sessionId,
                  fromDid: currentSession?.did,
                  payload
                }));
                forwardedCount++;
              }
            }
          } else {
            console.log(`[Relay] Signal from ${sessionId} to target DID: ${targetDid}`);
            for (const [sId, sess] of sessions.entries()) {
              if (sess.did === targetDid && sId !== sessionId) {
                sess.ws.send(JSON.stringify({
                  type: 'signal',
                  fromSessionId: sessionId,
                  fromDid: currentSession?.did,
                  payload
                }));
                forwardedCount++;
              }
            }
          }
          if (forwardedCount === 0 && targetDid !== 'broadcast_topic_peers') {
            ws.send(JSON.stringify({ type: 'error', message: 'Target peer not found or offline' }));
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          console.warn(`[Relay] Unknown message type: ${data.type}`);
          ws.send(JSON.stringify({ type: 'error', message: `Unknown type: ${data.type}` }));
      }
    } catch (err: any) {
      console.error(`[Relay] Error handling message: ${err.message}`);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid payload' }));
    }
  });

  ws.on('close', () => {
    console.log(`[Relay] Connection closed: session_id=${sessionId}`);
    sessions.delete(sessionId);
  });

  ws.on('error', (err) => {
    console.error(`[Relay] Socket error in ${sessionId}: ${err.message}`);
  });
});

server.listen(PORT, () => {
  console.log(`[Relay] Server running on port ${PORT}`);
});

import { WebSocketServer as Server, WebSocket } from 'ws';
import { Redis } from '@upstash/redis';
import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';

// Extend NextApiResponse to include WebSocket server
import { Socket } from 'net';

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: Socket & {
    server: HTTPServer & {
      wss?: Server;
    };
  };
}

// Extend WebSocket with custom fields
interface CustomWebSocket extends WebSocket {
  roomId?: string;
  userId?: string;
  isAlive?: boolean;
}

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (!res.socket.server.wss) {
    console.log('🔌 Initializing WebSocket server...');

    const wss = new Server({ noServer: true });
    res.socket.server.wss = wss;

    const heartbeatInterval = setInterval(() => {
      wss.clients.forEach((client) => {
        const ws = client as CustomWebSocket;
        if (!ws.isAlive) {
          handleUserDisconnect(ws, res);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    wss.on('close', () => clearInterval(heartbeatInterval));

    wss.on('connection', (ws: CustomWebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const roomId = url.searchParams.get('roomId');
      const userId = url.searchParams.get('userId');

      if (!roomId || !userId) {
        ws.close(1008, 'Missing roomId or userId');
        return;
      }

      ws.roomId = roomId;
      ws.userId = userId;
      ws.isAlive = true;

      ws.on('pong', () => (ws.isAlive = true));

      ws.on('message', async (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          switch (data.type) {
            case 'chat':
              broadcastToRoom(res, roomId, {
                type: 'chat',
                userId: data.userId,
                username: data.username,
                text: data.text,
              }, ws);
              break;

            case 'leaveRoom':
              await handleUserLeave(data.userId, roomId, ws, res);
              break;

            default:
              console.log('⚠️ Unknown message type:', data.type);
          }
        } catch (err) {
          console.error('❌ Message handling error:', err);
        }
      });

      ws.on('close', () => {
        handleUserDisconnect(ws, res);
      });
    });

    res.socket.server.on('upgrade', (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    });
  }

  res.end();
}

// Helper: Disconnect handler
async function handleUserDisconnect(
  ws: CustomWebSocket,
  res: NextApiResponseWithSocket
) {
  if (ws.roomId && ws.userId) {
    await handleUserLeave(ws.userId, ws.roomId, ws, res);
  }
}

// Helper: User leaves room
async function handleUserLeave(
  userId: string,
  roomId: string,
  ws: CustomWebSocket,
  res: NextApiResponseWithSocket
) {
  try {
    const roomData = await redis.get(`room:${roomId}`);
    if (!roomData) return;

    const room = roomData as any;
    const leavingUser = room.users.find((user: any) => user.id === userId);
    const userName = leavingUser?.name || 'A user';

    room.users = room.users.filter((user: any) => user.id !== userId);

    if (room.users.length === 0) {
      await redis.del(`room:${roomId}`);
      await redis.del(`game:${roomId}`);
      console.log(`🧹 Room ${roomId} deleted (empty)`);
    } else {
      if (!room.users.some((u: any) => u.isHost)) {
        room.users[0].isHost = true;
      }

      await redis.set(`room:${roomId}`, room);
      broadcastToRoom(res, roomId, {
        type: 'userLeft',
        user: { id: userId, name: userName },
      }, ws);
    }

    console.log(`👋 User ${userId} left room ${roomId}`);
  } catch (err) {
    console.error('❌ Error removing user:', err);
  }
}

// Broadcast messages to all clients in a room
function broadcastToRoom(
  res: NextApiResponseWithSocket,
  roomId: string,
  message: any,
  exclude: WebSocket | null = null
) {
  if (!res.socket.server.wss) return;

  res.socket.server.wss.clients.forEach((client) => {
    const ws = client as CustomWebSocket;
    if (
      ws.roomId === roomId &&
      client.readyState === WebSocket.OPEN &&
      client !== exclude
    ) {
      try {
        ws.send(JSON.stringify(message));
      } catch (err) {
        console.error('❌ Broadcast error:', err);
      }
    }
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};

import { Redis } from "@upstash/redis";

// Create Redis client using Upstash REST API
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface User {
  id: string;
  name: string;
  isHost: boolean;
}

export interface Room {
  id: string;
  users: User[];
  createdAt: number;
}


export class RoomService {
  // Create a new room
  static async createRoom(roomId: string, hostUser: User): Promise<Room> {
    try {
      if (!roomId || !hostUser || !hostUser.id) {
        console.error("❌ Invalid roomId or hostUser provided");
        throw new Error("Invalid input");
      }

      const room: Room = {
        id: roomId,
        users: [hostUser],
        createdAt: Date.now(),
      };

      const serializedRoom = JSON.stringify(room);
      await redis.set(`room:${roomId}`, serializedRoom);

      console.log(`✅ Room created with ID: ${roomId}`);
      return room;
    } catch (error) {
      console.error("❌ Failed to create room:", error);
      throw error;
    }
  }

  // Get room by ID
  
  static async getRoom(roomId: string): Promise<Room | null> {
    try {
      const roomData = await redis.get(`room:${roomId}`);
  
      if (!roomData) return null;
  
      if (typeof roomData === 'string') {
        try {
          return JSON.parse(roomData) as Room;
        } catch (parseError) {
          console.error(`❌ Error parsing room data for ${roomId}:`, parseError);
          return null;
        }
      } else if (typeof roomData === 'object') {
        // Already parsed
        return roomData as Room;
      }
  
      return null;
    } catch (error) {
      console.error(`❌ Error retrieving room from Redis:`, error);
      return null;
    }
  }
  
  
  // Add user to room
  static async addUserToRoom(roomId: string, user: User): Promise<Room | null> {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    if (!room.users.some(u => u.id === user.id)) {
      room.users.push(user);
      await redis.set(`room:${roomId}`, JSON.stringify(room));
    }

    return room;
  }

  // Remove user from room
  static async removeUserFromRoom(roomId: string, userId: string): Promise<Room | null> {
    const room = await this.getRoom(roomId);
    if (!room) return null;

    const leavingUser = room.users.find(user => user.id === userId);
    if (!leavingUser) return room;

    room.users = room.users.filter(user => user.id !== userId);

    if (room.users.length === 0) {
      await redis.del(`room:${roomId}`);
      await redis.del(`game:${roomId}`);
      console.log(`ℹ️ Room ${roomId} deleted as it's now empty`);
      return null;
    }

    if (leavingUser.isHost && room.users.length > 0) {
      room.users[0].isHost = true;
    }

    await redis.set(`room:${roomId}`, JSON.stringify(room));
    return room;
  }

  // Delete entire room
  static async deleteRoom(roomId: string): Promise<void> {
    await redis.del(`room:${roomId}`);
    await redis.del(`game:${roomId}`);
  }
}

// app/api/rooms/[roomId]/join/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId;
    const { user } = await request.json();
    
    // Validate input
    if (!user || !user.id || !user.name) {
      return NextResponse.json({ message: 'Invalid user data' }, { status: 400 });
    }
    
    // Get room data from Redis
    const roomData = await redis.get(`room:${roomId}`);
    
    if (!roomData) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }
    
    const room = JSON.parse(roomData as string);
    
    // Check if user with same name already exists
    const existingUser = room.users.find((u: any) => u.name === user.name);
    if (existingUser) {
      return NextResponse.json({ message: 'Username already taken in this room' }, { status: 409 });
    }
    
    // Add user to the room
    room.users.push(user);
    
    // Update room in Redis
    await redis.set(`room:${roomId}`, JSON.stringify(room), { ex: 86400 });
    
    return NextResponse.json({ message: 'Joined room successfully', roomId });
  } catch (error) {
    console.error('Error joining room:', error);
    return NextResponse.json({ message: 'Failed to join room' }, { status: 500 });
  }
}
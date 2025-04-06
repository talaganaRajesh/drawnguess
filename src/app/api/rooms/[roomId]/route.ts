// app/api/rooms/[roomId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const roomId = params.roomId;
    
    // Get room data from Redis
    const roomData = await redis.get(`room:${roomId}`);
    
    if (!roomData) {
      return NextResponse.json({ message: 'Room not found' }, { status: 404 });
    }
    
    return NextResponse.json(roomData);
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json({ message: 'Failed to fetch room data' }, { status: 500 });
  }
}
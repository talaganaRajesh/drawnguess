// app/api/rooms/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client
// Replace with actual Redis connection details
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

export async function POST(request: NextRequest) {
  try {
    const { roomId, user } = await request.json();

    // Validate input
    if (!roomId || !user || !user.id || !user.name) {
      return NextResponse.json({ message: 'Invalid input data' }, { status: 400 });
    }

    // Create a room with the initial user
    const room = {
      id: roomId,
      createdAt: new Date().toISOString(),
      users: [user],
      active: true
    };

    // Store room in Redis with 24h expiration
    await redis.set(`room:${roomId}`, JSON.stringify(room), { ex: 86400 });

    return NextResponse.json({ message: 'Room created successfully', roomId });
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json({ message: 'Failed to create room' }, { status: 500 });
  }
}




export async function GET(request: NextRequest) {
  console.log("GET request received at /api/rooms");

  try {
    const keys = await redis.keys('room:*'); 
    console.log("Fetched Keys from Redis:", keys);

    if (!keys.length) {
      console.log("No rooms found.");
      return NextResponse.json({ message: 'No rooms found', rooms: [] }, { status: 200 });
    }

    const rooms = await Promise.all(keys.map(async (key) => {
      const roomData = await redis.get(key);
      console.log(`Raw Room Data for ${key}:`, roomData);

      // ✅ Ensure that we only parse if roomData is a string
      return typeof roomData === "string" ? JSON.parse(roomData) : roomData;
    }));


    console.log("Fetched Rooms Data:", rooms);
    return NextResponse.json(rooms.filter(Boolean));
  } catch (error) {
    console.error("Error fetching rooms:", error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ message: 'Failed to fetch rooms', error: errorMessage }, { status: 500 });
  }
}


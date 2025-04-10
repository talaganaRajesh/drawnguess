import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Simple in-memory fallback for development/testing when Redis fails
const inMemoryRooms = new Map();

// Test Redis connection
async function testRedisConnection() {
  try {
    await redis.set('test-connection', 'working');
    const result = await redis.get('test-connection');
    console.log('Redis connection test:', result === 'working' ? 'SUCCESS' : 'FAILED');
    return result === 'working';
  } catch (e) {
    console.error('Redis connection test FAILED:', e);
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  console.log('JOIN ROOM API called with roomId:', params.roomId);
  
  try {
    // Test Redis connection first
    const isRedisConnected = await testRedisConnection();
    if (!isRedisConnected) {
      console.warn('Using in-memory fallback due to Redis connection failure');
    }
    
    const roomId = params.roomId;
    
    // Parse request body
    let userData;
    try {
      userData = await request.json();
      console.log('Request body parsed:', userData);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json({ 
        message: 'Invalid request body - could not parse JSON',
        error: parseError instanceof Error ? parseError.message : String(parseError)
      }, { status: 400 });
    }
    
    const { user } = userData;
    
    // Validate input
    if (!user) {
      return NextResponse.json({ message: 'User object is required' }, { status: 400 });
    }
    
    if (!user.id) {
      return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
    }
    
    if (!user.name) {
      return NextResponse.json({ message: 'User name is required' }, { status: 400 });
    }
    
    // Get room data (try Redis first, fall back to in-memory)
    let roomData;
    try {
      if (isRedisConnected) {
        roomData = await redis.get(`room:${roomId}`);
        console.log('Room data from Redis:', roomData);
      } else {
        roomData = inMemoryRooms.get(roomId);
        console.log('Room data from in-memory:', roomData);
      }
    } catch (redisError) {
      console.error('Error fetching room data:', redisError);
      // Try in-memory fallback
      roomData = inMemoryRooms.get(roomId);
      console.log('Fallback to in-memory room data:', roomData);
    }
    
    if (!roomData) {
      return NextResponse.json({ 
        message: 'Room not found', 
        roomId,
        source: isRedisConnected ? 'redis' : 'memory'
      }, { status: 404 });
    }
    
    // Parse room data
    let room;
    try {
      // If it's already an object (from in-memory), use it directly
      if (typeof roomData === 'object' && roomData !== null) {
        room = roomData;
      } else {
        // Otherwise parse from JSON string (from Redis)
        room = JSON.parse(roomData as string);
      }
      
      // Ensure users array exists
      if (!Array.isArray(room.users)) {
        console.log('Creating users array for room as it did not exist');
        room.users = [];
      }
      
      console.log('Parsed room data:', room);
    } catch (parseError) {
      console.error('Error parsing room data:', parseError);
      return NextResponse.json({ 
        message: 'Invalid room data format',
        error: parseError instanceof Error ? parseError.message : String(parseError)
      }, { status: 500 });
    }
    
    // Check if user with same name already exists
    const existingUser = room.users.find((u: any) => u.name === user.name);
    if (existingUser) {
      return NextResponse.json({ 
        message: 'Username already taken in this room',
        existingUser
      }, { status: 409 });
    }
    
    // Add user to the room
    room.users.push(user);
    console.log('Updated room with new user:', room);
    
    // Store updated room data
    try {
      if (isRedisConnected) {
        // Update in Redis (with expiration of 24 hours)
        await redis.set(`room:${roomId}`, JSON.stringify(room), { ex: 86400 });
        console.log('Room updated in Redis');
      } else {
        // Update in memory
        inMemoryRooms.set(roomId, room);
        console.log('Room updated in memory');
      }
    } catch (storageError) {
      console.error('Error storing room data:', storageError);
      
      // Try fallback to in-memory if Redis failed
      if (isRedisConnected) {
        inMemoryRooms.set(roomId, room);
        console.log('Fallback: Room updated in memory after Redis failure');
      } else {
        return NextResponse.json({ 
          message: 'Failed to store room data',
          error: storageError instanceof Error ? storageError.message : String(storageError)
        }, { status: 500 });
      }
    }
    
    return NextResponse.json({ 
      message: 'Joined room successfully', 
      roomId, 
      user,
      usersCount: room.users.length,
      source: isRedisConnected ? 'redis' : 'memory'
    });
    
  } catch (error) {
    console.error('Unhandled error in join room API:', error);
    return NextResponse.json({ 
      message: 'Failed to join room', 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
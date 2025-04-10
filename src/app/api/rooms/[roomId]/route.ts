import { NextRequest, NextResponse } from "next/server";
import { RoomService } from "@/services/roomService";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const roomId = url.pathname.split("/").pop(); // extract roomId from the path

  console.log("🎯 GET called for room:", roomId);

  try {
    let room = await RoomService.getRoom(roomId!);

    if (!room) {
      const hostUser = {
        id: "test-host-id",
        name: "Host",
        isHost: true,
      };

      console.log("🛠️ Room not found. Creating new room...");
      console.log("Creating room with roomId:", roomId, "and hostUser:", hostUser);

      try {
        room = await RoomService.createRoom(roomId!, hostUser);
      } catch (error) {
        console.error("Error creating room:", error);
        return NextResponse.json({ message: "Failed to create room" }, { status: 500 });
      }

      console.log("✅ Room created successfully:", room);
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("❌ Error in GET handler:", error);
    return NextResponse.json({ message: "Failed to retrieve or create room" }, { status: 500 });
  }
}

// DELETE - Remove user from room
export async function DELETE(
  request: Request,
  { params }: { params: { roomId: string } }
) {
  const { roomId } = params;
  const body = await request.json();
  const userId = body.userId;

  if (!userId) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    const room = await RoomService.removeUserFromRoom(roomId, userId);

    if (!room) {
      return NextResponse.json({ message: 'Room deleted successfully' }, { status: 200 });
    }

    return NextResponse.json(room, { status: 200 });
  } catch (error) {
    console.error('Error removing user from room:', error);
    return NextResponse.json({ message: 'Failed to remove user from room' }, { status: 500 });
  }
}
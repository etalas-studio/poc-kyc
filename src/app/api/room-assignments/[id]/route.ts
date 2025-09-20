import { NextResponse } from "next/server";
import { RoomAssignmentService } from "@/lib/services/room-assignment.service";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid room assignment ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Transform the data to match database schema
    const updateData = { ...body };
    
    // Map housekeepingNote to notes if present
    if (updateData.housekeepingNote !== undefined) {
      updateData.notes = updateData.housekeepingNote;
      delete updateData.housekeepingNote;
    }

    const updatedAssignment = await RoomAssignmentService.updateAssignment(id, updateData);
    return NextResponse.json(updatedAssignment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update room assignment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Add PATCH method support (same as PUT for this use case)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid room assignment ID" }, { status: 400 });
    }

    const assignment = await RoomAssignmentService.getAssignmentById(id);
    if (!assignment) {
      return NextResponse.json({ error: "Room assignment not found" }, { status: 404 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch room assignment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid room assignment ID" }, { status: 400 });
    }

    await RoomAssignmentService.deleteAssignment(id);
    return NextResponse.json({ message: "Room assignment deleted successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete room assignment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { RoomAssignmentService } from "@/lib/services/room-assignment.service";

export async function GET() {
  try {
    const assignments = await RoomAssignmentService.getAllAssignments();
    return NextResponse.json(assignments);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch room assignments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    roomNumber?: string;
    status?: string;
    priority?: string;
    occupancy?: string;
    checkoutTime?: string;
    estimatedTime?: string;
    notes?: string;
    guestCheckout?: string;
    nextCheckin?: string;
    guestName?: string;
    occupancyStatus?: string;
    bedType?: string;
    serviceStatus?: string;
    assignedTo?: string;
  } | null;

  if (!body?.roomNumber) {
    return NextResponse.json(
      { error: "Missing required field: roomNumber" },
      { status: 400 }
    );
  }

  try {
    const assignment = await RoomAssignmentService.createAssignment({
      roomNumber: body.roomNumber,
      status: body.status as any,
      priority: body.priority as any,
      occupancy: body.occupancy as any,
      checkoutTime: body.checkoutTime,
      estimatedTime: body.estimatedTime,
      notes: body.notes,
      guestCheckout: body.guestCheckout,
      nextCheckin: body.nextCheckin,
      guestName: body.guestName,
      occupancyStatus: body.occupancyStatus,
      bedType: body.bedType,
      serviceStatus: body.serviceStatus as any,
      assignedTo: body.assignedTo,
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create room assignment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
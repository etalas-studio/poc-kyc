import { prisma } from "@/lib/prisma";
import { RoomAssignmentStatus, RoomAssignmentPriority, RoomOccupancy, ServiceStatus } from "@/generated/prisma";

export interface CreateRoomAssignmentData {
  roomNumber: string;
  status?: RoomAssignmentStatus;
  priority?: RoomAssignmentPriority;
  occupancy?: RoomOccupancy;
  checkoutTime?: string;
  estimatedTime?: string;
  notes?: string;
  guestCheckout?: string;
  nextCheckin?: string;
  guestName?: string;
  occupancyStatus?: string;
  bedType?: string;
  serviceStatus?: ServiceStatus;
  assignedTo?: string;
}

export interface UpdateRoomAssignmentData {
  status?: RoomAssignmentStatus;
  priority?: RoomAssignmentPriority;
  occupancy?: RoomOccupancy;
  checkoutTime?: string;
  estimatedTime?: string;
  notes?: string;
  guestCheckout?: string;
  nextCheckin?: string;
  guestName?: string;
  occupancyStatus?: string;
  bedType?: string;
  serviceStatus?: ServiceStatus;
  assignedTo?: string;
}

export class RoomAssignmentService {
  /**
   * Get all room assignments with optional filtering and sorting
   */
  static async getAllAssignments() {
    try {
      const assignments = await prisma.roomAssignment.findMany({
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" }
        ]
      });
      return assignments;
    } catch (error) {
      throw new Error(`Failed to fetch room assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get room assignment by ID
   */
  static async getAssignmentById(id: number) {
    try {
      const assignment = await prisma.roomAssignment.findUnique({
        where: { id }
      });
      
      if (!assignment) {
        throw new Error(`Room assignment with ID ${id} not found`);
      }
      
      return assignment;
    } catch (error) {
      throw new Error(`Failed to fetch room assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create new room assignment
   */
  static async createAssignment(data: CreateRoomAssignmentData) {
    try {
      // Check if room number already exists
      const existingRoom = await prisma.roomAssignment.findUnique({
        where: { roomNumber: data.roomNumber }
      });

      if (existingRoom) {
        throw new Error(`Room ${data.roomNumber} already has an assignment`);
      }

      // Create assignment with default values
      const assignment = await prisma.roomAssignment.create({
        data: {
          roomNumber: data.roomNumber,
          status: data.status || RoomAssignmentStatus.DIRTY,
          priority: data.priority || RoomAssignmentPriority.MEDIUM,
          occupancy: data.occupancy || RoomOccupancy.VACANT,
          serviceStatus: data.serviceStatus || ServiceStatus.PENDING,
          checkoutTime: data.checkoutTime,
          estimatedTime: data.estimatedTime,
          notes: data.notes,
          guestCheckout: data.guestCheckout,
          nextCheckin: data.nextCheckin,
          guestName: data.guestName,
          occupancyStatus: data.occupancyStatus,
          bedType: data.bedType,
          assignedTo: data.assignedTo,
        }
      });

      return assignment;
    } catch (error) {
      throw new Error(`Failed to create room assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update room assignment
   */
  static async updateAssignment(id: number, data: UpdateRoomAssignmentData) {
    try {
      // Check if assignment exists
      const existingAssignment = await prisma.roomAssignment.findUnique({
        where: { id }
      });

      if (!existingAssignment) {
        throw new Error(`Room assignment with ID ${id} not found`);
      }

      // Update assignment
      const updatedAssignment = await prisma.roomAssignment.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date()
        }
      });

      return updatedAssignment;
    } catch (error) {
      throw new Error(`Failed to update room assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update room status (common operation)
   */
  static async updateRoomStatus(id: number, status: RoomAssignmentStatus, serviceStatus?: ServiceStatus) {
    try {
      const updateData: UpdateRoomAssignmentData = { status };
      
      // Auto-update service status based on room status
      if (status === RoomAssignmentStatus.CLEAN && !serviceStatus) {
        updateData.serviceStatus = ServiceStatus.COMPLETE;
      } else if (serviceStatus) {
        updateData.serviceStatus = serviceStatus;
      }

      return await this.updateAssignment(id, updateData);
    } catch (error) {
      throw new Error(`Failed to update room status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete room assignment
   */
  static async deleteAssignment(id: number) {
    try {
      const existingAssignment = await prisma.roomAssignment.findUnique({
        where: { id }
      });

      if (!existingAssignment) {
        throw new Error(`Room assignment with ID ${id} not found`);
      }

      await prisma.roomAssignment.delete({
        where: { id }
      });

      return { success: true, message: `Room assignment ${existingAssignment.roomNumber} deleted successfully` };
    } catch (error) {
      throw new Error(`Failed to delete room assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get assignments by status
   */
  static async getAssignmentsByStatus(status: RoomAssignmentStatus) {
    try {
      const assignments = await prisma.roomAssignment.findMany({
        where: { status },
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" }
        ]
      });
      return assignments;
    } catch (error) {
      throw new Error(`Failed to fetch assignments by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get assignments by priority
   */
  static async getAssignmentsByPriority(priority: RoomAssignmentPriority) {
    try {
      const assignments = await prisma.roomAssignment.findMany({
        where: { priority },
        orderBy: { createdAt: "desc" }
      });
      return assignments;
    } catch (error) {
      throw new Error(`Failed to fetch assignments by priority: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get assignments assigned to specific user
   */
  static async getAssignmentsByUser(userId: string) {
    try {
      const assignments = await prisma.roomAssignment.findMany({
        where: { assignedTo: userId },
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" }
        ]
      });
      return assignments;
    } catch (error) {
      throw new Error(`Failed to fetch user assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
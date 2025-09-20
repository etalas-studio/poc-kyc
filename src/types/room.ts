import { z } from "zod";
import { RoomAssignmentStatus, RoomAssignmentPriority, RoomOccupancy, ServiceStatus } from "@/generated/prisma";

// Re-export enums for easier imports
export { RoomAssignmentStatus, RoomAssignmentPriority, RoomOccupancy, ServiceStatus };

// Legacy enums for backward compatibility
export enum RoomStatus {
  CLEAN = "clean",
  DIRTY = "dirty",
  INSPECTED = "inspected",
}

export enum RoomPriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  URGENT = "Urgent",
}

// Zod schemas for validation
export const CreateRoomAssignmentSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required"),
  status: z.nativeEnum(RoomAssignmentStatus).optional(),
  priority: z.nativeEnum(RoomAssignmentPriority).optional(),
  occupancy: z.nativeEnum(RoomOccupancy).optional(),
  checkoutTime: z.string().optional(),
  estimatedTime: z.string().optional(),
  notes: z.string().optional(),
  guestCheckout: z.string().optional(),
  nextCheckin: z.string().optional(),
  guestName: z.string().optional(),
  occupancyStatus: z.string().optional(),
  bedType: z.string().optional(),
  serviceStatus: z.nativeEnum(ServiceStatus).optional(),
  assignedTo: z.string().optional(),
});

export const UpdateRoomAssignmentSchema = CreateRoomAssignmentSchema.partial().omit({ roomNumber: true });

export const FilterOptionsSchema = z.object({
  cleanliness: z.array(z.nativeEnum(RoomAssignmentStatus)).optional(),
  priority: z.array(z.nativeEnum(RoomAssignmentPriority)).optional(),
  occupancy: z.array(z.nativeEnum(RoomOccupancy)).optional(),
  serviceStatus: z.array(z.nativeEnum(ServiceStatus)).optional(),
  sortBy: z.string().optional(),
});

// TypeScript types
export type CreateRoomAssignmentData = z.infer<typeof CreateRoomAssignmentSchema>;
export type UpdateRoomAssignmentData = z.infer<typeof UpdateRoomAssignmentSchema>;
export type FilterOptionsData = z.infer<typeof FilterOptionsSchema>;

// Room Assignment type based on Prisma model
export interface RoomAssignment {
  id: number; // Fixed: Changed from string to number to match database schema
  roomNumber: string;
  status: RoomAssignmentStatus;
  priority: RoomAssignmentPriority;
  occupancy: RoomOccupancy;
  checkoutTime?: string | null;
  estimatedTime?: string | null;
  notes?: string | null;
  guestCheckout?: string | null;
  nextCheckin?: string | null;
  guestName?: string | null;
  occupancyStatus?: string | null;
  bedType?: string | null;
  serviceStatus: ServiceStatus;
  assignedTo?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: number;
  roomNumber: string;
  status: RoomStatus;
  priority: RoomPriority;
  occupancy: RoomOccupancy;
  checkoutTime: string;
  estimatedTime: string;
  notes?: string;
  // Legacy properties for compatibility
  guestCheckout?: string;
  nextCheckin?: string;
  guestName?: string | null;
  occupancyStatus?: string;
  bedType?: string;
  serviceStatus?: ServiceStatus;
}

export interface FilterOptions {
  cleanliness: RoomStatus[];
  sortBy: string;
}

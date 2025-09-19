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

export enum RoomOccupancy {
  VACANT = "vacant",
  OCCUPIED = "occupied",
  OUT_OF_ORDER = "out_of_order",
}

export enum ServiceStatus {
  PENDING = "Pending",
  DO_NOT_DISTURB = "Do not Disturb",
  REFUSED_SERVICE = "Refused Service",
  COMPLETE = "Complete",
  IN_PROGRESS = "In Progress",
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

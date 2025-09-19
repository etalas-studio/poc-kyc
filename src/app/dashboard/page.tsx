"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoomDetailsSheet } from "@/components/room-details-sheet";
import { FilterSheet } from "@/components/filter-sheet";
import {
  RoomStatus,
  RoomPriority,
  RoomOccupancy,
  Room,
  ServiceStatus,
  FilterOptions,
} from "@/types/room";

// Dummy room data for housekeeping
const roomsToClean: Room[] = [
  {
    id: 1,
    roomNumber: "101",
    status: RoomStatus.DIRTY,
    priority: RoomPriority.HIGH,
    occupancy: RoomOccupancy.VACANT,
    checkoutTime: "10:00 AM",
    estimatedTime: "45 min",
    notes: "Stay over full clean - John Smith",
    guestCheckout: "10:00 AM",
    guestName: "John Smith",
    bedType: "King",
    serviceStatus: ServiceStatus.PENDING,
    occupancyStatus: "Due-out",
  },
  {
    id: 2,
    roomNumber: "102",
    status: RoomStatus.DIRTY,
    priority: RoomPriority.URGENT,
    occupancy: RoomOccupancy.OCCUPIED,
    checkoutTime: "11:30 AM",
    estimatedTime: "60 min",
    notes: "Stay over full clean - Sarah Johnson",
    guestCheckout: "11:30 AM",
    guestName: "Sarah Johnson",
    bedType: "Queen",
    serviceStatus: ServiceStatus.IN_PROGRESS,
    occupancyStatus: "Stay-over",
  },
  {
    id: 3,
    roomNumber: "103",
    status: RoomStatus.DIRTY,
    priority: RoomPriority.MEDIUM,
    occupancy: RoomOccupancy.VACANT,
    checkoutTime: "9:15 AM",
    estimatedTime: "45 min",
    notes: "Stay over full clean",
    guestCheckout: "9:15 AM",
    guestName: null,
    bedType: "Double",
    serviceStatus: ServiceStatus.PENDING,
    occupancyStatus: "Vacant",
  },
  {
    id: 4,
    roomNumber: "201",
    status: RoomStatus.DIRTY,
    priority: RoomPriority.HIGH,
    occupancy: RoomOccupancy.VACANT,
    checkoutTime: "10:45 AM",
    estimatedTime: "50 min",
    notes: "Departure clean - Michael Brown",
    guestCheckout: "10:45 AM",
    guestName: "Michael Brown",
    bedType: "King",
    serviceStatus: ServiceStatus.PENDING,
    occupancyStatus: "Due-out",
  },
  {
    id: 5,
    roomNumber: "202",
    status: RoomStatus.INSPECTED,
    priority: RoomPriority.LOW,
    occupancy: RoomOccupancy.VACANT,
    checkoutTime: "8:30 AM",
    estimatedTime: "15 min",
    notes: "Departure clean - Ready for guest",
    guestCheckout: "8:30 AM",
    guestName: null,
    bedType: "Queen",
    serviceStatus: ServiceStatus.COMPLETE,
    occupancyStatus: "Ready",
  },
  {
    id: 6,
    roomNumber: "203",
    status: RoomStatus.DIRTY,
    priority: RoomPriority.MEDIUM,
    occupancy: RoomOccupancy.VACANT,
    checkoutTime: "11:00 AM",
    estimatedTime: "45 min",
    notes: "Departure clean - Emily Davis",
    guestCheckout: "11:00 AM",
    guestName: "Emily Davis",
    bedType: "Double",
    serviceStatus: ServiceStatus.PENDING,
    occupancyStatus: "Due-out",
  },
  {
    id: 7,
    roomNumber: "301",
    status: RoomStatus.DIRTY,
    priority: RoomPriority.HIGH,
    occupancy: RoomOccupancy.VACANT,
    checkoutTime: "9:45 AM",
    estimatedTime: "50 min",
    notes: "Departure clean",
    guestCheckout: "9:45 AM",
    guestName: null,
    bedType: "King",
    serviceStatus: ServiceStatus.PENDING,
    occupancyStatus: "Vacant",
  },
  {
    id: 8,
    roomNumber: "302",
    status: RoomStatus.CLEAN,
    priority: RoomPriority.LOW,
    occupancy: RoomOccupancy.OCCUPIED,
    checkoutTime: "10:15 AM",
    estimatedTime: "10 min",
    notes: "Stay over full clean - Robert Wilson",
    guestCheckout: "10:15 AM",
    guestName: "Robert Wilson",
    bedType: "Queen",
    serviceStatus: ServiceStatus.COMPLETE,
    occupancyStatus: "Stay-over",
  },
];

const getStatusColorLine = (status: string) => {
  switch (status) {
    case "dirty":
      return "bg-red-500";
    case "clean":
      return "bg-blue-500";
    case "inspected":
      return "bg-green-500";
    default:
      return "bg-gray-500";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "dirty":
      return "bg-red-100 text-red-800 border-red-200";
    case "clean":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "inspected":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState<
    (typeof roomsToClean)[0] | null
  >(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    cleanliness: [],
    sortBy: "priority",
  });
  const [filteredRooms, setFilteredRooms] = useState(roomsToClean);

  const handleRoomClick = (room: (typeof roomsToClean)[0]) => {
    setSelectedRoom(room);
    setIsSheetOpen(true);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setSelectedRoom(null);
  };

  const handleFilterApply = (newFilters: FilterOptions) => {
    setFilters(newFilters);

    // Filter rooms based on cleanliness status
    let filtered = roomsToClean;
    if (newFilters.cleanliness.length > 0) {
      filtered = roomsToClean.filter((room) =>
        newFilters.cleanliness.includes(room.status)
      );
    }

    // Sort rooms based on selected option
    const sorted = [...filtered].sort((a, b) => {
      switch (newFilters.sortBy) {
        case "priority":
          const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
          return (
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder]
          );
        case "roomNumber":
          return a.roomNumber.localeCompare(b.roomNumber);
        case "checkoutTime":
          return a.guestCheckout?.localeCompare(b.guestCheckout || "") || 0;
        default:
          return 0;
      }
    });

    setFilteredRooms(sorted);
  };

  // Check if any filters are active
  const isFiltersActive = () => {
    return filters.cleanliness.length > 0 || filters.sortBy !== "priority";
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    const defaultFilters: FilterOptions = {
      cleanliness: [],
      sortBy: "priority",
    };
    handleFilterApply(defaultFilters);
  };

  useEffect(() => {
    if (status === "loading") return; // Still loading
    if (!session) {
      router.push("/login");
      return;
    }
  }, [session, status, router]);

  // Initialize filtered rooms on component mount
  useEffect(() => {
    handleFilterApply(filters);
  }, [filters]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Rooms to Clean Today
            </h2>
            <div className="flex items-center gap-2">
              {isFiltersActive() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Clear
                </Button>
              )}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsFilterSheetOpen(true)}
                  className="flex items-center gap-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                  Filter
                </Button>
                {isFiltersActive() && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-2 py-20">
        {/* Room List */}
        <div className="space-y-3">
          {filteredRooms.map((room) => (
            <Card
              key={room.id}
              className="py-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleRoomClick(room)}
            >
              <CardContent className="px-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-5 w-1 rounded-full text-xs font-medium ${getStatusColorLine(
                        room.status
                      )}`}
                    ></div>
                    <div className="text-lg font-semibold tracking-tight text-gray-900">
                      Room {room.roomNumber}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                        room.status
                      )}`}
                    >
                      {room.status.charAt(0).toUpperCase() +
                        room.status.slice(1)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                  <div>
                    <div className="text-gray-600">Guest</div>
                    <div className="font-medium">{room.guestName || "-"}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Service Status</div>
                    <div className="font-medium">
                      {room.serviceStatus || "Not set"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Bed Type</div>
                    <div className="font-medium">
                      {room.bedType || "Not specified"}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600">Next Checkin</div>
                    <div className="font-medium">
                      {room.priority || "Not set"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Room Details Sheet */}
      <RoomDetailsSheet
        room={selectedRoom}
        isOpen={isSheetOpen}
        onClose={handleSheetClose}
      />

      {/* Filter Sheet */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        onApplyFilters={handleFilterApply}
        currentFilters={filters}
      />
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RoomDetailsSheet } from "@/components/room-details-sheet";
import { FilterSheet } from "@/components/filter-sheet";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { useRoomAssignments } from "@/hooks/use-room-assignments";
import { toPascalCase } from "@/lib/utils";
import {
  RoomStatus,
  RoomPriority,
  RoomAssignment,
  FilterOptionsData,
  RoomAssignmentStatus,
  RoomAssignmentPriority,
} from "@/types/room";

// Helper functions to convert enum values to display strings
const getStatusDisplayValue = (status: RoomAssignmentStatus): string => {
  switch (status) {
    case "CLEAN":
      return "clean";
    case "DIRTY":
      return "dirty";
    case "INSPECTED":
      return "inspected";
    default:
      return "unknown";
  }
};

const getPriorityDisplayValue = (priority: RoomAssignmentPriority): string => {
  switch (priority) {
    case "LOW":
      return "Low";
    case "MEDIUM":
      return "Medium";
    case "HIGH":
      return "High";
    case "URGENT":
      return "Urgent";
    default:
      return "Unknown";
  }
};

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
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push("/login");
    },
  });
  const [selectedRoom, setSelectedRoom] = useState<RoomAssignment | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptionsData>({
    cleanliness: [],
    sortBy: "priority",
  });

  // Fetch room assignments using TanStack Query
  const {
    data: roomAssignments = [],
    isLoading,
    error,
  } = useRoomAssignments();

  // Deduplicate room assignments based on room ID and updated timestamp
  const deduplicatedRooms = useMemo(() => {
    if (!roomAssignments || roomAssignments.length === 0) return [];
    
    console.log('🔄 Dashboard: Deduplicating rooms, input count:', roomAssignments.length);
    
    const roomMap = new Map<number, RoomAssignment>(); // Fixed: Use number for room ID
    
    roomAssignments.forEach((room) => {
      const existingRoom = roomMap.get(room.id); // Now using number directly
      
      if (!existingRoom) {
        roomMap.set(room.id, room);
      } else {
        // Keep the room with the most recent updatedAt timestamp
        const existingTime = new Date(existingRoom.updatedAt).getTime();
        const currentTime = new Date(room.updatedAt).getTime();
        
        console.log(`🔄 Dashboard: Duplicate room ${room.id} found. Existing: ${existingTime}, Current: ${currentTime}`);
        
        if (currentTime > existingTime) {
          console.log(`✅ Dashboard: Keeping newer version of room ${room.id}`);
          roomMap.set(room.id, room);
        } else {
          console.log(`⚠️ Dashboard: Keeping existing version of room ${room.id}`);
        }
      }
    });
    
    const result = Array.from(roomMap.values());
    console.log('✅ Dashboard: Deduplication complete, output count:', result.length);
    
    return result;
  }, [roomAssignments]);

  const handleRoomClick = (room: RoomAssignment) => {
    setSelectedRoom(room);
    setIsSheetOpen(true);
  };

  const handleSheetClose = () => {
    setIsSheetOpen(false);
    setSelectedRoom(null);
  };

  const handleFilterApply = (newFilters: FilterOptionsData) => {
    setFilters(newFilters);
  };

  // Check if any filters are active
  const isFiltersActive = () => {
    return (
      (filters.cleanliness && filters.cleanliness.length > 0) ||
      filters.sortBy !== "priority"
    );
  };

  // Reset all filters to default
  const handleResetFilters = () => {
    const defaultFilters: FilterOptionsData = {
      cleanliness: [],
      sortBy: "priority",
    };
    setFilters(defaultFilters);
  };

  // Remove the useEffect since useSession with required: true handles authentication

  if (status === "loading" || isLoading) {
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading room assignments</p>
          <p className="text-sm text-gray-600 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Room Assignments
              </h1>
              <OfflineIndicator />
            </div>
            
            <div className="flex items-center gap-3">
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
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
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
          {deduplicatedRooms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No room assignments found</p>
            </div>
          ) : (
            deduplicatedRooms.map((room) => {
              const statusDisplay = getStatusDisplayValue(room.status);

              return (
                <Card
                  key={`room-${room.id}-${new Date(room.updatedAt).getTime()}`} // More unique key generation
                  className="py-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleRoomClick(room)}
                >
                  <CardContent className="px-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-5 w-1 rounded-full text-xs font-medium ${getStatusColorLine(
                            statusDisplay
                          )}`}
                        ></div>
                        <div className="text-lg font-semibold tracking-tight text-gray-900">
                          Room {room.roomNumber}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            statusDisplay
                          )}`}
                        >
                          {statusDisplay.charAt(0).toUpperCase() +
                            statusDisplay.slice(1)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                      <div>
                        <div className="text-gray-600">Guest</div>
                        <div className="font-medium">
                          {room.guestName || "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Service Status</div>
                        <div className="font-medium">
                          {toPascalCase(room.serviceStatus) || "Not set"}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Bed Type</div>
                        <div className="font-medium">
                          {room.bedType || "Not specified"}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Priority</div>
                        <div className="font-medium">
                          {toPascalCase(room.priority)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Room Details Sheet */}
      <RoomDetailsSheet
        room={selectedRoom as any} // Type compatibility for now
        isOpen={isSheetOpen}
        onClose={handleSheetClose}
      />

      {/* Filter Sheet */}
      <FilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        onApplyFilters={handleFilterApply as any} // Type compatibility for now
        currentFilters={filters as any} // Type compatibility for now
      />
    </div>
  );
}

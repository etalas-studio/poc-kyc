"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useState } from "react";

import { Room } from "@/types/room";

interface RoomDetailsSheetProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
}

type ServiceStatus =
  | "Pending"
  | "Do not Disturb"
  | "Refused Service"
  | "Complete"
  | "In Progress"
  | null;



export function RoomDetailsSheet({
  room,
  isOpen,
  onClose,
}: RoomDetailsSheetProps) {
  const [isRoomClean, setIsRoomClean] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>("Pending");

  if (!room) return null;

  const handleServiceStatusChange = (status: ServiceStatus) => {
    setServiceStatus(status);
    // Here you would typically make an API call to update the service status
    console.log(`Room ${room.roomNumber} service status set to: ${status}`);
  };

  const getServiceStatusColor = (status: ServiceStatus) => {
    switch (status) {
      case "Complete":
        return "bg-green-100 text-green-800 border-green-200";
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Do not Disturb":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Refused Service":
        return "bg-red-100 text-red-800 border-red-200";
      case "Pending":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-screen max-h-none">
        <SheetHeader>
          <SheetTitle className="text-xl">
            Room {room.roomNumber} Details
          </SheetTitle>
          <SheetDescription>
            Complete room information and housekeeping status
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Room Information Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div>
              <h3 className="text-xs font-medium text-gray-600 mb-1">
                Guest Information
              </h3>
              <p className="font-semibold">{room.guestName || "No Guest"}</p>
            </div>

            <div>
              <h3 className="text-xs font-medium text-gray-600 mb-1">
                Bed Type
              </h3>
              <p className="">{room.bedType || "Not specified"}</p>
            </div>

            <div>
              <h3 className="text-xs font-medium text-gray-600 mb-1">
                Checkout Time
              </h3>
              <p className="">{room.guestCheckout || "Not specified"}</p>
            </div>

            <div>
              <h3 className="text-xs font-medium text-gray-600 mb-1">
                Next Check-in
              </h3>
              <p className="">{room.nextCheckin || "Not specified"}</p>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mt-6 p-4 bg-secondary rounded-lg">
            <h4 className="font-medium mb-2">Notes</h4>
            <p className="text-sm text-gray-600">
              Room {room.roomNumber} - {room.bedType} bed configuration.
              {room.guestName
                ? ` Current guest: ${room.guestName}.`
                : " No current guest."}
              {room.occupancyStatus === "Due-out" &&
                " Guest is scheduled to check out."}
            </p>
          </div>

          {/* Housekeeping Actions */}
          <div className="mt-4 space-y-4">
            {/* Mark Room as Clean */}

            {/* Service Status Selection */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Service Status
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={
                    serviceStatus === "Pending" ? "default" : "outline"
                  }
                  onClick={() => handleServiceStatusChange("Pending")}
                  size="lg"
                  className="text-xs"
                >
                  Pending
                </Button>
                <Button
                  variant={serviceStatus === "Complete" ? "default" : "outline"}
                  onClick={() => handleServiceStatusChange("Complete")}
                  size="lg"
                  className="text-xs"
                >
                  Complete
                </Button>
                <Button
                  variant={
                    serviceStatus === "Do not Disturb" ? "default" : "outline"
                  }
                  onClick={() => handleServiceStatusChange("Do not Disturb")}
                  size="lg"
                  className="text-xs"
                >
                  Do Not Disturb
                </Button>
                <Button
                  variant={
                    serviceStatus === "Refused Service" ? "default" : "outline"
                  }
                  onClick={() => handleServiceStatusChange("Refused Service")}
                  size="lg"
                  className="text-xs"
                >
                  Refused Service
                </Button>
                <Button
                  variant={
                    serviceStatus === "In Progress" ? "default" : "outline"
                  }
                  onClick={() => handleServiceStatusChange("In Progress")}
                  size="lg"
                  className="text-xs col-span-2"
                >
                  In Progress
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

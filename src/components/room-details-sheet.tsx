"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";

import { Room, ServiceStatus } from "@/types/room";
import { offlineManager } from "@/lib/offline/offline-manager";
import { backgroundSyncService } from "@/lib/offline/background-sync";
import { roomAssignmentKeys } from "@/hooks/use-room-assignments";

interface RoomDetailsSheetProps {
  room: Room | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RoomDetailsSheet({
  room,
  isOpen,
  onClose,
}: RoomDetailsSheetProps) {
  const queryClient = useQueryClient();
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(
    room?.serviceStatus || ServiceStatus.PENDING
  );
  const [housekeepingNote, setHousekeepingNote] = useState(
    room?.notes || ""
  );
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Initialize offline manager and sync service
  useEffect(() => {
    const initializeOfflineServices = async () => {
      try {
        await offlineManager.init();
        console.log('Offline manager initialized in RoomDetailsSheet');
      } catch (error) {
        console.error('Failed to initialize offline services:', error);
      }
    };

    initializeOfflineServices();

    // Listen for online/offline status changes
    const handleOnline = () => {
      setIsOffline(false);
      // Trigger sync when coming back online
      backgroundSyncService.forcSync();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for sync status changes
    const handleSyncStatusChange = (status: 'idle' | 'syncing' | 'error') => {
      setIsSyncing(status === 'syncing');
    };

    offlineManager.on('sync-status-changed', handleSyncStatusChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      offlineManager.off('sync-status-changed', handleSyncStatusChange);
    };
  }, []);

  // Sync form state when room changes
  useEffect(() => {
    if (room) {
      setServiceStatus(room.serviceStatus || ServiceStatus.PENDING);
      setHousekeepingNote(room.notes || "");
    }
  }, [room]);

  if (!room) return null;

  const handleServiceStatusChange = (status: ServiceStatus) => {
    setServiceStatus(status);
    // Here you would typically make an API call to update the service status
    console.log(`Room ${room.roomNumber} service status set to: ${status}`);
  };

  const handleSubmit = async () => {
    if (!room) return;

    setIsUpdating(true);

    try {
      const updateData: any = {
        serviceStatus,
        housekeepingNote,
      };

      // Logic: Jika serviceStatus = COMPLETE, maka status kamar jadi CLEAN
      // Selain itu, status kamar tetap DIRTY (atau tidak berubah)
      if (serviceStatus === ServiceStatus.COMPLETE) {
        updateData.status = 'CLEAN';
      }

      // OPTIMISTIC UPDATE: Update UI immediately before actual update
      const optimisticRoom = {
        ...room,
        serviceStatus,
        notes: housekeepingNote,
        status: serviceStatus === ServiceStatus.COMPLETE ? 'CLEAN' : room.status,
        updatedAt: new Date().toISOString(),
      };

      // Don't update React Query cache optimistically to prevent duplicates
      // Let the offline manager and event system handle the updates

      // Show immediate feedback
      const immediateMessage = serviceStatus === ServiceStatus.COMPLETE 
        ? `Room ${room.roomNumber} marked as CLEAN and COMPLETE!`
        : `Room ${room.roomNumber} service status updated!`;
      
      toast.success(immediateMessage);

      // Close the sheet immediately for better UX
      onClose();

      // Perform actual update in background
      try {
        await offlineManager.updateRoom(room.id, updateData); // Fixed: Use number directly

        // Show sync status message
        if (isOffline) {
          toast.info(`Changes saved offline. Will sync when connection is restored.`, {
            autoClose: 3000,
          });
        } else {
          // Trigger background sync for immediate server update
          backgroundSyncService.forcSync();
          toast.success(`Changes synced to server successfully!`, {
            autoClose: 2000,
          });
        }

      } catch (updateError) {
        console.error('Failed to update room in background:', updateError);
        
        // Revert optimistic update on failure
        queryClient.invalidateQueries({ queryKey: roomAssignmentKeys.all });
        
        toast.error(`Failed to save changes for room ${room.roomNumber}. Please try again.`);
      }

    } catch (error) {
      console.error('Failed to perform optimistic update:', error);
      toast.error(`Failed to update room ${room.roomNumber}. Please try again.`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-screen max-h-none flex flex-col">
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
            {/* Service Status Selection */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Service Status
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={
                    serviceStatus === ServiceStatus.PENDING
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    handleServiceStatusChange(ServiceStatus.PENDING)
                  }
                  size="lg"
                  className=""
                >
                  Pending
                </Button>
                <Button
                  variant={
                    serviceStatus === ServiceStatus.COMPLETE
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    handleServiceStatusChange(ServiceStatus.COMPLETE)
                  }
                  size="lg"
                  className=""
                >
                  Complete
                </Button>
                <Button
                  variant={
                    serviceStatus === ServiceStatus.DO_NOT_DISTURB
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    handleServiceStatusChange(ServiceStatus.DO_NOT_DISTURB)
                  }
                  size="lg"
                  className=""
                >
                  Do Not Disturb
                </Button>
                <Button
                  variant={
                    serviceStatus === ServiceStatus.REFUSED_SERVICE
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    handleServiceStatusChange(ServiceStatus.REFUSED_SERVICE)
                  }
                  size="lg"
                  className=""
                >
                  Refused Service
                </Button>
                <Button
                  variant={
                    serviceStatus === ServiceStatus.IN_PROGRESS
                      ? "default"
                      : "outline"
                  }
                  onClick={() =>
                    handleServiceStatusChange(ServiceStatus.IN_PROGRESS)
                  }
                  size="lg"
                  className="col-span-2"
                >
                  In Progress
                </Button>
              </div>
            </div>

            {/* Housekeeping Note */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">
                Housekeeping Notes
              </h4>
              <Textarea
                placeholder="Add any housekeeping notes or observations..."
                value={housekeepingNote}
                onChange={(e) => setHousekeepingNote(e.target.value)}
                className="min-h-24"
              />
            </div>
          </div>
        </div>

        {/* Submit Button - Sticky at bottom with sync indicators */}
        <div className="sticky bottom-0 bg-white border-t p-4 space-y-2">
          {/* Sync Status Indicator */}
          {(isOffline || isSyncing) && (
            <div className="flex items-center justify-center space-x-2 text-sm">
              {isOffline && (
                <div className="flex items-center space-x-1 text-orange-600">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Offline - Changes will sync when online</span>
                </div>
              )}
              {isSyncing && (
                <div className="flex items-center space-x-1 text-blue-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Syncing changes...</span>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            className="w-full"
            size="lg"
            disabled={isSyncing}
          >
            {isSyncing ? "Syncing..." : "Submit Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

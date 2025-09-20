"use client";

import { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { offlineManager } from "@/lib/offline/offline-manager";
import { backgroundSyncService } from "@/lib/offline/background-sync";

interface OfflineIndicatorProps {
  className?: string;
  showText?: boolean;
}

export function OfflineIndicator({
  className,
  showText = true,
}: OfflineIndicatorProps) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">(
    "idle"
  );
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  useEffect(() => {
    // Listen for online/offline status changes
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for sync status changes
    const handleSyncStatusChange = (status: "idle" | "syncing" | "error") => {
      setSyncStatus(status);
    };

    offlineManager.on("sync-status-changed", handleSyncStatusChange);

    // Update pending sync count
    const updatePendingSyncCount = async () => {
      try {
        const pendingItems = await offlineManager.getPendingSyncItems();
        setPendingSyncCount(pendingItems.length);
      } catch (error) {
        console.error("Failed to get pending sync count:", error);
      }
    };

    // Update count initially and on data changes
    updatePendingSyncCount();
    offlineManager.on("data-updated", updatePendingSyncCount);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      offlineManager.off("sync-status-changed", handleSyncStatusChange);
      offlineManager.off("data-updated", updatePendingSyncCount);
    };
  }, []);

  const getStatusIcon = () => {
    if (syncStatus === "syncing") {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    if (syncStatus === "error") {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (isOffline) {
      return <WifiOff className="h-4 w-4 text-orange-500" />;
    }
    if (pendingSyncCount === 0) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Wifi className="h-4 w-4 text-blue-500" />;
  };

  const getStatusText = () => {
    if (syncStatus === "syncing") {
      return "Syncing...";
    }
    if (syncStatus === "error") {
      return "Sync Error";
    }
    if (isOffline) {
      return pendingSyncCount > 0
        ? `Offline (${pendingSyncCount} pending)`
        : "Offline";
    }
    if (pendingSyncCount > 0) {
      return `${pendingSyncCount} pending sync`;
    }
    return "All synced";
  };

  const getStatusColor = () => {
    if (syncStatus === "error") return "text-red-500";
    if (isOffline) return "text-orange-500";
    if (syncStatus === "syncing") return "text-blue-500";
    if (pendingSyncCount === 0) return "text-green-500";
    return "text-blue-500";
  };

  const handleClick = () => {
    if (!isOffline && pendingSyncCount > 0) {
      backgroundSyncService.forcSync();
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-full border transition-colors",
        "cursor-pointer hover:bg-gray-50",
        getStatusColor(),
        className
      )}
      onClick={handleClick}
      title={`Click to ${
        !isOffline && pendingSyncCount > 0 ? "force sync" : "view status"
      }`}
    >
      {getStatusIcon()}
      {showText && (
        <span className="text-sm font-medium">{getStatusText()}</span>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { RoomStatus, FilterOptions } from "@/types/room";

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export function FilterSheet({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters,
}: FilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(currentFilters);

  const cleanlinessOptions = [
    { value: RoomStatus.DIRTY, label: "Dirty" },
    { value: RoomStatus.CLEAN, label: "Clean" },
    { value: RoomStatus.INSPECTED, label: "Inspected" },
  ];

  const sortOptions = [
    { value: "priority", label: "Priority (High to Low)" },
    { value: "roomNumber", label: "Room Number" },
    { value: "checkoutTime", label: "Checkout Time" },
  ];

  const handleCleanlinessToggle = (value: RoomStatus) => {
    setLocalFilters((prev) => ({
      ...prev,
      cleanliness: prev.cleanliness.includes(value)
        ? prev.cleanliness.filter((item) => item !== value)
        : [...prev.cleanliness, value],
    }));
  };

  const handleSortChange = (value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      sortBy: value,
    }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      cleanliness: [],
      sortBy: "priority",
    };
    setLocalFilters(resetFilters);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh]">
        <SheetHeader>
          <SheetTitle>Filter & Sort Rooms</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 p-4">
          {/* Cleanliness Filter */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Filter by Cleanliness Status
            </Label>
            <div className="space-y-2">
              {cleanlinessOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={option.value}
                    checked={localFilters.cleanliness.includes(option.value)}
                    onChange={() => handleCleanlinessToggle(option.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label
                    htmlFor={option.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <Label className="text-base font-medium mb-3 block">
              Sort by Queue
            </Label>
            <div className="space-y-2">
              {sortOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id={option.value}
                    name="sortBy"
                    value={option.value}
                    checked={localFilters.sortBy === option.value}
                    onChange={() => handleSortChange(option.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <Label
                    htmlFor={option.value}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <SheetFooter className="flex flex-row gap-2 p-4">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            Reset
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
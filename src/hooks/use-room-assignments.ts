import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RoomAssignment, CreateRoomAssignmentData, FilterOptionsData } from "@/types/room";

// Query keys
export const roomAssignmentKeys = {
  all: ['room-assignments'] as const,
  lists: () => [...roomAssignmentKeys.all, 'list'] as const,
  list: (filters?: FilterOptionsData) => [...roomAssignmentKeys.lists(), { filters }] as const,
  details: () => [...roomAssignmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...roomAssignmentKeys.details(), id] as const,
};

// API functions
async function fetchRoomAssignments(): Promise<RoomAssignment[]> {
  const response = await fetch('/api/room-assignments');
  if (!response.ok) {
    throw new Error('Failed to fetch room assignments');
  }
  return response.json();
}

async function createRoomAssignment(data: CreateRoomAssignmentData): Promise<RoomAssignment> {
  const response = await fetch('/api/room-assignments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create room assignment');
  }
  
  return response.json();
}

// Hooks
export function useRoomAssignments(filters?: FilterOptionsData) {
  return useQuery({
    queryKey: roomAssignmentKeys.list(filters),
    queryFn: fetchRoomAssignments,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateRoomAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createRoomAssignment,
    onSuccess: () => {
      // Invalidate and refetch room assignments
      queryClient.invalidateQueries({ queryKey: roomAssignmentKeys.all });
    },
  });
}

// Additional utility hooks
export function useRoomAssignmentsByStatus(status?: string) {
  const { data: assignments, ...rest } = useRoomAssignments();
  
  const filteredAssignments = assignments?.filter(assignment => 
    !status || assignment.status === status
  );
  
  return {
    data: filteredAssignments,
    ...rest,
  };
}

export function useRoomAssignmentsByPriority(priority?: string) {
  const { data: assignments, ...rest } = useRoomAssignments();
  
  const filteredAssignments = assignments?.filter(assignment => 
    !priority || assignment.priority === priority
  );
  
  return {
    data: filteredAssignments,
    ...rest,
  };
}
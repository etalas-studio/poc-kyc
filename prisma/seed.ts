import { PrismaClient } from '../src/generated/prisma';
import { RoomAssignmentStatus, RoomAssignmentPriority, RoomOccupancy, ServiceStatus } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  await prisma.roomAssignment.deleteMany();
  console.log('🗑️  Cleared existing room assignments');

  // Sample room assignments data
  const roomAssignments = [
    {
      roomNumber: '101',
      status: RoomAssignmentStatus.DIRTY,
      priority: RoomAssignmentPriority.HIGH,
      occupancy: RoomOccupancy.VACANT,
      checkoutTime: '10:00 AM',
      estimatedTime: '45 min',
      notes: 'Stay over full clean - John Smith',
      guestCheckout: '10:00 AM',
      guestName: 'John Smith',
      bedType: 'King',
      serviceStatus: ServiceStatus.PENDING,
      occupancyStatus: 'Due-out',
    },
    {
      roomNumber: '102',
      status: RoomAssignmentStatus.DIRTY,
      priority: RoomAssignmentPriority.URGENT,
      occupancy: RoomOccupancy.OCCUPIED,
      checkoutTime: '11:30 AM',
      estimatedTime: '60 min',
      notes: 'Stay over full clean - Sarah Johnson',
      guestCheckout: '11:30 AM',
      guestName: 'Sarah Johnson',
      bedType: 'Queen',
      serviceStatus: ServiceStatus.IN_PROGRESS,
      occupancyStatus: 'Stay-over',
    },
    {
      roomNumber: '103',
      status: RoomAssignmentStatus.DIRTY,
      priority: RoomAssignmentPriority.MEDIUM,
      occupancy: RoomOccupancy.VACANT,
      checkoutTime: '9:15 AM',
      estimatedTime: '45 min',
      notes: 'Stay over full clean',
      guestCheckout: '9:15 AM',
      guestName: null,
      bedType: 'Double',
      serviceStatus: ServiceStatus.PENDING,
      occupancyStatus: 'Vacant',
    },
    {
      roomNumber: '201',
      status: RoomAssignmentStatus.DIRTY,
      priority: RoomAssignmentPriority.HIGH,
      occupancy: RoomOccupancy.VACANT,
      checkoutTime: '10:45 AM',
      estimatedTime: '50 min',
      notes: 'Departure clean - Michael Brown',
      guestCheckout: '10:45 AM',
      guestName: 'Michael Brown',
      bedType: 'King',
      serviceStatus: ServiceStatus.PENDING,
      occupancyStatus: 'Due-out',
    },
    {
      roomNumber: '202',
      status: RoomAssignmentStatus.INSPECTED,
      priority: RoomAssignmentPriority.LOW,
      occupancy: RoomOccupancy.VACANT,
      checkoutTime: '8:30 AM',
      estimatedTime: '15 min',
      notes: 'Departure clean - Ready for guest',
      guestCheckout: '8:30 AM',
      guestName: null,
      bedType: 'Queen',
      serviceStatus: ServiceStatus.COMPLETE,
      occupancyStatus: 'Ready',
    },
    {
      roomNumber: '203',
      status: RoomAssignmentStatus.DIRTY,
      priority: RoomAssignmentPriority.MEDIUM,
      occupancy: RoomOccupancy.VACANT,
      checkoutTime: '11:00 AM',
      estimatedTime: '45 min',
      notes: 'Departure clean - Emily Davis',
      guestCheckout: '11:00 AM',
      guestName: 'Emily Davis',
      bedType: 'Double',
      serviceStatus: ServiceStatus.PENDING,
      occupancyStatus: 'Due-out',
    },
    {
      roomNumber: '301',
      status: RoomAssignmentStatus.DIRTY,
      priority: RoomAssignmentPriority.HIGH,
      occupancy: RoomOccupancy.VACANT,
      checkoutTime: '9:45 AM',
      estimatedTime: '50 min',
      notes: 'Departure clean',
      guestCheckout: '9:45 AM',
      guestName: null,
      bedType: 'King',
      serviceStatus: ServiceStatus.PENDING,
      occupancyStatus: 'Vacant',
    },
    {
      roomNumber: '302',
      status: RoomAssignmentStatus.CLEAN,
      priority: RoomAssignmentPriority.LOW,
      occupancy: RoomOccupancy.OCCUPIED,
      checkoutTime: '10:15 AM',
      estimatedTime: '10 min',
      notes: 'Stay over full clean - Robert Wilson',
      guestCheckout: '10:15 AM',
      guestName: 'Robert Wilson',
      bedType: 'Queen',
      serviceStatus: ServiceStatus.COMPLETE,
      occupancyStatus: 'Stay-over',
    },
    {
      roomNumber: '303',
      status: RoomAssignmentStatus.DIRTY,
      priority: RoomAssignmentPriority.URGENT,
      occupancy: RoomOccupancy.VACANT,
      checkoutTime: '8:00 AM',
      estimatedTime: '55 min',
      notes: 'VIP guest arriving soon - priority clean',
      guestCheckout: '8:00 AM',
      guestName: 'VIP Guest',
      bedType: 'Suite',
      serviceStatus: ServiceStatus.PENDING,
      occupancyStatus: 'VIP Arrival',
    },
    {
      roomNumber: '401',
      status: RoomAssignmentStatus.CLEAN,
      priority: RoomAssignmentPriority.MEDIUM,
      occupancy: RoomOccupancy.VACANT,
      checkoutTime: '9:30 AM',
      estimatedTime: '20 min',
      notes: 'Final inspection needed',
      guestCheckout: '9:30 AM',
      guestName: null,
      bedType: 'King',
      serviceStatus: ServiceStatus.IN_PROGRESS,
      occupancyStatus: 'Ready for inspection',
    },
  ];

  // Create room assignments
  for (const roomData of roomAssignments) {
    await prisma.roomAssignment.create({
      data: roomData,
    });
  }

  console.log(`✅ Created ${roomAssignments.length} room assignments`);
  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
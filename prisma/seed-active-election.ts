import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding active election with candidates...');

  // Get Computer Science department
  const csDept = await prisma.department.findUnique({
    where: { code: 'CS' }
  });

  if (!csDept) {
    console.log('❌ Computer Science department not found. Run main seed first.');
    return;
  }

  // Create test students who will be candidates
  const hashedPassword = await argon2.hash('password123');

  const candidates = await Promise.all([
    prisma.user.upsert({
      where: { studentRegistrationNumber: 'CS/2021/001' },
      update: {},
      create: {
        studentRegistrationNumber: 'CS/2021/001',
        fullName: 'Amina Wanjiru',
        email: 'amina.wanjiru@student.mut.ac.ke',
        passwordHash: hashedPassword,
        departmentId: csDept.id,
        accountStatus: 'ACTIVE',
      },
    }),
    prisma.user.upsert({
      where: { studentRegistrationNumber: 'CS/2021/002' },
      update: {},
      create: {
        studentRegistrationNumber: 'CS/2021/002',
        fullName: 'Brian Otieno',
        email: 'brian.otieno@student.mut.ac.ke',
        passwordHash: hashedPassword,
        departmentId: csDept.id,
        accountStatus: 'ACTIVE',
      },
    }),
    prisma.user.upsert({
      where: { studentRegistrationNumber: 'CS/2021/003' },
      update: {},
      create: {
        studentRegistrationNumber: 'CS/2021/003',
        fullName: 'Caroline Njeri',
        email: 'caroline.njeri@student.mut.ac.ke',
        passwordHash: hashedPassword,
        departmentId: csDept.id,
        accountStatus: 'ACTIVE',
      },
    }),
  ]);

  console.log(`✓ Created ${candidates.length} candidate users`);

  // Create an OPEN election
  const election = await prisma.election.upsert({
    where: { 
      id: 'election-2026-student-council' // Use ID for uniqueness
    },
    update: {
      status: 'OPEN',
    },
    create: {
      id: 'election-2026-student-council',
      name: 'Student Council Elections 2026',
      stage: 'STUDENT_COUNCIL',
      academicYear: '2026/2027',
      status: 'OPEN',
      startAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Ends in 7 days
    },
  });

  console.log('✓ Created OPEN election:', election.name);

  // Create position: President (Student Council - no department)
  // First check if it exists
  let presidentPosition = await prisma.position.findFirst({
    where: {
      electionId: election.id,
      departmentId: null,
      name: 'President',
    },
  });

  // If not, create it
  if (!presidentPosition) {
    presidentPosition = await prisma.position.create({
      data: {
        electionId: election.id,
        departmentId: null,
        name: 'President',
        numberOfSeats: 1,
        votingMethod: 'SINGLE_WINNER',
      },
    });
  }

  console.log('✓ Created position: President');

  // Create candidates for President position
  const candidatesData = [
    {
      userId: candidates[0].id,
      manifesto: 'I will work to improve student welfare, enhance campus facilities, and ensure every student voice is heard. Together, we will build a better university!',
      ballotNumber: 1,
    },
    {
      userId: candidates[1].id,
      manifesto: 'My focus is on academic excellence, better library resources, and creating more opportunities for internships and career development.',
      ballotNumber: 2,
    },
    {
      userId: candidates[2].id,
      manifesto: 'I promise to prioritize mental health support, improve campus safety, and organize more social events to build our community.',
      ballotNumber: 3,
    },
  ];

  for (const candidateData of candidatesData) {
    await prisma.candidate.upsert({
      where: {
        userId_electionId_positionId: {
          userId: candidateData.userId,
          electionId: election.id,
          positionId: presidentPosition.id,
        },
      },
      update: {
        approvalStatus: 'APPROVED',
        ballotNumber: candidateData.ballotNumber,
      },
      create: {
        userId: candidateData.userId,
        electionId: election.id,
        positionId: presidentPosition.id,
        manifesto: candidateData.manifesto,
        approvalStatus: 'APPROVED',
        ballotNumber: candidateData.ballotNumber,
      },
    });
  }

  console.log('✓ Created 3 approved candidates for President position');

  // Create voter eligibility for all users for this position
  const allUsers = await prisma.user.findMany();
  
  for (const user of allUsers) {
    await prisma.voterEligibility.upsert({
      where: {
        userId_electionId_positionId: {
          userId: user.id,
          electionId: election.id,
          positionId: presidentPosition.id,
        },
      },
      update: {},
      create: {
        userId: user.id,
        electionId: election.id,
        positionId: presidentPosition.id,
        eligible: true,
      },
    });
  }

  console.log(`✓ Created voter eligibility for ${allUsers.length} users`);

  console.log('\n✅ Active election seed completed!');
  console.log('\n📊 Summary:');
  console.log(`   Election: ${election.name}`);
  console.log(`   Status: ${election.status}`);
  console.log(`   Position: President`);
  console.log(`   Candidates: 3 (Amina, Brian, Caroline)`);
  console.log(`   Eligible Voters: ${allUsers.length}`);
  console.log('\n🗳️  Users can now login and vote immediately!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

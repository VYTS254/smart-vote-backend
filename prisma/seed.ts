import { PrismaClient, RoleName, AccountStatus } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Roles
  console.log('Creating roles...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: RoleName.ADMIN },
      update: {},
      create: {
        name: RoleName.ADMIN,
        description: 'System administrator with full access',
      },
    }),
    prisma.role.upsert({
      where: { name: RoleName.ELECTION_OFFICER },
      update: {},
      create: {
        name: RoleName.ELECTION_OFFICER,
        description: 'Election officer who manages elections and verifies results',
      },
    }),
    prisma.role.upsert({
      where: { name: RoleName.STUDENT },
      update: {},
      create: {
        name: RoleName.STUDENT,
        description: 'Regular student voter',
      },
    }),
    prisma.role.upsert({
      where: { name: RoleName.DELEGATE },
      update: {},
      create: {
        name: RoleName.DELEGATE,
        description: 'Elected departmental delegate',
      },
    }),
  ]);
  console.log(`✓ Created ${roles.length} roles`);

  // Create Departments
  console.log('Creating departments...');
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { code: 'CS' },
      update: {},
      create: {
        name: 'Computer Science',
        code: 'CS',
        status: 'ACTIVE',
      },
    }),
    prisma.department.upsert({
      where: { code: 'ENG' },
      update: {},
      create: {
        name: 'Engineering',
        code: 'ENG',
        status: 'ACTIVE',
      },
    }),
    prisma.department.upsert({
      where: { code: 'BUS' },
      update: {},
      create: {
        name: 'Business Administration',
        code: 'BUS',
        status: 'ACTIVE',
      },
    }),
    prisma.department.upsert({
      where: { code: 'MED' },
      update: {},
      create: {
        name: 'Medicine',
        code: 'MED',
        status: 'ACTIVE',
      },
    }),
    prisma.department.upsert({
      where: { code: 'LAW' },
      update: {},
      create: {
        name: 'Law',
        code: 'LAW',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log(`✓ Created ${departments.length} departments`);

  // Create Political Parties
  console.log('Creating political parties...');
  const parties = await Promise.all([
    prisma.party.upsert({
      where: { abbreviation: 'SUP' },
      update: {},
      create: {
        name: 'Students United Party',
        abbreviation: 'SUP',
        description: 'Dedicated to student welfare and academic excellence',
        status: 'ACTIVE',
      },
    }),
    prisma.party.upsert({
      where: { abbreviation: 'PCP' },
      update: {},
      create: {
        name: 'Progressive Campus Party',
        abbreviation: 'PCP',
        description: 'Fighting for progressive change and student rights',
        status: 'ACTIVE',
      },
    }),
    prisma.party.upsert({
      where: { abbreviation: 'VSA' },
      update: {},
      create: {
        name: 'Voice of Student Action',
        abbreviation: 'VSA',
        description: 'Taking action for student concerns',
        status: 'ACTIVE',
      },
    }),
  ]);
  console.log(`✓ Created ${parties.length} political parties`);

  // Create Admin User
  console.log('Creating admin user...');
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const adminPasswordHash = await argon2.hash(adminPassword);

  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@university.edu' },
    update: {},
    create: {
      studentRegistrationNumber: process.env.ADMIN_STUDENT_ID || 'ADMIN001',
      fullName: 'System Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@university.edu',
      passwordHash: adminPasswordHash,
      departmentId: departments[0].id,
      accountStatus: AccountStatus.ACTIVE,
    },
  });

  // Assign admin role
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: roles[0].id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: roles[0].id,
    },
  });
  console.log(`✓ Created admin user: ${adminUser.email}`);
  console.log(`  Password: ${adminPassword}`);

  // Create Sample Students
  console.log('Creating sample students...');
  const samplePassword = await argon2.hash('Student@123');

  for (let i = 1; i <= 10; i++) {
    const deptIndex = i % departments.length;
    const student = await prisma.user.upsert({
      where: { email: `student${i}@university.edu` },
      update: {},
      create: {
        studentRegistrationNumber: `STU${String(i).padStart(4, '0')}`,
        fullName: `Student ${i}`,
        email: `student${i}@university.edu`,
        passwordHash: samplePassword,
        departmentId: departments[deptIndex].id,
        accountStatus: AccountStatus.ACTIVE,
      },
    });

    // Assign student role
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: student.id,
          roleId: roles[2].id, // STUDENT role
        },
      },
      update: {},
      create: {
        userId: student.id,
        roleId: roles[2].id,
      },
    });
  }
  console.log('✓ Created 10 sample students');
  console.log('  Password for all students: Student@123');

  console.log('\n✅ Database seed completed successfully!');
  console.log('\n📝 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:');
  console.log(`  Email: ${adminUser.email}`);
  console.log(`  Registration: ${adminUser.studentRegistrationNumber}`);
  console.log(`  Password: ${adminPassword}`);
  console.log('\nSample Students:');
  console.log('  Registration: STU0001 to STU0010');
  console.log('  Email: student1@university.edu to student10@university.edu');
  console.log('  Password: Student@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

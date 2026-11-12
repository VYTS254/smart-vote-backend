const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyDatabase() {
  try {
    console.log('Checking Smart Vote database tables...\n');

    const tables = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log('Tables found:', tables.length);

    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });

  } catch (error) {
    console.error('Verification failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
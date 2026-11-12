
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyModels() {
  const models = [
    ['Users', prisma.user],
    ['Departments', prisma.department],
    ['Roles', prisma.role],
    ['User Roles', prisma.userRole],
    ['Parties', prisma.party],
    ['Elections', prisma.election],
    ['Positions', prisma.position],
    ['Candidates', prisma.candidate],
    ['Voter Eligibility', prisma.voterEligibility],
    ['Ballot Submissions', prisma.ballotSubmission],
    ['Vote Selections', prisma.voteSelection],
    ['Delegate Qualifications', prisma.delegateQualification],
    ['Results', prisma.result],
    ['Notifications', prisma.notification],
    ['Audit Logs', prisma.auditLog],
  ];

  try {
    console.log('\nSMART VOTE DATABASE VERIFICATION\n');

    for (const [name, model] of models) {
      try {
        const count = await model.count();
        console.log(`✓ ${name}: ${count} records`);
      } catch (error) {
        console.log(`✗ ${name}: ${error.message}`);
      }
    }

    console.log('\nVerification completed.');

  } catch (error) {
    console.error('Verification error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

verifyModels();

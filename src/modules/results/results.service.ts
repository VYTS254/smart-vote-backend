import prisma from '../../config/database';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors';
import { ElectionStatus, ElectionStage, VerificationStatus, RoleName } from '@prisma/client';

export class ResultsService {
  /**
   * Count votes for an election
   * This should only be called after the election is closed
   */
  async countVotes(electionId: string) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          include: {
            candidates: {
              where: {
                approvalStatus: 'APPROVED',
              },
            },
          },
        },
      },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    if (election.status !== ElectionStatus.CLOSED) {
      throw new ConflictError('Can only count votes for closed elections');
    }

    const results = [];

    // Count votes for each position
    for (const position of election.positions) {
      for (const candidate of position.candidates) {
        // Count vote selections for this candidate
        const voteCount = await prisma.voteSelection.count({
          where: {
            candidateId: candidate.id,
            ballotSubmission: {
              electionId,
              positionId: position.id,
            },
          },
        });

        // Calculate total eligible voters for this position
        const totalEligible = await prisma.voterEligibility.count({
          where: {
            electionId,
            positionId: position.id,
          },
        });

        const percentage = totalEligible > 0 ? (voteCount / totalEligible) * 100 : 0;

        results.push({
          candidateId: candidate.id,
          positionId: position.id,
          voteCount,
          percentage,
        });
      }
    }

    // Sort by position and vote count
    results.sort((a, b) => {
      if (a.positionId !== b.positionId) {
        return a.positionId.localeCompare(b.positionId);
      }
      return b.voteCount - a.voteCount;
    });

    // Assign ranks within each position
    const rankedResults = [];
    let currentPositionId = '';
    let currentRank = 0;
    let previousVoteCount = -1;

    for (const result of results) {
      if (result.positionId !== currentPositionId) {
        currentPositionId = result.positionId;
        currentRank = 1;
        previousVoteCount = result.voteCount;
      } else if (result.voteCount < previousVoteCount) {
        currentRank++;
        previousVoteCount = result.voteCount;
      }
      // If same vote count, keep same rank (tie)

      rankedResults.push({
        ...result,
        rank: currentRank,
      });
    }

    // Store or update results in database
    await prisma.$transaction(async (tx) => {
      for (const result of rankedResults) {
        await tx.result.upsert({
          where: {
            electionId_positionId_candidateId: {
              electionId,
              positionId: result.positionId,
              candidateId: result.candidateId,
            },
          },
          create: {
            electionId,
            positionId: result.positionId,
            candidateId: result.candidateId,
            voteTotal: result.voteCount,
            votePercentage: result.percentage,
            rank: result.rank,
            verificationStatus: VerificationStatus.PENDING,
          },
          update: {
            voteTotal: result.voteCount,
            votePercentage: result.percentage,
            rank: result.rank,
          },
        });
      }
    });

    return rankedResults;
  }

  /**
   * Get results for an election
   */
  async getElectionResults(electionId: string, includeUnverified = false) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    // Only show results after election is closed
    if (election.status === ElectionStatus.OPEN) {
      throw new ConflictError('Results are not available while election is ongoing');
    }

    const where: any = { electionId };

    // Only show verified results to public unless includeUnverified is true
    if (!includeUnverified && election.status !== ElectionStatus.PUBLISHED) {
      throw new ConflictError('Results have not been published yet');
    }

    const results = await prisma.result.findMany({
      where,
      include: {
        candidate: {
          include: {
            user: {
              select: {
                fullName: true,
                studentRegistrationNumber: true,
                department: true,
              },
            },
            party: {
              select: {
                name: true,
                abbreviation: true,
              },
            },
          },
        },
        position: {
          include: {
            department: true,
          },
        },
      },
      orderBy: [
        { position: { name: 'asc' } },
        { rank: 'asc' },
        { voteTotal: 'desc' },
      ],
    });

    // Group by position
    const positionResults = new Map();

    for (const result of results) {
      const positionId = result.positionId;

      if (!positionResults.has(positionId)) {
        positionResults.set(positionId, {
          position: {
            id: result.position.id,
            name: result.position.name,
            numberOfSeats: result.position.numberOfSeats,
            department: result.position.department?.name || 'All Departments',
          },
          candidates: [],
        });
      }

      positionResults.get(positionId).candidates.push({
        rank: result.rank,
        candidateId: result.candidateId,
        fullName: result.candidate.user.fullName,
        department: result.candidate.user.department.name,
        party: result.candidate.party?.abbreviation || 'Independent',
        voteTotal: result.voteTotal,
        votePercentage: result.votePercentage.toFixed(2),
        isWinner: result.isWinner,
      });
    }

    return {
      election: {
        id: election.id,
        name: election.name,
        stage: election.stage,
        status: election.status,
      },
      positions: Array.from(positionResults.values()),
    };
  }

  /**
   * Select top delegates for departmental elections
   * Selects top 5 candidates per department
   */
  async selectDepartmentalDelegates(electionId: string) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    if (election.stage !== ElectionStage.DEPARTMENTAL) {
      throw new BadRequestError('This function is only for departmental elections');
    }

    if (election.status !== ElectionStatus.VERIFIED) {
      throw new ConflictError('Election results must be verified before selecting delegates');
    }

    const delegatesSelected = [];

    // For each department position
    for (const position of election.positions) {
      if (!position.departmentId) continue;

      // Get top 5 candidates
      const topCandidates = await prisma.result.findMany({
        where: {
          electionId,
          positionId: position.id,
        },
        include: {
          candidate: {
            include: {
              user: true,
            },
          },
        },
        orderBy: [{ rank: 'asc' }, { voteTotal: 'desc' }],
        take: 5,
      });

      // Mark top 5 as winners and create delegate qualifications
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < topCandidates.length && i < 5; i++) {
          const result = topCandidates[i];

          // Mark as winner
          await tx.result.update({
            where: {
              id: result.id,
            },
            data: {
              isWinner: true,
            },
          });

          // Create delegate qualification
          await tx.delegateQualification.upsert({
            where: {
              studentId_qualifyingElectionId: {
                studentId: result.candidate.userId,
                qualifyingElectionId: electionId,
              },
            },
            create: {
              studentId: result.candidate.userId,
              departmentId: position.departmentId!,
              qualifyingElectionId: electionId,
              positionRank: i + 1,
              qualificationStatus: 'QUALIFIED',
              verifiedAt: new Date(),
            },
            update: {
              positionRank: i + 1,
              qualificationStatus: 'QUALIFIED',
              verifiedAt: new Date(),
            },
          });

          // Assign DELEGATE role
          const delegateRole = await tx.role.findUnique({
            where: { name: RoleName.DELEGATE },
          });

          if (delegateRole) {
            await tx.userRole.upsert({
              where: {
                userId_roleId: {
                  userId: result.candidate.userId,
                  roleId: delegateRole.id,
                },
              },
              create: {
                userId: result.candidate.userId,
                roleId: delegateRole.id,
              },
              update: {},
            });
          }

          delegatesSelected.push({
            rank: i + 1,
            studentId: result.candidate.userId,
            fullName: result.candidate.user.fullName,
            department: position.department?.name,
            voteTotal: result.voteTotal,
          });
        }
      });
    }

    return {
      message: 'Departmental delegates selected successfully',
      delegatesCount: delegatesSelected.length,
      delegates: delegatesSelected,
    };
  }

  /**
   * Verify election results (Election Officer)
   */
  async verifyResults(electionId: string, verifiedBy: string) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    if (election.status !== ElectionStatus.CLOSED) {
      throw new ConflictError('Can only verify results for closed elections');
    }

    // Update all results to verified
    await prisma.$transaction(async (tx) => {
      await tx.result.updateMany({
        where: { electionId },
        data: {
          verificationStatus: VerificationStatus.VERIFIED,
          verifiedBy,
          verifiedAt: new Date(),
        },
      });

      await tx.election.update({
        where: { id: electionId },
        data: { status: ElectionStatus.VERIFIED },
      });
    });

    return {
      message: 'Election results verified successfully',
    };
  }

  /**
   * Publish election results
   */
  async publishResults(electionId: string) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    if (election.status !== ElectionStatus.VERIFIED) {
      throw new ConflictError('Results must be verified before publishing');
    }

    await prisma.$transaction(async (tx) => {
      await tx.result.updateMany({
        where: { electionId },
        data: {
          verificationStatus: VerificationStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });

      await tx.election.update({
        where: { id: electionId },
        data: { status: ElectionStatus.PUBLISHED },
      });
    });

    return {
      message: 'Election results published successfully',
    };
  }

  /**
   * Get delegate qualifications
   */
  async getDelegateQualifications(electionId?: string) {
    const where: any = {
      qualificationStatus: 'QUALIFIED',
    };

    if (electionId) {
      where.qualifyingElectionId = electionId;
    }

    const delegates = await prisma.delegateQualification.findMany({
      where,
      include: {
        student: {
          select: {
            fullName: true,
            studentRegistrationNumber: true,
            email: true,
          },
        },
        department: {
          select: {
            name: true,
            code: true,
          },
        },
        qualifyingElection: {
          select: {
            name: true,
            academicYear: true,
          },
        },
      },
      orderBy: [
        { department: { name: 'asc' } },
        { positionRank: 'asc' },
      ],
    });

    return delegates;
  }
}

import prisma from '../../config/database';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  ForbiddenError,
} from '../../utils/errors';
import { ElectionStatus, ElectionStage, RoleName } from '@prisma/client';

export interface SubmitBallotDTO {
  userId: string;
  electionId: string;
  positionId: string;
  candidateIds: string[];
}

export class BallotsService {
  /**
   * Check voter eligibility for an election
   */
  async checkVoterEligibility(userId: string, electionId: string, positionId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          where: { id: positionId },
          include: {
            department: true,
          },
        },
      },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    if (election.positions.length === 0) {
      throw new NotFoundError('Position not found in this election');
    }

    const position = election.positions[0];

    // Check election status
    if (election.status !== ElectionStatus.OPEN) {
      return {
        eligible: false,
        reason: 'Election is not currently open for voting',
      };
    }

    // Check if election time is valid
    const now = new Date();
    if (now < election.startAt || now > election.endAt) {
      return {
        eligible: false,
        reason: 'Election is not within the voting period',
      };
    }

    // For departmental elections
    if (election.stage === ElectionStage.DEPARTMENTAL) {
      // Must be in the same department as the position
      if (position.departmentId && user.departmentId !== position.departmentId) {
        return {
          eligible: false,
          reason: 'You can only vote in your own department',
        };
      }

      // Must be a student
      const isStudent = user.roles.some((ur) => ur.role.name === RoleName.STUDENT);
      if (!isStudent) {
        return {
          eligible: false,
          reason: 'Only students can vote in departmental elections',
        };
      }
    }

    // For Student Council elections
    if (election.stage === ElectionStage.STUDENT_COUNCIL) {
      // Must be a qualified delegate
      const isDelegate = user.roles.some((ur) => ur.role.name === RoleName.DELEGATE);
      if (!isDelegate) {
        return {
          eligible: false,
          reason: 'Only qualified delegates can vote in Student Council elections',
        };
      }

      // Check if delegate is qualified for this election
      const delegateQualification = await prisma.delegateQualification.findFirst({
        where: {
          studentId: userId,
          qualificationStatus: 'QUALIFIED',
        },
      });

      if (!delegateQualification) {
        return {
          eligible: false,
          reason: 'You are not a qualified delegate',
        };
      }
    }

    // Check if already voted
    const existingVote = await prisma.ballotSubmission.findFirst({
      where: {
        electionId,
        positionId,
        voterEligibility: {
          userId,
        },
      },
    });

    if (existingVote) {
      return {
        eligible: false,
        reason: 'You have already voted for this position',
        hasVoted: true,
      };
    }

    return {
      eligible: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        studentRegistrationNumber: user.studentRegistrationNumber,
        department: user.department.name,
      },
      election: {
        id: election.id,
        name: election.name,
        stage: election.stage,
      },
      position: {
        id: position.id,
        name: position.name,
        numberOfSeats: position.numberOfSeats,
        department: position.department?.name || 'All Departments',
      },
    };
  }

  /**
   * Get ballot for a position (list of approved candidates)
   */
  async getBallot(userId: string, electionId: string, positionId: string) {
    // Check eligibility first
    const eligibility = await this.checkVoterEligibility(userId, electionId, positionId);

    if (!eligibility.eligible) {
      throw new ForbiddenError(eligibility.reason);
    }

    // Get approved candidates for this position
    const candidates = await prisma.candidate.findMany({
      where: {
        electionId,
        positionId,
        approvalStatus: 'APPROVED',
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            studentRegistrationNumber: true,
            department: true,
          },
        },
        party: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
            logoUrl: true,
          },
        },
      },
      orderBy: {
        ballotNumber: 'asc',
      },
    });

    if (candidates.length === 0) {
      throw new BadRequestError('No approved candidates for this position');
    }

    const position = eligibility.position;

    return {
      election: eligibility.election,
      position: {
        ...position,
        votingMethod: 'MULTI_SEAT', // From database
      },
      candidates: candidates.map((c) => ({
        id: c.id,
        ballotNumber: c.ballotNumber,
        fullName: c.user.fullName,
        department: c.user.department.name,
        party: c.party
          ? {
              name: c.party.name,
              abbreviation: c.party.abbreviation,
              logoUrl: c.party.logoUrl,
            }
          : null,
        manifesto: c.manifesto,
        photoUrl: c.photoUrl,
      })),
      votingRules: {
        minSelections: 1,
        maxSelections: position?.numberOfSeats || 5,
        message: `Select up to ${position?.numberOfSeats || 5} candidates`,
      },
    };
  }

  /**
   * Submit ballot with privacy-preserving storage
   */
  async submitBallot(data: SubmitBallotDTO) {
    // Verify eligibility
    const eligibility = await this.checkVoterEligibility(
      data.userId,
      data.electionId,
      data.positionId
    );

    if (!eligibility.eligible) {
      throw new ForbiddenError(eligibility.reason);
    }

    // Get position details
    const position = await prisma.position.findUnique({
      where: { id: data.positionId },
      include: {
        election: true,
      },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    // Validate number of selections
    if (data.candidateIds.length === 0) {
      throw new BadRequestError('You must select at least one candidate');
    }

    if (data.candidateIds.length > position.numberOfSeats) {
      throw new BadRequestError(
        `You can only select up to ${position.numberOfSeats} candidates`
      );
    }

    // Verify all selected candidates are valid and approved
    const candidates = await prisma.candidate.findMany({
      where: {
        id: { in: data.candidateIds },
        electionId: data.electionId,
        positionId: data.positionId,
        approvalStatus: 'APPROVED',
      },
    });

    if (candidates.length !== data.candidateIds.length) {
      throw new BadRequestError('One or more selected candidates are invalid');
    }

    // Check for duplicates in selection
    const uniqueCandidates = new Set(data.candidateIds);
    if (uniqueCandidates.size !== data.candidateIds.length) {
      throw new BadRequestError('Cannot select the same candidate multiple times');
    }

    // Use transaction for atomic ballot submission
    const result = await prisma.$transaction(async (tx) => {
      // Create or get voter eligibility record
      let voterEligibility = await tx.voterEligibility.findUnique({
        where: {
          userId_electionId_positionId: {
            userId: data.userId,
            electionId: data.electionId,
            positionId: data.positionId,
          },
        },
      });

      if (!voterEligibility) {
        voterEligibility = await tx.voterEligibility.create({
          data: {
            userId: data.userId,
            electionId: data.electionId,
            positionId: data.positionId,
            eligible: true,
          },
        });
      }

      // Check if already voted (double-check in transaction)
      const existingSubmission = await tx.ballotSubmission.findUnique({
        where: {
          voterEligibilityId_positionId: {
            voterEligibilityId: voterEligibility.id,
            positionId: data.positionId,
          },
        },
      });

      if (existingSubmission) {
        throw new ConflictError('You have already submitted a ballot for this position');
      }

      // Create ballot submission (without linking to specific voter)
      const ballotSubmission = await tx.ballotSubmission.create({
        data: {
          electionId: data.electionId,
          positionId: data.positionId,
          voterEligibilityId: voterEligibility.id,
          submittedAt: new Date(),
        },
      });

      // Create vote selections (privacy-preserving: no direct link to voter)
      await tx.voteSelection.createMany({
        data: data.candidateIds.map((candidateId) => ({
          ballotSubmissionId: ballotSubmission.id,
          candidateId,
        })),
      });

      return {
        submissionToken: ballotSubmission.submissionToken,
        submittedAt: ballotSubmission.submittedAt,
      };
    });

    return {
      success: true,
      message: 'Your ballot has been submitted successfully',
      receipt: {
        submissionToken: result.submissionToken,
        submittedAt: result.submittedAt,
        electionId: data.electionId,
        positionId: data.positionId,
        // Do NOT include candidate selections in receipt for privacy
      },
    };
  }

  /**
   * Verify ballot submission (using submission token)
   */
  async verifyBallotSubmission(submissionToken: string) {
    const submission = await prisma.ballotSubmission.findUnique({
      where: { submissionToken },
      include: {
        election: {
          select: {
            id: true,
            name: true,
            stage: true,
          },
        },
        position: {
          select: {
            id: true,
            name: true,
            department: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundError('Ballot submission not found');
    }

    return {
      verified: true,
      submission: {
        submissionToken: submission.submissionToken,
        submittedAt: submission.submittedAt,
        election: submission.election,
        position: {
          ...submission.position,
          department: submission.position.department?.name || 'All Departments',
        },
      },
      // Do NOT include vote selections or voter identity
      message: 'Your ballot submission has been verified',
    };
  }

  /**
   * Get user's voting status for all positions in an election
   */
  async getUserVotingStatus(userId: string, electionId: string) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        positions: {
          include: {
            department: true,
            _count: {
              select: {
                candidates: {
                  where: {
                    approvalStatus: 'APPROVED',
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Get all ballot submissions for this user in this election
    const submissions = await prisma.ballotSubmission.findMany({
      where: {
        electionId,
        voterEligibility: {
          userId,
        },
      },
      select: {
        positionId: true,
        submittedAt: true,
        submissionToken: true,
      },
    });

    const submissionMap = new Map(
      submissions.map((s) => [s.positionId, s])
    );

    const positions = await Promise.all(
      election.positions.map(async (position) => {
        const eligibility = await this.checkVoterEligibility(
          userId,
          electionId,
          position.id
        );

        const submission = submissionMap.get(position.id);

        return {
          id: position.id,
          name: position.name,
          department: position.department?.name || 'All Departments',
          numberOfSeats: position.numberOfSeats,
          candidatesCount: position._count.candidates,
          eligible: eligibility.eligible,
          hasVoted: !!submission,
          votedAt: submission?.submittedAt || null,
          submissionToken: submission?.submissionToken || null,
          reason: eligibility.reason || null,
        };
      })
    );

    return {
      election: {
        id: election.id,
        name: election.name,
        stage: election.stage,
        status: election.status,
      },
      positions,
    };
  }
}

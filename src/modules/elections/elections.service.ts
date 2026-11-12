import prisma from '../../config/database';
import { NotFoundError, ConflictError, BadRequestError } from '../../utils/errors';
import { ElectionStage, ElectionStatus, VotingMethod } from '@prisma/client';

export interface CreateElectionDTO {
  name: string;
  stage: ElectionStage;
  academicYear: string;
  startAt: Date;
  endAt: Date;
  rulesConfiguration?: any;
}

export interface UpdateElectionDTO {
  name?: string;
  startAt?: Date;
  endAt?: Date;
  status?: ElectionStatus;
  rulesConfiguration?: any;
}

export interface CreatePositionDTO {
  electionId: string;
  departmentId?: string;
  name: string;
  numberOfSeats: number;
  votingMethod: VotingMethod;
  eligibilityConfiguration?: any;
}

export class ElectionsService {
  /**
   * Get all elections
   */
  async getAllElections(filters?: {
    stage?: ElectionStage;
    status?: ElectionStatus;
    academicYear?: string;
  }) {
    const where: any = {};

    if (filters?.stage) where.stage = filters.stage;
    if (filters?.status) where.status = filters.status;
    if (filters?.academicYear) where.academicYear = filters.academicYear;

    const elections = await prisma.election.findMany({
      where,
      include: {
        positions: {
          include: {
            department: true,
            _count: {
              select: {
                candidates: true,
              },
            },
          },
        },
        _count: {
          select: {
            candidates: true,
            ballotSubmissions: true,
          },
        },
      },
      orderBy: { startAt: 'desc' },
    });

    return elections;
  }

  /**
   * Get election by ID
   */
  async getElectionById(id: string) {
    const election = await prisma.election.findUnique({
      where: { id },
      include: {
        positions: {
          include: {
            department: true,
            _count: {
              select: {
                candidates: true,
                ballotSubmissions: true,
              },
            },
          },
        },
        candidates: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                studentRegistrationNumber: true,
                department: true,
              },
            },
            party: true,
            position: true,
          },
          where: {
            approvalStatus: 'APPROVED',
          },
        },
        _count: {
          select: {
            ballotSubmissions: true,
            voterEligibilities: true,
          },
        },
      },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    return election;
  }

  /**
   * Create a new election (Admin only)
   */
  async createElection(data: CreateElectionDTO) {
    // Validate dates
    const startAt = new Date(data.startAt);
    const endAt = new Date(data.endAt);

    if (endAt <= startAt) {
      throw new BadRequestError('End date must be after start date');
    }

    if (startAt <= new Date()) {
      throw new BadRequestError('Start date must be in the future');
    }

    const election = await prisma.election.create({
      data: {
        name: data.name,
        stage: data.stage,
        academicYear: data.academicYear,
        startAt,
        endAt,
        status: ElectionStatus.DRAFT,
        rulesConfiguration: data.rulesConfiguration || {},
      },
      include: {
        positions: true,
      },
    });

    return election;
  }

  /**
   * Update election (Admin only)
   */
  async updateElection(id: string, data: UpdateElectionDTO) {
    const election = await prisma.election.findUnique({
      where: { id },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    // Prevent updates to published or ongoing elections
    if (election.status === ElectionStatus.PUBLISHED) {
      throw new ConflictError('Cannot update published election');
    }

    if (election.status === ElectionStatus.OPEN) {
      throw new ConflictError('Cannot update ongoing election');
    }

    // Validate dates if being updated
    if (data.startAt || data.endAt) {
      const startAt = data.startAt ? new Date(data.startAt) : election.startAt;
      const endAt = data.endAt ? new Date(data.endAt) : election.endAt;

      if (endAt <= startAt) {
        throw new BadRequestError('End date must be after start date');
      }
    }

    const updated = await prisma.election.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.startAt && { startAt: new Date(data.startAt) }),
        ...(data.endAt && { endAt: new Date(data.endAt) }),
        ...(data.status && { status: data.status }),
        ...(data.rulesConfiguration && { rulesConfiguration: data.rulesConfiguration }),
      },
      include: {
        positions: {
          include: {
            department: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Open election (start voting)
   */
  async openElection(id: string) {
    const election = await prisma.election.findUnique({
      where: { id },
      include: {
        positions: {
          include: {
            candidates: {
              where: { approvalStatus: 'APPROVED' },
            },
          },
        },
      },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    if (election.status !== ElectionStatus.READY) {
      throw new ConflictError('Election must be in READY status to open');
    }

    // Verify all positions have candidates
    for (const position of election.positions) {
      if (position.candidates.length === 0) {
        throw new BadRequestError(
          `Position "${position.name}" has no approved candidates`
        );
      }
    }

    const now = new Date();
    if (now < election.startAt) {
      throw new BadRequestError('Election start time has not been reached');
    }

    const updated = await prisma.election.update({
      where: { id },
      data: { status: ElectionStatus.OPEN },
    });

    return updated;
  }

  /**
   * Close election (stop voting)
   */
  async closeElection(id: string) {
    const election = await prisma.election.findUnique({
      where: { id },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    if (election.status !== ElectionStatus.OPEN) {
      throw new ConflictError('Only open elections can be closed');
    }

    const updated = await prisma.election.update({
      where: { id },
      data: { status: ElectionStatus.CLOSED },
    });

    return updated;
  }

  /**
   * Set election to ready status
   */
  async markElectionReady(id: string) {
    const election = await prisma.election.findUnique({
      where: { id },
      include: {
        positions: {
          include: {
            candidates: {
              where: { approvalStatus: 'APPROVED' },
            },
          },
        },
      },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    if (election.status !== ElectionStatus.DRAFT) {
      throw new ConflictError('Only draft elections can be marked as ready');
    }

    // Validation checks
    if (election.positions.length === 0) {
      throw new BadRequestError('Election must have at least one position');
    }

    for (const position of election.positions) {
      if (position.candidates.length === 0) {
        throw new BadRequestError(
          `Position "${position.name}" must have at least one approved candidate`
        );
      }
    }

    const updated = await prisma.election.update({
      where: { id },
      data: { status: ElectionStatus.READY },
    });

    return updated;
  }

  /**
   * Create a position for an election
   */
  async createPosition(data: CreatePositionDTO) {
    const election = await prisma.election.findUnique({
      where: { id: data.electionId },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    if (election.status !== ElectionStatus.DRAFT) {
      throw new ConflictError('Can only add positions to draft elections');
    }

    // Validate department for departmental elections
    if (election.stage === ElectionStage.DEPARTMENTAL && !data.departmentId) {
      throw new BadRequestError('Department is required for departmental elections');
    }

    if (data.departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: data.departmentId },
      });

      if (!department) {
        throw new NotFoundError('Department not found');
      }
    }

    const position = await prisma.position.create({
      data: {
        electionId: data.electionId,
        departmentId: data.departmentId || null,
        name: data.name,
        numberOfSeats: data.numberOfSeats,
        votingMethod: data.votingMethod,
        eligibilityConfiguration: data.eligibilityConfiguration || {},
      },
      include: {
        department: true,
      },
    });

    return position;
  }

  /**
   * Get election statistics
   */
  async getElectionStats(id: string) {
    const election = await prisma.election.findUnique({
      where: { id },
      include: {
        positions: {
          include: {
            _count: {
              select: {
                candidates: true,
                ballotSubmissions: true,
                voterEligibilities: true,
              },
            },
          },
        },
        _count: {
          select: {
            candidates: true,
            ballotSubmissions: true,
            voterEligibilities: true,
          },
        },
      },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    const totalEligibleVoters = election._count.voterEligibilities;
    const totalVotesCast = election._count.ballotSubmissions;
    const turnoutPercentage =
      totalEligibleVoters > 0 ? (totalVotesCast / totalEligibleVoters) * 100 : 0;

    return {
      electionId: election.id,
      name: election.name,
      status: election.status,
      stage: election.stage,
      stats: {
        totalPositions: election.positions.length,
        totalCandidates: election._count.candidates,
        eligibleVoters: totalEligibleVoters,
        votesCast: totalVotesCast,
        turnoutPercentage: turnoutPercentage.toFixed(2),
      },
      positions: election.positions.map(p => ({
        id: p.id,
        name: p.name,
        department: 'Department',
        candidatesCount: p._count.candidates,
        votesCount: p._count.ballotSubmissions,
        eligibleVoters: p._count.voterEligibilities,
      })),
    };
  }
}

import prisma from '../../config/database';
import { NotFoundError, ConflictError, BadRequestError, ForbiddenError } from '../../utils/errors';
import { ApprovalStatus, ElectionStatus, ElectionStage } from '@prisma/client';

export interface RegisterCandidateDTO {
  userId: string;
  electionId: string;
  positionId: string;
  partyId?: string;
  manifesto?: string;
  photoUrl?: string;
}

export interface ApproveCandidateDTO {
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
}

export class CandidatesService {
  /**
   * Register as a candidate
   */
  async registerCandidate(data: RegisterCandidateDTO) {
    // Check if election exists and is in draft/ready status
    const election = await prisma.election.findUnique({
      where: { id: data.electionId },
      include: {
        positions: {
          where: { id: data.positionId },
        },
      },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    if (election.status !== ElectionStatus.DRAFT && election.status !== ElectionStatus.READY) {
      throw new ConflictError('Cannot register for elections that have already started');
    }

    if (election.positions.length === 0) {
      throw new NotFoundError('Position not found in this election');
    }

    const position = election.positions[0];

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      include: {
        department: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // For departmental elections, verify department match
    if (election.stage === ElectionStage.DEPARTMENTAL && position.departmentId) {
      if (user.departmentId !== position.departmentId) {
        throw new ForbiddenError('You can only contest in your own department');
      }
    }

    // Check if user already registered for this position
    const existingRegistration = await prisma.candidate.findUnique({
      where: {
        userId_electionId_positionId: {
          userId: data.userId,
          electionId: data.electionId,
          positionId: data.positionId,
        },
      },
    });

    if (existingRegistration) {
      throw new ConflictError('You have already registered for this position');
    }

    // Verify party if provided
    if (data.partyId) {
      const party = await prisma.party.findUnique({
        where: { id: data.partyId },
      });

      if (!party || party.status !== 'ACTIVE') {
        throw new NotFoundError('Party not found or inactive');
      }
    }

    // Create candidate registration
    const candidate = await prisma.candidate.create({
      data: {
        userId: data.userId,
        electionId: data.electionId,
        positionId: data.positionId,
        partyId: data.partyId || null,
        manifesto: data.manifesto || '',
        photoUrl: data.photoUrl || null,
        approvalStatus: ApprovalStatus.PENDING,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            studentRegistrationNumber: true,
            email: true,
            department: true,
          },
        },
        position: {
          include: {
            department: true,
          },
        },
        party: true,
        election: {
          select: {
            id: true,
            name: true,
            stage: true,
          },
        },
      },
    });

    return candidate;
  }

  /**
   * Get all candidates for an election
   */
  async getCandidatesByElection(electionId: string, includeAll = false) {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      throw new NotFoundError('Election not found');
    }

    const where: any = { electionId };

    // Only show approved candidates to regular users
    if (!includeAll) {
      where.approvalStatus = ApprovalStatus.APPROVED;
    }

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            studentRegistrationNumber: true,
            department: true,
          },
        },
        position: {
          include: {
            department: true,
          },
        },
        party: true,
      },
      orderBy: [
        { position: { name: 'asc' } },
        { ballotNumber: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return candidates;
  }

  /**
   * Get candidates by position
   */
  async getCandidatesByPosition(positionId: string, includeAll = false) {
    const position = await prisma.position.findUnique({
      where: { id: positionId },
    });

    if (!position) {
      throw new NotFoundError('Position not found');
    }

    const where: any = { positionId };

    if (!includeAll) {
      where.approvalStatus = ApprovalStatus.APPROVED;
    }

    const candidates = await prisma.candidate.findMany({
      where,
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
        position: {
          include: {
            department: true,
          },
        },
      },
      orderBy: [
        { ballotNumber: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return candidates;
  }

  /**
   * Get candidate by ID
   */
  async getCandidateById(id: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            studentRegistrationNumber: true,
            email: true,
            department: true,
          },
        },
        position: {
          include: {
            department: true,
            election: true,
          },
        },
        party: true,
      },
    });

    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    return candidate;
  }

  /**
   * Approve or reject candidate (Election Officer only)
   */
  async reviewCandidate(id: string, data: ApproveCandidateDTO) {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        position: {
          include: {
            election: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundError('Candidate not found');
    }

    if (candidate.approvalStatus !== ApprovalStatus.PENDING) {
      throw new ConflictError('Candidate has already been reviewed');
    }

    if (candidate.position.election.status !== ElectionStatus.DRAFT) {
      throw new ConflictError('Can only review candidates for draft elections');
    }

    if (data.approvalStatus === ApprovalStatus.REJECTED && !data.rejectionReason) {
      throw new BadRequestError('Rejection reason is required when rejecting a candidate');
    }

    // Assign ballot number for approved candidates
    let ballotNumber = null;
    if (data.approvalStatus === ApprovalStatus.APPROVED) {
      const maxBallot = await prisma.candidate.findFirst({
        where: {
          positionId: candidate.positionId,
          approvalStatus: ApprovalStatus.APPROVED,
        },
        orderBy: { ballotNumber: 'desc' },
      });

      ballotNumber = maxBallot && maxBallot.ballotNumber ? maxBallot.ballotNumber + 1 : 1;
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: {
        approvalStatus: data.approvalStatus,
        rejectionReason: data.rejectionReason || null,
        ballotNumber,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        position: true,
        party: true,
      },
    });

    return updated;
  }

  /**
   * Get user's candidate registrations
   */
  async getUserCandidateRegistrations(userId: string) {
    const registrations = await prisma.candidate.findMany({
      where: { userId },
      include: {
        position: {
          include: {
            department: true,
            election: true,
          },
        },
        party: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return registrations;
  }

  /**
   * Withdraw candidate registration
   */
  async withdrawCandidateRegistration(id: string, userId: string) {
    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        position: {
          include: {
            election: true,
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundError('Candidate registration not found');
    }

    if (candidate.userId !== userId) {
      throw new ForbiddenError('You can only withdraw your own registration');
    }

    if (candidate.position.election.status !== ElectionStatus.DRAFT) {
      throw new ConflictError('Cannot withdraw from elections that have started');
    }

    await prisma.candidate.delete({
      where: { id },
    });

    return { message: 'Registration withdrawn successfully' };
  }
}

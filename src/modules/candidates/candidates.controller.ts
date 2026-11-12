import { Request, Response, NextFunction } from 'express';
import { CandidatesService } from './candidates.service';

const candidatesService = new CandidatesService();

export class CandidatesController {
  /**
   * Register as candidate
   */
  async registerCandidate(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const candidate = await candidatesService.registerCandidate({
        userId: req.userId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Candidate registration submitted successfully',
        data: { candidate },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get candidates by election
   */
  async getCandidatesByElection(req: Request, res: Response, next: NextFunction) {
    try {
      const { electionId } = req.params;
      const includeAll = req.query.includeAll === 'true';

      const candidates = await candidatesService.getCandidatesByElection(
        electionId,
        includeAll
      );

      res.status(200).json({
        success: true,
        data: { candidates },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get candidates by position
   */
  async getCandidatesByPosition(req: Request, res: Response, next: NextFunction) {
    try {
      const { positionId } = req.params;
      const includeAll = req.query.includeAll === 'true';

      const candidates = await candidatesService.getCandidatesByPosition(
        positionId,
        includeAll
      );

      res.status(200).json({
        success: true,
        data: { candidates },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get candidate by ID
   */
  async getCandidateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const candidate = await candidatesService.getCandidateById(id);

      res.status(200).json({
        success: true,
        data: { candidate },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Review candidate (approve/reject)
   */
  async reviewCandidate(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const candidate = await candidatesService.reviewCandidate(id, req.body);

      res.status(200).json({
        success: true,
        message: `Candidate ${req.body.approvalStatus.toLowerCase()} successfully`,
        data: { candidate },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user's registrations
   */
  async getMyRegistrations(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const registrations = await candidatesService.getUserCandidateRegistrations(
        req.userId
      );

      res.status(200).json({
        success: true,
        data: { registrations },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Withdraw candidate registration
   */
  async withdrawRegistration(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const { id } = req.params;
      const result = await candidatesService.withdrawCandidateRegistration(
        id,
        req.userId
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

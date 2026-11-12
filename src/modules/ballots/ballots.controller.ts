import { Request, Response, NextFunction } from 'express';
import { BallotsService } from './ballots.service';

const ballotsService = new BallotsService();

export class BallotsController {
  /**
   * Get ballot for a position
   */
  async getBallot(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const { electionId, positionId } = req.params;
      const ballot = await ballotsService.getBallot(req.userId, electionId, positionId);

      res.status(200).json({
        success: true,
        data: ballot,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Submit ballot
   */
  async submitBallot(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const result = await ballotsService.submitBallot({
        userId: req.userId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.receipt,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify ballot submission using token
   */
  async verifySubmission(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      const verification = await ballotsService.verifyBallotSubmission(token as string);

      res.status(200).json({
        success: true,
        data: verification,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's voting status for an election
   */
  async getVotingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const { electionId } = req.params;
      const status = await ballotsService.getUserVotingStatus(req.userId, electionId);

      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check voter eligibility
   */
  async checkEligibility(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const { electionId, positionId } = req.params;
      const eligibility = await ballotsService.checkVoterEligibility(
        req.userId,
        electionId,
        positionId
      );

      res.status(200).json({
        success: true,
        data: eligibility,
      });
    } catch (error) {
      next(error);
    }
  }
}

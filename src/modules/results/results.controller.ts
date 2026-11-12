import { Request, Response, NextFunction } from 'express';
import { ResultsService } from './results.service';

const resultsService = new ResultsService();

export class ResultsController {
  /**
   * Count votes for an election (Admin/Officer)
   */
  async countVotes(req: Request, res: Response, next: NextFunction) {
    try {
      const { electionId } = req.params;
      const results = await resultsService.countVotes(electionId);

      res.status(200).json({
        success: true,
        message: 'Votes counted successfully',
        data: { resultsCount: results.length },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get election results
   */
  async getElectionResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { electionId } = req.params;
      const includeUnverified = req.query.includeUnverified === 'true';

      const results = await resultsService.getElectionResults(
        electionId,
        includeUnverified
      );

      res.status(200).json({
        success: true,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Select departmental delegates (top 5 per department)
   */
  async selectDelegates(req: Request, res: Response, next: NextFunction) {
    try {
      const { electionId } = req.params;
      const result = await resultsService.selectDepartmentalDelegates(electionId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          delegatesCount: result.delegatesCount,
          delegates: result.delegates,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify election results
   */
  async verifyResults(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const { electionId } = req.params;
      const result = await resultsService.verifyResults(electionId, req.userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Publish election results
   */
  async publishResults(req: Request, res: Response, next: NextFunction) {
    try {
      const { electionId } = req.params;
      const result = await resultsService.publishResults(electionId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get delegate qualifications
   */
  async getDelegateQualifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { electionId } = req.query;
      const delegates = await resultsService.getDelegateQualifications(
        electionId as string
      );

      res.status(200).json({
        success: true,
        data: { delegates },
      });
    } catch (error) {
      next(error);
    }
  }
}

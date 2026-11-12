import { Request, Response, NextFunction } from 'express';
import { ElectionsService } from './elections.service';

const electionsService = new ElectionsService();

export class ElectionsController {
  /**
   * Get all elections
   */
  async getAllElections(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = {
        stage: req.query.stage as any,
        status: req.query.status as any,
        academicYear: req.query.academicYear as string,
      };

      const elections = await electionsService.getAllElections(filters);

      res.status(200).json({
        success: true,
        data: { elections },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get election by ID
   */
  async getElectionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const election = await electionsService.getElectionById(id);

      res.status(200).json({
        success: true,
        data: { election },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get election statistics
   */
  async getElectionStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const stats = await electionsService.getElectionStats(id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create election (Admin only)
   */
  async createElection(req: Request, res: Response, next: NextFunction) {
    try {
      const election = await electionsService.createElection(req.body);

      res.status(201).json({
        success: true,
        message: 'Election created successfully',
        data: { election },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update election (Admin only)
   */
  async updateElection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const election = await electionsService.updateElection(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Election updated successfully',
        data: { election },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark election as ready
   */
  async markElectionReady(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const election = await electionsService.markElectionReady(id);

      res.status(200).json({
        success: true,
        message: 'Election marked as ready',
        data: { election },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Open election (start voting)
   */
  async openElection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const election = await electionsService.openElection(id);

      res.status(200).json({
        success: true,
        message: 'Election opened successfully',
        data: { election },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Close election (stop voting)
   */
  async closeElection(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const election = await electionsService.closeElection(id);

      res.status(200).json({
        success: true,
        message: 'Election closed successfully',
        data: { election },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create position
   */
  async createPosition(req: Request, res: Response, next: NextFunction) {
    try {
      const position = await electionsService.createPosition(req.body);

      res.status(201).json({
        success: true,
        message: 'Position created successfully',
        data: { position },
      });
    } catch (error) {
      next(error);
    }
  }
}

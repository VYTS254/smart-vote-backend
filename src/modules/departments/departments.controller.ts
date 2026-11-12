import { Request, Response, NextFunction } from 'express';
import { DepartmentsService } from './departments.service';

const departmentsService = new DepartmentsService();

export class DepartmentsController {
  /**
   * Get all departments
   */
  async getAllDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const departments = await departmentsService.getAllDepartments(includeInactive);

      res.status(200).json({
        success: true,
        data: { departments },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get department by ID
   */
  async getDepartmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const department = await departmentsService.getDepartmentById(id);

      res.status(200).json({
        success: true,
        data: { department },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const stats = await departmentsService.getDepartmentStats(id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create department (Admin only)
   */
  async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const department = await departmentsService.createDepartment(req.body);

      res.status(201).json({
        success: true,
        message: 'Department created successfully',
        data: { department },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update department (Admin only)
   */
  async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const department = await departmentsService.updateDepartment(id, req.body);

      res.status(200).json({
        success: true,
        message: 'Department updated successfully',
        data: { department },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete department (Admin only)
   */
  async deleteDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await departmentsService.deleteDepartment(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

import { Router } from 'express';
import { DepartmentsController } from './departments.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import {
  createDepartmentValidation,
  updateDepartmentValidation,
  departmentIdValidation,
} from './departments.validation';
import { RoleName } from '@prisma/client';

const router = Router();
const departmentsController = new DepartmentsController();

// Public routes (authenticated users)
// router.get(
//   '/',
//   authenticate,
//   departmentsController.getAllDepartments
// );
router.get(
  '/',
  departmentsController.getAllDepartments
);

router.get(
  '/:id',
  authenticate,
  validate(departmentIdValidation),
  departmentsController.getDepartmentById
);

router.get(
  '/:id/stats',
  authenticate,
  validate(departmentIdValidation),
  departmentsController.getDepartmentStats
);

// Admin-only routes
router.post(
  '/',
  authenticate,
  authorize(RoleName.ADMIN),
  validate(createDepartmentValidation),
  departmentsController.createDepartment
);

router.patch(
  '/:id',
  authenticate,
  authorize(RoleName.ADMIN),
  validate(updateDepartmentValidation),
  departmentsController.updateDepartment
);

router.delete(
  '/:id',
  authenticate,
  authorize(RoleName.ADMIN),
  validate(departmentIdValidation),
  departmentsController.deleteDepartment
);

export default router;

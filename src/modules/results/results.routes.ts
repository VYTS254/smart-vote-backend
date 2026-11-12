import { Router } from 'express';
import { ResultsController } from './results.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { param } from 'express-validator';
import { validate } from '../../middleware/validator';
import { RoleName } from '@prisma/client';

const router = Router();
const resultsController = new ResultsController();

const electionIdValidation = [
  param('electionId').isUUID().withMessage('Invalid election ID'),
];

// Public routes (view published results)
router.get(
  '/:electionId',
  authenticate,
  validate(electionIdValidation),
  resultsController.getElectionResults
);

router.get(
  '/delegates/list',
  authenticate,
  resultsController.getDelegateQualifications
);

// Admin and Election Officer routes
router.post(
  '/:electionId/count',
  authenticate,
  authorize(RoleName.ADMIN, RoleName.ELECTION_OFFICER),
  validate(electionIdValidation),
  resultsController.countVotes
);

router.post(
  '/:electionId/select-delegates',
  authenticate,
  authorize(RoleName.ADMIN, RoleName.ELECTION_OFFICER),
  validate(electionIdValidation),
  resultsController.selectDelegates
);

router.post(
  '/:electionId/verify',
  authenticate,
  authorize(RoleName.ADMIN, RoleName.ELECTION_OFFICER),
  validate(electionIdValidation),
  resultsController.verifyResults
);

router.post(
  '/:electionId/publish',
  authenticate,
  authorize(RoleName.ADMIN),
  validate(electionIdValidation),
  resultsController.publishResults
);

export default router;

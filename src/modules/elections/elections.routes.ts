import { Router } from 'express';
import { ElectionsController } from './elections.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import {
  createElectionValidation,
  updateElectionValidation,
  createPositionValidation,
  electionIdValidation,
  electionFiltersValidation,
} from './elections.validation';
import { RoleName } from '@prisma/client';

const router = Router();
const electionsController = new ElectionsController();

// Public routes (authenticated users can view elections)
router.get(
  '/',
  authenticate,
  validate(electionFiltersValidation),
  electionsController.getAllElections
);

router.get(
  '/:id',
  authenticate,
  validate(electionIdValidation),
  electionsController.getElectionById
);

router.get(
  '/:id/stats',
  authenticate,
  validate(electionIdValidation),
  electionsController.getElectionStats
);

// Admin and Election Officer routes
router.post(
  '/',
  authenticate,
  authorize(RoleName.ADMIN, RoleName.ELECTION_OFFICER),
  validate(createElectionValidation),
  electionsController.createElection
);

router.patch(
  '/:id',
  authenticate,
  authorize(RoleName.ADMIN, RoleName.ELECTION_OFFICER),
  validate(updateElectionValidation),
  electionsController.updateElection
);

router.post(
  '/:id/ready',
  authenticate,
  authorize(RoleName.ADMIN, RoleName.ELECTION_OFFICER),
  validate(electionIdValidation),
  electionsController.markElectionReady
);

router.post(
  '/:id/open',
  authenticate,
  authorize(RoleName.ADMIN, RoleName.ELECTION_OFFICER),
  validate(electionIdValidation),
  electionsController.openElection
);

router.post(
  '/:id/close',
  authenticate,
  authorize(RoleName.ADMIN, RoleName.ELECTION_OFFICER),
  validate(electionIdValidation),
  electionsController.closeElection
);

router.post(
  '/positions',
  authenticate,
  authorize(RoleName.ADMIN, RoleName.ELECTION_OFFICER),
  validate(createPositionValidation),
  electionsController.createPosition
);

export default router;

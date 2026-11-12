import { Router } from 'express';
import { CandidatesController } from './candidates.controller';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import {
  registerCandidateValidation,
  reviewCandidateValidation,
  candidateIdValidation,
  electionIdParamValidation,
  positionIdParamValidation,
} from './candidates.validation';
import { RoleName } from '@prisma/client';

const router = Router();
const candidatesController = new CandidatesController();

// Student routes
router.post(
  '/',
  authenticate,
  authorize(RoleName.STUDENT, RoleName.DELEGATE),
  validate(registerCandidateValidation),
  candidatesController.registerCandidate
);

router.get(
  '/me/registrations',
  authenticate,
  candidatesController.getMyRegistrations
);

router.delete(
  '/:id/withdraw',
  authenticate,
  validate(candidateIdValidation),
  candidatesController.withdrawRegistration
);

// Public routes (view candidates)
router.get(
  '/election/:electionId',
  authenticate,
  validate(electionIdParamValidation),
  candidatesController.getCandidatesByElection
);

router.get(
  '/position/:positionId',
  authenticate,
  validate(positionIdParamValidation),
  candidatesController.getCandidatesByPosition
);

router.get(
  '/:id',
  authenticate,
  validate(candidateIdValidation),
  candidatesController.getCandidateById
);

// Election Officer routes
router.patch(
  '/:id/review',
  authenticate,
  authorize(RoleName.ELECTION_OFFICER, RoleName.ADMIN),
  validate(reviewCandidateValidation),
  candidatesController.reviewCandidate
);

export default router;

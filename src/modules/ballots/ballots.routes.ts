import { Router } from 'express';
import { BallotsController } from './ballots.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validator';
import { votingLimiter } from '../../middleware/rateLimiter';
import {
  getBallotValidation,
  submitBallotValidation,
  verifySubmissionValidation,
  votingStatusValidation,
} from './ballots.validation';

const router = Router();
const ballotsController = new BallotsController();

// Get ballot (list of candidates to vote for)
router.get(
  '/election/:electionId/position/:positionId',
  authenticate,
  validate(getBallotValidation),
  ballotsController.getBallot
);

// Check voter eligibility
router.get(
  '/eligibility/:electionId/:positionId',
  authenticate,
  validate(getBallotValidation),
  ballotsController.checkEligibility
);

// Submit ballot (with rate limiting to prevent spam)
router.post(
  '/submit',
  authenticate,
  votingLimiter,
  validate(submitBallotValidation),
  ballotsController.submitBallot
);

// Verify ballot submission using token
router.get(
  '/verify',
  validate(verifySubmissionValidation),
  ballotsController.verifySubmission
);

// Get user's voting status for all positions in an election
router.get(
  '/status/:electionId',
  authenticate,
  validate(votingStatusValidation),
  ballotsController.getVotingStatus
);

export default router;

import { body, param, query } from 'express-validator';

export const getBallotValidation = [
  param('electionId')
    .isUUID()
    .withMessage('Invalid election ID'),

  param('positionId')
    .isUUID()
    .withMessage('Invalid position ID'),
];

export const submitBallotValidation = [
  body('electionId')
    .isUUID()
    .withMessage('Invalid election ID'),

  body('positionId')
    .isUUID()
    .withMessage('Invalid position ID'),

  body('candidateIds')
    .isArray({ min: 1 })
    .withMessage('You must select at least one candidate'),

  body('candidateIds.*')
    .isUUID()
    .withMessage('Invalid candidate ID'),
];

export const verifySubmissionValidation = [
  query('token')
    .notEmpty()
    .withMessage('Submission token is required')
    .isUUID()
    .withMessage('Invalid submission token format'),
];

export const votingStatusValidation = [
  param('electionId')
    .isUUID()
    .withMessage('Invalid election ID'),
];

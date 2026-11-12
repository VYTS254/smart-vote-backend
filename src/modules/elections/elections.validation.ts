import { body, param, query } from 'express-validator';

export const createElectionValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Election name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Election name must be between 3 and 200 characters'),

  body('stage')
    .isIn(['DEPARTMENTAL', 'STUDENT_COUNCIL'])
    .withMessage('Stage must be either DEPARTMENTAL or STUDENT_COUNCIL'),

  body('academicYear')
    .trim()
    .notEmpty()
    .withMessage('Academic year is required')
    .matches(/^\d{4}\/\d{4}$/)
    .withMessage('Academic year must be in format YYYY/YYYY'),

  body('startAt')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  body('endAt')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  body('rulesConfiguration')
    .optional()
    .isObject()
    .withMessage('Rules configuration must be an object'),
];

export const updateElectionValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid election ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Election name must be between 3 and 200 characters'),

  body('startAt')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  body('endAt')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),

  body('status')
    .optional()
    .isIn(['DRAFT', 'READY', 'OPEN', 'CLOSED', 'VERIFIED', 'PUBLISHED'])
    .withMessage('Invalid election status'),

  body('rulesConfiguration')
    .optional()
    .isObject()
    .withMessage('Rules configuration must be an object'),
];

export const createPositionValidation = [
  body('electionId')
    .isUUID()
    .withMessage('Invalid election ID'),

  body('departmentId')
    .optional()
    .isUUID()
    .withMessage('Invalid department ID'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Position name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Position name must be between 2 and 100 characters'),

  body('numberOfSeats')
    .isInt({ min: 1, max: 50 })
    .withMessage('Number of seats must be between 1 and 50'),

  body('votingMethod')
    .isIn(['SINGLE_WINNER', 'MULTI_SEAT'])
    .withMessage('Voting method must be either SINGLE_WINNER or MULTI_SEAT'),

  body('eligibilityConfiguration')
    .optional()
    .isObject()
    .withMessage('Eligibility configuration must be an object'),
];

export const electionIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid election ID'),
];

export const electionFiltersValidation = [
  query('stage')
    .optional()
    .isIn(['DEPARTMENTAL', 'STUDENT_COUNCIL'])
    .withMessage('Invalid election stage'),

  query('status')
    .optional()
    .isIn(['DRAFT', 'READY', 'OPEN', 'CLOSED', 'VERIFIED', 'PUBLISHED'])
    .withMessage('Invalid election status'),

  query('academicYear')
    .optional()
    .matches(/^\d{4}\/\d{4}$/)
    .withMessage('Academic year must be in format YYYY/YYYY'),
];

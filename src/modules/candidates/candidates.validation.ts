import { body, param, query } from 'express-validator';

export const registerCandidateValidation = [
  body('electionId')
    .isUUID()
    .withMessage('Invalid election ID'),

  body('positionId')
    .isUUID()
    .withMessage('Invalid position ID'),

  body('partyId')
    .optional()
    .isUUID()
    .withMessage('Invalid party ID'),

  body('manifesto')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Manifesto must not exceed 5000 characters'),

  body('photoUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Photo URL must be a valid URL'),
];

export const reviewCandidateValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid candidate ID'),

  body('approvalStatus')
    .isIn(['APPROVED', 'REJECTED'])
    .withMessage('Approval status must be either APPROVED or REJECTED'),

  body('rejectionReason')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),
];

export const candidateIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid candidate ID'),
];

export const electionIdParamValidation = [
  param('electionId')
    .isUUID()
    .withMessage('Invalid election ID'),
];

export const positionIdParamValidation = [
  param('positionId')
    .isUUID()
    .withMessage('Invalid position ID'),
];

export const includeAllQueryValidation = [
  query('includeAll')
    .optional()
    .isBoolean()
    .withMessage('includeAll must be a boolean'),
];

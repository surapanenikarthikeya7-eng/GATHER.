import { body, param, query, validationResult } from 'express-validator';
import { HttpError } from './http.js';

export const validate = (rules) => async (req, _res, next) => {
  await Promise.all(rules.map((rule) => rule.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new HttpError(400, errors.array()[0].msg));
  next();
};

export const idParam = [param('id').isInt({ min: 1 }).withMessage('Invalid ID.')];

export const recipeRules = [
  body('title').trim().isLength({ min: 3, max: 150 }).withMessage('Title must be 3–150 characters.'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10–2000 characters.'),
  body('category_id').isInt({ min: 1 }).withMessage('Select a category.'),
  body('image_url').optional({ checkFalsy: true }).isURL({ protocols: ['https'], require_protocol: true }).withMessage('Recipe image URLs must use HTTPS.'),
  body('prep_time').isInt({ min: 0, max: 1440 }).withMessage('Preparation time must be 0–1440 minutes.'),
  body('cook_time').isInt({ min: 0, max: 1440 }).withMessage('Cooking time must be 0–1440 minutes.'),
  body('servings').isInt({ min: 1, max: 100 }).withMessage('Servings must be 1–100.'),
  body('instructions').trim().isLength({ min: 10, max: 10000 }).withMessage('Add cooking instructions.'),
  body('ingredients').custom((value) => {
    let items = value;
    if (typeof value === 'string') {
      try { items = JSON.parse(value); } catch { throw new Error('Ingredients must be valid.'); }
    }
    if (!Array.isArray(items) || items.length < 1 || items.length > 100) throw new Error('Add between 1 and 100 ingredients.');
    for (const item of items) {
      if (typeof item?.name !== 'string' || !item.name.trim() || item.name.trim().length > 120
        || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0 || Number(item.quantity) > 9999999.999
        || typeof item.unit !== 'string' || !item.unit.trim() || item.unit.trim().length > 40) {
        throw new Error('Each ingredient needs a name, positive quantity, and unit.');
      }
    }
    return true;
  })
];

export const searchRule = query('q').optional().trim().isLength({ max: 100 }).withMessage('Search query is too long.');
export const recipeQueryRules = [
  searchRule,
  query('category').optional().isInt({ min: 1 }).withMessage('Invalid category.'),
  query('maxPrep').optional().isInt({ min: 0, max: 1440 }).withMessage('Invalid preparation time filter.'),
  query('maxCook').optional().isInt({ min: 0, max: 1440 }).withMessage('Invalid cooking time filter.'),
  query('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('Rating filter must be between 0 and 5.'),
  query('mealType').optional().isIn(['Breakfast', 'Lunch', 'Dinner', 'Snacks']).withMessage('Invalid meal type.'),
  query('sort').optional().isIn(['recent', 'rating', 'popular', 'title']).withMessage('Invalid sort order.')
];

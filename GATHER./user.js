import { Router } from 'express';
import { body, param } from 'express-validator';
import pool from '../config/db.js';
import { asyncHandler, HttpError, success } from '../utils/http.js';
import { validate } from '../utils/validation.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';

const router = Router();

router.get('/favorites', requireAuth, asyncHandler(async (req, res) => {
  const [recipes] = await pool.execute(
    `SELECT r.recipe_id, r.title, r.image_url, r.prep_time, r.cook_time, c.category_name,
            COALESCE(AVG(rv.rating),0) AS average_rating, COUNT(DISTINCT rv.review_id) AS review_count, TRUE AS is_favorite
     FROM favorites f JOIN recipes r ON r.recipe_id = f.recipe_id
     JOIN categories c ON c.category_id = r.category_id
     LEFT JOIN reviews rv ON rv.recipe_id = r.recipe_id
     WHERE f.user_id = ? GROUP BY r.recipe_id ORDER BY f.created_at DESC`,
    [req.user.user_id]
  );
  success(res, recipes);
}));

router.post('/favorites/:id', requireAuth, asyncHandler(async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) throw new HttpError(400, 'Invalid recipe ID.');
  const [recipe] = await pool.execute('SELECT recipe_id FROM recipes WHERE recipe_id = ? AND is_published = TRUE', [req.params.id]);
  if (!recipe.length) throw new HttpError(404, 'Recipe not found.');
  await pool.execute('INSERT IGNORE INTO favorites (user_id, recipe_id) VALUES (?, ?)', [req.user.user_id, req.params.id]);
  success(res, { favorite: true });
}));

router.delete('/favorites/:id', requireAuth, asyncHandler(async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) throw new HttpError(400, 'Invalid recipe ID.');
  await pool.execute('DELETE FROM favorites WHERE user_id = ? AND recipe_id = ?', [req.user.user_id, req.params.id]);
  success(res, { favorite: false });
}));

router.delete('/reviews/:id', requireAuth, asyncHandler(async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) throw new HttpError(400, 'Invalid review ID.');
  const [result] = await pool.execute('DELETE FROM reviews WHERE review_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
  if (!result.affectedRows) throw new HttpError(404, 'Your review was not found.');
  success(res, { message: 'Your review was removed.' });
}));

router.get('/meal-plans', requireAuth, asyncHandler(async (req, res) => {
  const from = req.query.from || new Date().toISOString().slice(0, 10);
  const to = req.query.to || new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    throw new HttpError(400, 'Provide a valid date range.');
  }
  const [plans] = await pool.execute(
    `SELECT mp.plan_id, mp.recipe_id, mp.plan_date, mp.meal_type, r.title, r.image_url
     FROM meal_plans mp JOIN recipes r ON r.recipe_id = mp.recipe_id
     WHERE mp.user_id = ? AND mp.plan_date BETWEEN ? AND ? ORDER BY mp.plan_date, FIELD(mp.meal_type,'BREAKFAST','LUNCH','DINNER','SNACK')`,
    [req.user.user_id, from, to]
  );
  success(res, plans);
}));

router.post('/meal-plans', requireAuth, validate([
  body('recipe_id').isInt({ min: 1 }).withMessage('Select a recipe.'),
  body('plan_date').isISO8601({ strict: true }).withMessage('Select a valid date.'),
  body('meal_type').isIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']).withMessage('Select a valid meal type.')
]), asyncHandler(async (req, res) => {
  const [recipe] = await pool.execute('SELECT recipe_id FROM recipes WHERE recipe_id = ? AND is_published = TRUE', [req.body.recipe_id]);
  if (!recipe.length) throw new HttpError(404, 'Recipe not found.');
  const [result] = await pool.execute(
    'INSERT INTO meal_plans (user_id, recipe_id, plan_date, meal_type) VALUES (?, ?, ?, ?)',
    [req.user.user_id, req.body.recipe_id, req.body.plan_date, req.body.meal_type]
  );
  success(res, { plan_id: result.insertId }, 201);
}));

router.put('/meal-plans/:id', requireAuth, validate([
  param('id').isInt({ min: 1 }).withMessage('Invalid meal plan ID.'),
  body('recipe_id').isInt({ min: 1 }).withMessage('Select a recipe.'),
  body('plan_date').isISO8601({ strict: true }).withMessage('Select a valid date.'),
  body('meal_type').isIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']).withMessage('Select a valid meal type.')
]), asyncHandler(async (req, res) => {
  const [recipe] = await pool.execute('SELECT recipe_id FROM recipes WHERE recipe_id = ? AND is_published = TRUE', [req.body.recipe_id]);
  if (!recipe.length) throw new HttpError(404, 'Recipe not found.');
  const [existing] = await pool.execute('SELECT plan_id FROM meal_plans WHERE plan_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
  if (!existing.length) throw new HttpError(404, 'Planned meal not found.');
  await pool.execute(
    'UPDATE meal_plans SET recipe_id = ?, plan_date = ?, meal_type = ? WHERE plan_id = ? AND user_id = ?',
    [req.body.recipe_id, req.body.plan_date, req.body.meal_type, req.params.id, req.user.user_id]
  );
  success(res, { message: 'Meal updated.' });
}));

router.delete('/meal-plans/:id', requireAuth, asyncHandler(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM meal_plans WHERE plan_id = ? AND user_id = ?', [req.params.id, req.user.user_id]);
  if (!result.affectedRows) throw new HttpError(404, 'Planned meal not found.');
  success(res, { message: 'Meal removed from your plan.' });
}));

router.get('/shopping-list', requireAuth, asyncHandler(async (req, res) => {
  const from = req.query.from;
  const to = req.query.to;
  if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    throw new HttpError(400, 'Provide a valid date range.');
  }
  const [items] = await pool.execute(
    `SELECT i.name, ri.unit, SUM(ri.quantity) AS quantity
     FROM meal_plans mp JOIN recipe_ingredients ri ON ri.recipe_id = mp.recipe_id
     JOIN ingredients i ON i.ingredient_id = ri.ingredient_id
     WHERE mp.user_id = ? AND mp.plan_date BETWEEN ? AND ?
     GROUP BY i.ingredient_id, LOWER(ri.unit) ORDER BY i.name`,
    [req.user.user_id, from, to]
  );
  success(res, items);
}));

router.get('/profile', requireAuth, asyncHandler(async (req, res) => {
  const [users] = await pool.execute(
    'SELECT user_id, name, email, profile_image, role, created_at FROM users WHERE user_id = ?',
    [req.user.user_id]
  );
  const [recipes] = await pool.execute(
    'SELECT recipe_id, title, image_url, created_at FROM recipes WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.user_id]
  );
  const [reviews] = await pool.execute(
    'SELECT rv.review_id, rv.rating, rv.comment, rv.created_at, r.title, r.recipe_id FROM reviews rv JOIN recipes r ON r.recipe_id = rv.recipe_id WHERE rv.user_id = ? ORDER BY rv.created_at DESC',
    [req.user.user_id]
  );
  success(res, { ...users[0], recipes, reviews });
}));

router.put('/profile', requireAuth, uploadImage, validate([
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.')
]), asyncHandler(async (req, res) => {
  const updates = [];
  const params = [];
  if (req.body.name) { updates.push('name = ?'); params.push(req.body.name.trim()); }
  if (req.file) { updates.push('profile_image = ?'); params.push(`/uploads/${req.file.filename}`); }
  if (updates.length) await pool.execute(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`, [...params, req.user.user_id]);
  const [updated] = await pool.execute('SELECT user_id, name, email, profile_image, role, created_at FROM users WHERE user_id = ?', [req.user.user_id]);
  success(res, updated[0]);
}));

export default router;

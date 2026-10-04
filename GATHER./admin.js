import { Router } from 'express';
import { body } from 'express-validator';
import pool from '../config/db.js';
import { asyncHandler, success } from '../utils/http.js';
import { idParam, validate } from '../utils/validation.js';

const router = Router();

router.get('/dashboard', asyncHandler(async (_req, res) => {
  const [[users]] = await pool.execute('SELECT COUNT(*) AS total, SUM(is_active = TRUE) AS active FROM users');
  const [[recipes]] = await pool.execute('SELECT COUNT(*) AS total FROM recipes');
  const [[reviews]] = await pool.execute("SELECT COUNT(*) AS total, SUM(created_at >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')) AS this_month FROM reviews");
  const [[plans]] = await pool.execute('SELECT COUNT(*) AS total FROM meal_plans');
  const [recentUsers] = await pool.execute('SELECT user_id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT 8');
  const [recentRecipes] = await pool.execute('SELECT recipe_id, title, created_at FROM recipes ORDER BY created_at DESC LIMIT 8');
  const [activity] = await pool.execute(
    `SELECT activity, description, created_at FROM (
      SELECT 'recipe' AS activity, CONCAT('New recipe: ', title) AS description, created_at FROM recipes
      UNION ALL SELECT 'user', CONCAT('New member: ', name), created_at FROM users
      UNION ALL SELECT 'review', CONCAT('Review added to ', r.title), rv.created_at FROM reviews rv JOIN recipes r ON r.recipe_id = rv.recipe_id
    ) a ORDER BY created_at DESC LIMIT 12`
  );
  const [monthly] = await pool.execute(
    `SELECT DATE_FORMAT(months.month_start, '%Y-%m') AS month,
      COALESCE(u.total, 0) AS users, COALESCE(r.total, 0) AS recipes,
      COALESCE(v.total, 0) AS reviews, COALESCE(m.total, 0) AS meal_plans
     FROM (
       SELECT DATE_FORMAT(CURRENT_DATE - INTERVAL n MONTH, '%Y-%m-01') AS month_start
       FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) seq
     ) months
     LEFT JOIN (SELECT DATE_FORMAT(created_at,'%Y-%m-01') m, COUNT(*) total FROM users GROUP BY m) u ON u.m = months.month_start
     LEFT JOIN (SELECT DATE_FORMAT(created_at,'%Y-%m-01') m, COUNT(*) total FROM recipes GROUP BY m) r ON r.m = months.month_start
     LEFT JOIN (SELECT DATE_FORMAT(created_at,'%Y-%m-01') m, COUNT(*) total FROM reviews GROUP BY m) v ON v.m = months.month_start
     LEFT JOIN (SELECT DATE_FORMAT(created_at,'%Y-%m-01') m, COUNT(*) total FROM meal_plans GROUP BY m) m ON m.m = months.month_start
     ORDER BY months.month_start`
  );
  success(res, {
    totals: { users: users.total, active_users: users.active || 0, recipes: recipes.total, reviews: reviews.total, reviews_this_month: reviews.this_month || 0, meal_plans: plans.total },
    recentUsers, recentRecipes, activity, monthly
  });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const q = `%${String(req.query.q || '').slice(0, 100)}%`;
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = 25;
  const [users] = await pool.execute(
    'SELECT user_id, name, email, role, is_active, created_at FROM users WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [q, q, limit, (page - 1) * limit]
  );
  success(res, users);
}));

router.get('/users/:id', validate(idParam), asyncHandler(async (req, res) => {
  const [users] = await pool.execute(
    'SELECT user_id, name, email, profile_image, role, is_active, created_at FROM users WHERE user_id = ?',
    [req.params.id]
  );
  if (!users[0]) return res.status(404).json({ success: false, message: 'User not found.' });
  success(res, users[0]);
}));

router.patch('/users/:id/status', validate([
  ...idParam,
  body('is_active').isBoolean().withMessage('Account status must be enabled or disabled.')
]), asyncHandler(async (req, res) => {
  const [result] = await pool.execute(
    'UPDATE users SET is_active = ? WHERE user_id = ? AND role != ?',
    [req.body.is_active, req.params.id, 'ADMIN']
  );
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'User not found or cannot be changed.' });
  success(res, { message: `Account ${req.body.is_active ? 'enabled' : 'disabled'}.` });
}));

router.delete('/users/:id', validate(idParam), asyncHandler(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM users WHERE user_id = ? AND role != ?', [req.params.id, 'ADMIN']);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'User not found or cannot be deleted.' });
  success(res, { message: 'User deleted.' });
}));

router.get('/recipes', asyncHandler(async (req, res) => {
  const q = `%${String(req.query.q || '').slice(0, 100)}%`;
  const [rows] = await pool.execute(
    `SELECT r.recipe_id, r.title, r.image_url, r.created_at, u.name AS author_name, c.category_name
     FROM recipes r JOIN users u ON u.user_id = r.user_id JOIN categories c ON c.category_id = r.category_id
     WHERE r.title LIKE ? ORDER BY r.created_at DESC LIMIT 100`, [q]
  );
  success(res, rows);
}));

router.delete('/recipes/:id', validate(idParam), asyncHandler(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM recipes WHERE recipe_id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Recipe not found.' });
  success(res, { message: 'Recipe removed.' });
}));

router.get('/categories', asyncHandler(async (_req, res) => {
  const [rows] = await pool.execute(
    'SELECT c.category_id, c.category_name, COUNT(r.recipe_id) AS recipe_count FROM categories c LEFT JOIN recipes r ON r.category_id = c.category_id GROUP BY c.category_id ORDER BY c.category_name'
  );
  success(res, rows);
}));

router.post('/categories', validate([body('category_name').trim().isLength({ min: 2, max: 60 }).withMessage('Category name must be 2–60 characters.')]),
  asyncHandler(async (req, res) => {
    const [result] = await pool.execute('INSERT INTO categories (category_name) VALUES (?)', [req.body.category_name.trim()]);
    success(res, { category_id: result.insertId, category_name: req.body.category_name.trim() }, 201);
  })
);

router.put('/categories/:id', validate([
  ...idParam,
  body('category_name').trim().isLength({ min: 2, max: 60 }).withMessage('Category name must be 2–60 characters.')
]), asyncHandler(async (req, res) => {
  const [existing] = await pool.execute('SELECT category_id FROM categories WHERE category_id = ?', [req.params.id]);
  if (!existing.length) return res.status(404).json({ success: false, message: 'Category not found.' });
  await pool.execute('UPDATE categories SET category_name = ? WHERE category_id = ?', [req.body.category_name.trim(), req.params.id]);
  success(res, { message: 'Category updated.' });
}));

router.delete('/categories/:id', validate(idParam), asyncHandler(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM categories WHERE category_id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Category not found.' });
  success(res, { message: 'Category deleted.' });
}));

router.get('/reviews', asyncHandler(async (_req, res) => {
  const [rows] = await pool.execute(
    `SELECT rv.review_id, rv.rating, rv.comment, rv.created_at, u.name AS user_name, r.title, r.recipe_id
     FROM reviews rv JOIN users u ON u.user_id = rv.user_id JOIN recipes r ON r.recipe_id = rv.recipe_id
     ORDER BY rv.created_at DESC LIMIT 200`
  );
  success(res, rows);
}));

router.delete('/reviews/:id', validate(idParam), asyncHandler(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM reviews WHERE review_id = ?', [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Review not found.' });
  success(res, { message: 'Review removed.' });
}));

export default router;

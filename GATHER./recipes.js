import { Router } from 'express';
import { body, param } from 'express-validator';
import pool from '../config/db.js';
import { asyncHandler, HttpError, pagination, success } from '../utils/http.js';
import { idParam, recipeQueryRules, recipeRules, validate } from '../utils/validation.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';

const router = Router();
const getIngredients = (value) => typeof value === 'string' ? JSON.parse(value) : value;

async function replaceIngredients(connection, recipeId, ingredients) {
  await connection.execute('DELETE FROM recipe_ingredients WHERE recipe_id = ?', [recipeId]);
  for (const ingredient of getIngredients(ingredients)) {
    const name = ingredient.name.trim().replace(/\s+/g, ' ');
    const [created] = await connection.execute(
      'INSERT INTO ingredients (name) VALUES (?) ON DUPLICATE KEY UPDATE ingredient_id = LAST_INSERT_ID(ingredient_id)',
      [name]
    );
    await connection.execute(
      'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)',
      [recipeId, created.insertId, Number(ingredient.quantity), ingredient.unit.trim()]
    );
  }
}

const recipeSelect = `
 SELECT r.recipe_id, r.user_id, r.category_id, r.title, r.description, r.image_url,
        r.prep_time, r.cook_time, r.servings, r.instructions, r.created_at, r.updated_at,
        u.name AS author_name, u.profile_image AS author_image, c.category_name,
        COALESCE(AVG(rv.rating), 0) AS average_rating, COUNT(DISTINCT rv.review_id) AS review_count,
        (SELECT COUNT(*) FROM favorites f2 WHERE f2.recipe_id = r.recipe_id) AS favorite_count,
        GROUP_CONCAT(DISTINCT i.name ORDER BY i.name SEPARATOR ',') AS ingredient_names
 FROM recipes r
 JOIN users u ON u.user_id = r.user_id
 JOIN categories c ON c.category_id = r.category_id
 LEFT JOIN reviews rv ON rv.recipe_id = r.recipe_id
 LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.recipe_id
 LEFT JOIN ingredients i ON i.ingredient_id = ri.ingredient_id`;

router.get('/categories', asyncHandler(async (_req, res) => {
  const [rows] = await pool.execute('SELECT category_id, category_name FROM categories ORDER BY category_name');
  success(res, rows);
}));

router.get('/recommendations', requireAuth, asyncHandler(async (req, res) => {
  const preference = `
    r.category_id IN (
      SELECT preferred.category_id FROM (
        SELECT r2.category_id FROM favorites f
        JOIN recipes r2 ON r2.recipe_id = f.recipe_id WHERE f.user_id = ?
        UNION ALL
        SELECT r3.category_id FROM reviews rv
        JOIN recipes r3 ON r3.recipe_id = rv.recipe_id WHERE rv.user_id = ? AND rv.rating >= 4
      ) preferred
    )`;
  const [rows] = await pool.execute(
    `${recipeSelect} WHERE r.is_published = TRUE AND r.user_id != ? AND ${preference}
     GROUP BY r.recipe_id ORDER BY average_rating DESC, favorite_count DESC LIMIT 4`,
    [req.user.user_id, req.user.user_id, req.user.user_id]
  );
  success(res, { items: rows, basis: 'Matches favorite categories and recipes rated 4 stars or higher. No recommendations are invented when there is not enough history.' });
}));

const listRecipes = asyncHandler(async (req, res) => {
  const { page, limit, offset } = pagination(req.query);
  const clauses = ['r.is_published = TRUE'];
  const params = [];
  if (req.query.q?.trim()) {
    const term = `%${req.query.q.trim()}%`;
    clauses.push('(r.title LIKE ? OR r.description LIKE ? OR c.category_name LIKE ? OR EXISTS (SELECT 1 FROM recipe_ingredients sri JOIN ingredients si ON si.ingredient_id = sri.ingredient_id WHERE sri.recipe_id = r.recipe_id AND si.name LIKE ?))');
    params.push(term, term, term, term);
  }
  if (req.query.category) { clauses.push('r.category_id = ?'); params.push(Number(req.query.category)); }
  if (req.query.maxPrep) { clauses.push('r.prep_time <= ?'); params.push(Number(req.query.maxPrep)); }
  if (req.query.maxCook) { clauses.push('r.cook_time <= ?'); params.push(Number(req.query.maxCook)); }
  if (req.query.mealType) { clauses.push('c.category_name = ?'); params.push(req.query.mealType); }
  if (req.query.minRating) {
    clauses.push('COALESCE((SELECT AVG(rating) FROM reviews WHERE recipe_id = r.recipe_id), 0) >= ?');
    params.push(Number(req.query.minRating));
  }
  const orderBy = {
    recent: 'r.created_at DESC', rating: 'average_rating DESC, review_count DESC',
    popular: 'favorite_count DESC, review_count DESC', title: 'r.title ASC'
  }[req.query.sort] || 'r.created_at DESC';
  const where = clauses.join(' AND ');
  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS total FROM recipes r JOIN categories c ON c.category_id = r.category_id WHERE ${where}`,
    params
  );
  const [rows] = await pool.execute(
    `${recipeSelect} WHERE ${where} GROUP BY r.recipe_id ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  if (req.user && rows.length) {
    const ids = rows.map((row) => row.recipe_id);
    const [saved] = await pool.query(
      'SELECT recipe_id FROM favorites WHERE user_id = ? AND recipe_id IN (?)',
      [req.user.user_id, ids]
    );
    const savedIds = new Set(saved.map((item) => item.recipe_id));
    rows.forEach((row) => { row.is_favorite = savedIds.has(row.recipe_id); });
  }
  success(res, { items: rows, page, limit, total: countRows[0].total, pages: Math.ceil(countRows[0].total / limit) });
});
router.get('/', optionalAuth, validate(recipeQueryRules), listRecipes);
router.get('/search', optionalAuth, validate(recipeQueryRules), listRecipes);

router.get('/:id', optionalAuth, validate(idParam), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    `${recipeSelect} WHERE r.recipe_id = ? AND r.is_published = TRUE GROUP BY r.recipe_id`,
    [req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Recipe not found.');
  const recipe = rows[0];
  const [ingredients] = await pool.execute(
    'SELECT i.name, ri.quantity, ri.unit FROM recipe_ingredients ri JOIN ingredients i ON i.ingredient_id = ri.ingredient_id WHERE ri.recipe_id = ? ORDER BY ri.recipe_ingredient_id',
    [recipe.recipe_id]
  );
  const [reviews] = await pool.execute(
    'SELECT rv.review_id, rv.rating, rv.comment, rv.created_at, u.name AS user_name, u.profile_image FROM reviews rv JOIN users u ON u.user_id = rv.user_id WHERE rv.recipe_id = ? ORDER BY rv.created_at DESC LIMIT 50',
    [recipe.recipe_id]
  );
  recipe.ingredients = ingredients;
  recipe.reviews = reviews;
  recipe.is_favorite = false;
  if (req.user) {
    const [favorite] = await pool.execute('SELECT 1 FROM favorites WHERE user_id = ? AND recipe_id = ?', [req.user.user_id, recipe.recipe_id]);
    recipe.is_favorite = favorite.length > 0;
  }
  success(res, recipe);
}));

router.post('/', requireAuth, uploadImage, validate(recipeRules), asyncHandler(async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [category] = await connection.execute('SELECT category_id FROM categories WHERE category_id = ?', [req.body.category_id]);
    if (!category.length) throw new HttpError(400, 'Selected category does not exist.');
    const [result] = await connection.execute(
      `INSERT INTO recipes (user_id, category_id, title, description, image_url, prep_time, cook_time, servings, instructions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.user_id, req.body.category_id, req.body.title.trim(), req.body.description.trim(),
        req.file ? `/uploads/${req.file.filename}` : req.body.image_url || null,
        req.body.prep_time, req.body.cook_time, req.body.servings, req.body.instructions.trim()]
    );
    await replaceIngredients(connection, result.insertId, req.body.ingredients);
    await connection.commit();
    success(res, { recipe_id: result.insertId }, 201);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.put('/:id', requireAuth, uploadImage, validate([...idParam, ...recipeRules]), asyncHandler(async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute('SELECT user_id, image_url FROM recipes WHERE recipe_id = ? FOR UPDATE', [req.params.id]);
    if (!rows[0]) throw new HttpError(404, 'Recipe not found.');
    if (rows[0].user_id !== req.user.user_id && req.user.role !== 'ADMIN') throw new HttpError(403, 'You can only edit your own recipes.');
    const [category] = await connection.execute('SELECT category_id FROM categories WHERE category_id = ?', [req.body.category_id]);
    if (!category.length) throw new HttpError(400, 'Selected category does not exist.');
    await connection.execute(
      `UPDATE recipes SET category_id = ?, title = ?, description = ?, image_url = ?, prep_time = ?,
       cook_time = ?, servings = ?, instructions = ? WHERE recipe_id = ?`,
      [req.body.category_id, req.body.title.trim(), req.body.description.trim(),
        req.file ? `/uploads/${req.file.filename}` : req.body.image_url || rows[0].image_url,
        req.body.prep_time, req.body.cook_time, req.body.servings, req.body.instructions.trim(), req.params.id]
    );
    await replaceIngredients(connection, req.params.id, req.body.ingredients);
    await connection.commit();
    success(res, { recipe_id: Number(req.params.id) });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.delete('/:id', requireAuth, validate(idParam), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT user_id FROM recipes WHERE recipe_id = ?', [req.params.id]);
  if (!rows[0]) throw new HttpError(404, 'Recipe not found.');
  if (rows[0].user_id !== req.user.user_id && req.user.role !== 'ADMIN') throw new HttpError(403, 'You can only delete your own recipes.');
  await pool.execute('DELETE FROM recipes WHERE recipe_id = ?', [req.params.id]);
  success(res, { message: 'Recipe deleted.' });
}));

router.get('/:id/reviews', validate(idParam), asyncHandler(async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT rv.review_id, rv.rating, rv.comment, rv.created_at, u.name AS user_name, u.profile_image FROM reviews rv JOIN users u ON u.user_id = rv.user_id WHERE rv.recipe_id = ? ORDER BY rv.created_at DESC',
    [req.params.id]
  );
  success(res, rows);
}));

router.post('/:id/reviews', requireAuth, validate([
  ...idParam,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be from 1 to 5.'),
  body('comment').trim().isLength({ min: 3, max: 2000 }).withMessage('Review must be 3–2000 characters.')
]), asyncHandler(async (req, res) => {
  const [recipe] = await pool.execute('SELECT recipe_id FROM recipes WHERE recipe_id = ?', [req.params.id]);
  if (!recipe.length) throw new HttpError(404, 'Recipe not found.');
  await pool.execute(
    `INSERT INTO reviews (user_id, recipe_id, rating, comment) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = CURRENT_TIMESTAMP`,
    [req.user.user_id, req.params.id, req.body.rating, req.body.comment.trim()]
  );
  success(res, { message: 'Your review has been saved.' }, 201);
}));

router.put('/reviews/:reviewId', requireAuth, validate([
  param('reviewId').isInt({ min: 1 }).withMessage('Invalid review ID.'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be from 1 to 5.'),
  body('comment').trim().isLength({ min: 3, max: 2000 }).withMessage('Review must be 3–2000 characters.')
]), asyncHandler(async (req, res) => {
  const [existing] = await pool.execute('SELECT review_id FROM reviews WHERE review_id = ? AND user_id = ?', [req.params.reviewId, req.user.user_id]);
  if (!existing.length) throw new HttpError(404, 'Your review was not found.');
  await pool.execute(
    'UPDATE reviews SET rating = ?, comment = ? WHERE review_id = ? AND user_id = ?',
    [req.body.rating, req.body.comment.trim(), req.params.reviewId, req.user.user_id]
  );
  success(res, { message: 'Your review has been updated.' });
}));

router.delete('/reviews/:reviewId', requireAuth, validate([
  param('reviewId').isInt({ min: 1 }).withMessage('Invalid review ID.')
]), asyncHandler(async (req, res) => {
  const [result] = await pool.execute(
    'DELETE FROM reviews WHERE review_id = ? AND user_id = ?',
    [req.params.reviewId, req.user.user_id]
  );
  if (!result.affectedRows) throw new HttpError(404, 'Your review was not found.');
  success(res, { message: 'Your review was removed.' });
}));

export default router;

import '../config/env.js';
import pool from '../config/db.js';

const recipes = [
  {
    title: 'Chicken Biryani', category: 'Dinner', description: 'Fragrant basmati rice layered with spiced chicken, herbs, and crispy golden onions.',
    image: 'https://images.unsplash.com/photo-1563379091339-03246963d96c?auto=format&fit=crop&w=1100&q=85',
    prep: 25, cook: 55, servings: 4,
    instructions: 'Rinse and soak the basmati rice for 20 minutes.\nSeason the chicken with yogurt, ginger, garlic, and biryani spices.\nCook onions in oil until deeply golden, then add the chicken and cook until browned.\nLayer the partially cooked rice over the chicken and finish with mint, cilantro, and saffron milk.\nCover tightly and steam on low heat until the rice is tender. Fluff gently before serving.',
    ingredients: [['chicken', 700, 'g'], ['basmati rice', 2, 'cups'], ['plain yogurt', 0.5, 'cup'], ['onion', 2, 'pieces'], ['ginger garlic paste', 2, 'tbsp'], ['fresh mint', 0.25, 'cup']]
  },
  {
    title: 'Garden Vegetable Pasta', category: 'Vegetarian', description: 'A bright, weeknight-friendly pasta tossed with seasonal vegetables, lemon, and parmesan.',
    image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=1100&q=85',
    prep: 15, cook: 20, servings: 3,
    instructions: 'Bring a large pot of salted water to a boil and cook pasta until al dente.\nWarm olive oil in a pan and cook garlic until fragrant.\nAdd sliced zucchini, cherry tomatoes, and peas; saute until just tender.\nToss in the drained pasta with lemon zest, lemon juice, and a splash of pasta water.\nFinish with parmesan and fresh basil.',
    ingredients: [['pasta', 250, 'g'], ['zucchini', 1, 'piece'], ['cherry tomatoes', 1, 'cup'], ['peas', 0.5, 'cup'], ['garlic', 2, 'cloves'], ['parmesan', 0.25, 'cup']]
  },
  {
    title: 'Chocolate Celebration Cake', category: 'Dessert', description: 'A tender cocoa-rich layer cake with silky chocolate frosting for sharing around the table.',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1100&q=85',
    prep: 25, cook: 35, servings: 10,
    instructions: 'Heat the oven to 175°C and line two round cake pans.\nWhisk flour, cocoa, sugar, baking soda, and salt in a large bowl.\nAdd eggs, milk, oil, and vanilla; mix until smooth, then carefully whisk in hot coffee.\nDivide the batter between the pans and bake until a tester comes out clean.\nCool completely and layer with chocolate frosting.',
    ingredients: [['all-purpose flour', 2, 'cups'], ['cocoa powder', 0.75, 'cup'], ['sugar', 2, 'cups'], ['eggs', 2, 'pieces'], ['milk', 1, 'cup'], ['coffee', 1, 'cup']]
  },
  {
    title: 'Masala Dosa', category: 'Breakfast', description: 'Crisp golden fermented rice crepes wrapped around warmly spiced potato masala.',
    image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=1100&q=85',
    prep: 20, cook: 25, servings: 4,
    instructions: 'Boil potatoes until tender, then peel and roughly mash.\nTemper mustard seeds, curry leaves, and cumin in oil; add sliced onion and green chilli.\nStir in turmeric, potatoes, salt, and a squeeze of lemon.\nSpread a thin layer of dosa batter over a hot, lightly oiled pan.\nCook until crisp, add potato masala, fold, and serve with chutney.',
    ingredients: [['dosa batter', 3, 'cups'], ['potato', 4, 'pieces'], ['onion', 1, 'piece'], ['mustard seeds', 1, 'tsp'], ['curry leaves', 10, 'leaves'], ['turmeric', 0.5, 'tsp']]
  },
  {
    title: 'Paneer Butter Masala', category: 'Vegetarian', description: 'Soft paneer in a velvety tomato and cashew sauce, made for scooping up with warm naan.',
    image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=1100&q=85',
    prep: 15, cook: 30, servings: 4,
    instructions: 'Saute onion, ginger, and garlic until soft, then add tomatoes and cashews.\nSimmer until the tomatoes break down, then blend the mixture until silky smooth.\nReturn the sauce to the pan and stir in butter, cream, and garam masala.\nAdd paneer cubes and simmer gently for 8 minutes.\nFinish with kasuri methi and fresh cilantro.',
    ingredients: [['paneer', 400, 'g'], ['tomato', 4, 'pieces'], ['onion', 1, 'piece'], ['cashews', 12, 'pieces'], ['cream', 0.25, 'cup'], ['butter', 2, 'tbsp']]
  },
  {
    title: 'Smoky Chicken Tikka', category: 'Non-Vegetarian', description: 'Yogurt-marinated chicken with warm spices, charred edges, and a squeeze of fresh lime.',
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=1100&q=85',
    prep: 20, cook: 22, servings: 4,
    instructions: 'Cut chicken into even pieces and pat dry.\nWhisk yogurt with lemon juice, ginger garlic, paprika, cumin, coriander, and salt.\nCoat the chicken well and marinate for at least 30 minutes.\nThread onto skewers and grill or roast at high heat, turning once, until cooked through and lightly charred.\nServe with lime wedges and mint chutney.',
    ingredients: [['chicken breast', 600, 'g'], ['plain yogurt', 0.75, 'cup'], ['lemon juice', 2, 'tbsp'], ['paprika', 1, 'tsp'], ['ground cumin', 1, 'tsp'], ['ginger garlic paste', 1, 'tbsp']]
  },
  {
    title: 'Idli Sambar', category: 'Breakfast', description: 'Soft steamed rice cakes paired with a comforting lentil stew and crunchy tempering.',
    image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1100&q=85',
    prep: 15, cook: 35, servings: 4,
    instructions: 'Steam idli batter in a greased idli stand until fluffy and cooked through.\nPressure cook toor dal with turmeric until soft, then whisk smooth.\nSimmer chopped vegetables with tamarind water and sambar powder until tender.\nAdd the cooked dal and simmer gently for 8 minutes.\nTemper mustard seeds, dried chilli, and curry leaves in hot oil and stir through. Serve with idli.',
    ingredients: [['idli batter', 3, 'cups'], ['toor dal', 0.75, 'cup'], ['carrot', 1, 'piece'], ['tomato', 1, 'piece'], ['tamarind', 1, 'tbsp'], ['sambar powder', 2, 'tbsp']]
  },
  {
    title: 'Sesame Veg Fried Rice', category: 'Lunch', description: 'Quick, colorful fried rice with crisp vegetables and a savory sesame-soy finish.',
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1100&q=85',
    prep: 15, cook: 12, servings: 3,
    instructions: 'Use cold, cooked rice for the best texture.\nHeat a wok until very hot and add sesame oil.\nStir-fry garlic, carrots, peas, and spring onion for 2 minutes.\nAdd rice, soy sauce, and a pinch of white pepper; toss until steaming.\nFinish with toasted sesame seeds and sliced spring onion.',
    ingredients: [['cooked rice', 3, 'cups'], ['carrot', 1, 'piece'], ['peas', 0.5, 'cup'], ['spring onion', 3, 'pieces'], ['soy sauce', 2, 'tbsp'], ['sesame oil', 1, 'tbsp']]
  }
];

if (!process.env.ADMIN_EMAIL) {
  throw new Error('Set ADMIN_EMAIL to the account that should have development administrator access.');
}

try {
  await pool.execute(`INSERT IGNORE INTO categories (category_name) VALUES
    ('Breakfast'),('Lunch'),('Dinner'),('Dessert'),('Snacks'),('Vegetarian'),('Non-Vegetarian'),('Healthy')`);
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase();
  const [found] = await pool.execute('SELECT user_id FROM users WHERE email = ?', [adminEmail]);
  if (!found.length) {
    await pool.execute(
      'INSERT INTO users (name, email, role, email_verified) VALUES (?, ?, ?, TRUE)',
      [process.env.ADMIN_NAME || 'Platform Admin', adminEmail, 'ADMIN']
    );
  } else {
    await pool.execute('UPDATE users SET role = ? WHERE email = ?', ['ADMIN', adminEmail]);
  }
  const demoEmail = 'cook@gather.example';
  let [authors] = await pool.execute('SELECT user_id FROM users WHERE email = ?', [demoEmail]);
  if (!authors.length) {
    const [created] = await pool.execute(
      'INSERT INTO users (name, email, email_verified) VALUES (?, ?, TRUE)',
      ['Gather Community Kitchen', demoEmail]
    );
    authors = [{ user_id: created.insertId }];
  }
  const authorId = authors[0].user_id;
  for (const recipe of recipes) {
    const [exists] = await pool.execute('SELECT recipe_id FROM recipes WHERE title = ? AND user_id = ?', [recipe.title, authorId]);
    if (exists.length) continue;
    const [[category]] = await pool.execute('SELECT category_id FROM categories WHERE category_name = ?', [recipe.category]);
    const [created] = await pool.execute(
      'INSERT INTO recipes (user_id, category_id, title, description, image_url, prep_time, cook_time, servings, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [authorId, category.category_id, recipe.title, recipe.description, recipe.image, recipe.prep, recipe.cook, recipe.servings, recipe.instructions]
    );
    for (const [name, quantity, unit] of recipe.ingredients) {
      const [inserted] = await pool.execute('INSERT INTO ingredients (name) VALUES (?) ON DUPLICATE KEY UPDATE ingredient_id = LAST_INSERT_ID(ingredient_id)', [name]);
      await pool.execute(
        'INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit) VALUES (?, ?, ?, ?)',
        [created.insertId, inserted.insertId, quantity, unit]
      );
    }
  }
  console.log(`Seeded categories, demo recipes, and admin ${adminEmail}.`);
} finally {
  await pool.end();
}

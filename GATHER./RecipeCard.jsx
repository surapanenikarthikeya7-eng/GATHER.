import { Heart, Clock3, Star, ArrowUpRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { mediaUrl } from '../utils/media';

const fallback = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85';

export default function RecipeCard({ recipe, onFavorite }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const toggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) return navigate('/login');
    try {
      if (recipe.is_favorite) await api.delete(`/favorites/${recipe.recipe_id}`);
      else await api.post(`/favorites/${recipe.recipe_id}`);
      onFavorite?.(recipe.recipe_id, !recipe.is_favorite);
      toast(recipe.is_favorite ? 'Removed from your saved recipes.' : 'Saved to your favorites.');
    } catch (error) { toast(error.message, 'error'); }
  };
  return <article className="recipe-card">
    <Link className="recipe-image-wrap" to={`/recipes/${recipe.recipe_id}`} aria-label={`View ${recipe.title}`}>
      <img className="recipe-image" src={mediaUrl(recipe.image_url) || fallback} alt={recipe.title} loading="lazy" onError={(e) => { e.currentTarget.src = fallback; }} />
      <span className="category-pill">{recipe.category_name || 'From our community'}</span>
    </Link>
    <button className={`favorite-button${recipe.is_favorite ? ' selected' : ''}`} onClick={toggle} aria-label={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}><Heart size={18} fill={recipe.is_favorite ? 'currentColor' : 'none'} /></button>
    <div className="recipe-card-body">
      <div className="recipe-rating"><Star size={14} fill="currentColor" /> {Number(recipe.average_rating || 0).toFixed(1)} <span>({recipe.review_count || 0})</span><span className="cook-time"><Clock3 size={13} /> {(Number(recipe.prep_time) || 0) + (Number(recipe.cook_time) || 0)} min</span></div>
      <Link to={`/recipes/${recipe.recipe_id}`} className="recipe-title"><h3>{recipe.title}</h3><ArrowUpRight size={18} /></Link>
      {recipe.author_name && <p className="recipe-author">By {recipe.author_name}</p>}
    </div>
  </article>;
}

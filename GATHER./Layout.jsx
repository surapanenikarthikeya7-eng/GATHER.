import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, CalendarDays, ChefHat, Heart, Menu, Plus, Shield, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Layout() {
  const { user, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const leave = async () => {
    try {
      await signOut();
      toast('You are signed out.');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      navigate('/');
      setOpen(false);
    }
  };
  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;
  const close = () => setOpen(false);
  return <div className="app-shell">
    <header className="site-header">
      <div className="nav-wrap">
        <Link to="/" className="brand" onClick={close}><span className="brand-mark"><ChefHat size={21} /></span>gather<span className="brand-dot">.</span></Link>
        <button className="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
        <nav className={`main-nav${open ? ' open' : ''}`}>
          <NavLink to="/" className={linkClass} onClick={close}>Home</NavLink>
          <NavLink to="/recipes" className={linkClass} onClick={close}><BookOpen size={16} /> Recipes</NavLink>
          {user && <NavLink to="/meal-planner" className={linkClass} onClick={close}><CalendarDays size={16} /> Meal planner</NavLink>}
          {user && <NavLink to="/favorites" className={linkClass} onClick={close}><Heart size={16} /> Favorites</NavLink>}
          {user && <NavLink to="/add-recipe" className={linkClass} onClick={close}><Plus size={16} /> Share a recipe</NavLink>}
          {user?.role === 'ADMIN' && <NavLink to="/admin" className={linkClass} onClick={close}><Shield size={16} /> Admin</NavLink>}
          {!user ? <div className="nav-auth"><Link to="/login" className="login-link" onClick={close}>Log in</Link><Link to="/register" className="button button-small" onClick={close}>Join the table <span>↗</span></Link></div> :
            <div className="nav-auth"><Link to="/profile" className="profile-chip" onClick={close}>{user.profile_image ? <img src={user.profile_image} alt="" /> : <UserRound size={16} />}<span>{user.name.split(' ')[0]}</span></Link><button className="text-button" onClick={leave}>Log out</button></div>}
        </nav>
      </div>
    </header>
    <main><Outlet /></main>
    <footer className="site-footer">
      <div className="footer-inner"><Link to="/" className="brand footer-brand"><span className="brand-mark"><ChefHat size={21} /></span>gather<span className="brand-dot">.</span></Link><p>Good food brings us together.</p><div className="footer-links"><Link to="/recipes">Recipes</Link><Link to="/meal-planner">Meal planner</Link><a href="mailto:hello@gather.example">Contact</a><a href="#privacy">Privacy</a><a href="#terms">Terms</a></div><small>© {new Date().getFullYear()} Gather Kitchen Community</small></div>
    </footer>
  </div>;
}

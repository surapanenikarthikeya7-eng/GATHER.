import { ChefHat } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AuthFrame({ eyebrow = 'GOOD FOOD STARTS AT THE TABLE', title, subtitle, children }) {
  return <section className="auth-page">
    <div className="auth-card">
      <Link to="/" className="brand auth-brand" aria-label="Gather home">
        <span className="brand-mark"><ChefHat size={21} /></span>gather<span className="brand-dot">.</span>
      </Link>
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
    <div className="auth-photo">
      <img src="https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=85" alt="Bright home kitchen ready for cooking" />
      <span>“A recipe has no soul.<br />You, as the cook, must bring soul to the recipe.”</span>
    </div>
  </section>;
}

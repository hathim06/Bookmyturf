import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const readFavoriteIds = () => {
  try {
    return JSON.parse(localStorage.getItem('favoriteTurfs') || '[]');
  } catch {
    return [];
  }
};

export default function TurfCard({ turf }) {
  const image = turf.image?.startsWith('/') ? `http://localhost:5000${turf.image}` : turf.image;
  const [favorite, setFavorite] = useState(() => readFavoriteIds().includes(turf.id));

  useEffect(() => {
    const syncFavorite = () => setFavorite(readFavoriteIds().includes(turf.id));
    syncFavorite();
    window.addEventListener('favoriteTurfsChanged', syncFavorite);
    window.addEventListener('storage', syncFavorite);
    return () => {
      window.removeEventListener('favoriteTurfsChanged', syncFavorite);
      window.removeEventListener('storage', syncFavorite);
    };
  }, [turf.id]);

  const toggleFavorite = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const currentIds = readFavoriteIds();
    const nextIds = favorite ? currentIds.filter((id) => id !== turf.id) : [...new Set([...currentIds, turf.id])];
    localStorage.setItem('favoriteTurfs', JSON.stringify(nextIds));
    window.dispatchEvent(new Event('favoriteTurfsChanged'));
    setFavorite(!favorite);
  };

  const badgeClass =
    turf.status === 'Available'
      ? 'turfCardBadge'
      : turf.status === 'Filling Fast'
      ? 'turfCardBadge filling'
      : 'turfCardBadge booked';

  return (
    <article className="turfCard">
      <div
        className="turfCardImg"
        style={{ backgroundImage: `url(${image})` }}
      >
        <span className={badgeClass}>{turf.status}</span>
        <button className={`favoriteButton ${favorite ? 'active' : ''}`} onClick={toggleFavorite} aria-label={favorite ? 'Remove favorite' : 'Add favorite'}>
          {favorite ? '♥' : '♡'}
        </button>
      </div>
      <div className="turfCardBody">
        <h3>{turf.name}</h3>
        <p className="turfCardLoc">{turf.area}</p>
        <span className="turfCardSport">{turf.sport}</span>
        <div className="turfCardFooter">
          <span className="turfCardRating">
            {turf.rating}
            <span>({turf.reviews})</span>
          </span>
          <span className="turfCardPrice">{turf.price}</span>
        </div>
        <Link className="turfCardBtn" to={`/turfs/${turf.id}`}>
          Book Now →
        </Link>
      </div>
    </article>
  );
}

// Kept for backward compat (TurfDetails uses it)
export function Photo({ src, large = false }) {
  return (
    <div
      className={'pic ' + (large ? 'large' : '')}
      style={{ backgroundImage: `url(${src})` }}
    />
  );
}

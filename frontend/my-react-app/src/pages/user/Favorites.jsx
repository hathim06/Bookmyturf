import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page } from '../../components/Layout';
import Pagination from '../../components/Pagination';
import TurfCard from '../../components/TurfCard';

const readFavorites = () => {
  try { return JSON.parse(localStorage.getItem('favoriteTurfs') || '[]'); } catch { return []; }
};

export default function Favorites() {
  const [favoriteIds, setFavoriteIds] = useState(readFavorites);
  const [favoriteTurfs, setFavoriteTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    const syncFavorites = async () => {
      const ids = readFavorites();
      setFavoriteIds(ids);
      if (!ids.length) {
        setFavoriteTurfs([]);
        setLoading(false);
        return;
      }

      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const response = await fetch(`http://localhost:5000/api/turfs/${id}`);
          const payload = await response.json();
          if (!response.ok || !payload?.data) throw new Error('Failed');
          return {
            id: payload.data._id,
            name: payload.data.name,
            image: payload.data.primaryImage || payload.data.images?.[0],
            area: `${payload.data.location.city}, ${payload.data.location.state || ''}`,
            sport: payload.data.sports?.[0] || 'Multi-sport',
            price: `₹${payload.data.pricePerHour}/hr`,
            rating: 'New',
            reviews: 0,
            status: 'Available',
          };
        })
      );

      const validTurfs = results
        .filter((result) => result.status === 'fulfilled' && result.value)
        .map((result) => result.value);

      setFavoriteTurfs(validTurfs);
      if (validTurfs.length !== ids.length) {
        const next = ids.filter((id) => validTurfs.some((turf) => turf.id === id));
        localStorage.setItem('favoriteTurfs', JSON.stringify(next));
        window.dispatchEvent(new Event('favoriteTurfsChanged'));
        setFavoriteIds(next);
      }
      setLoading(false);
    };

    syncFavorites();
  }, []);

  const removeFavorite = (id) => {
    const next = favoriteIds.filter((favoriteId) => favoriteId !== id);
    setFavoriteIds(next);
    setFavoriteTurfs((current) => current.filter((turf) => turf.id !== id));
    localStorage.setItem('favoriteTurfs', JSON.stringify(next));
    window.dispatchEvent(new Event('favoriteTurfsChanged'));
  };

  const totalPages = Math.max(1, Math.ceil(favoriteTurfs.length / pageSize));
  const paginatedFavorites = favoriteTurfs.slice((page - 1) * pageSize, page * pageSize);

  return <Page><main className="userWorkspace favoritesPage"><div className="workspaceHeading"><div><p className="pageKicker">YOUR COLLECTION</p><h1>Your Favorite Arenas</h1><span>Keep your preferred venues close for the next game.</span></div><Link className="outlineAction" to="/turfs">Explore turfs</Link></div>{loading ? <section className="emptyFavorites"><h2>Loading favorites...</h2></section> : favoriteTurfs.length ? <div className="favoritesLayout"><div className="favoriteGrid">{paginatedFavorites.map((turf) => <div className="favoriteItem" key={turf.id}><TurfCard turf={turf} /><div className="favoriteItemActions"><button className="removeFavorite" onClick={() => removeFavorite(turf.id)}>Remove</button></div></div>)}</div>{totalPages > 1 && <div className="favoritesPagination"><Pagination page={page} totalPages={totalPages} onChange={setPage} /></div>}</div> : <section className="emptyFavorites"><div className="emptyHeart">♡</div><h2>No favorites yet</h2><p>Save your favorite turfs and they will appear here.</p><Link className="primaryAction" to="/turfs">Explore Your Turfs</Link></section>}</main></Page>;
}

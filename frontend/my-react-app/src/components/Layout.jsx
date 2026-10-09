import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getAuthToken, getAuthUser, clearAuthSession } from '../utils/auth';
import { confirmAction } from '../utils/alert';
import Breadcrumbs from './Breadcrumbs';
import NotificationBell from './NotificationBell';

const getFavoriteCount = () => {
  try {
    const ids = JSON.parse(localStorage.getItem('favoriteTurfs') || '[]');
    return Array.isArray(ids) ? new Set(ids.map(String)).size : 0;
  } catch {
    return 0;
  }
};

export function Logo() {
  return (
    <Link className="logo" to="/">
      Turf<span>Book</span>
    </Link>
  );
}

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const token = getAuthToken();
  const user = getAuthUser();
  const [favoriteCount, setFavoriteCount] = useState(getFavoriteCount);

  useEffect(() => {
    const syncFavoriteCount = () => setFavoriteCount(getFavoriteCount());
    syncFavoriteCount();
    window.addEventListener('favoriteTurfsChanged', syncFavoriteCount);
    window.addEventListener('storage', syncFavoriteCount);
    return () => {
      window.removeEventListener('favoriteTurfsChanged', syncFavoriteCount);
      window.removeEventListener('storage', syncFavoriteCount);
    };
  }, []);

  const signOut = async () => {
    const confirmed = await confirmAction({
      title: 'Log out?',
      text: 'Are you sure you want to log out of your account?',
      icon: 'question',
      confirmButtonText: 'Yes, log out',
      danger: true,
    });
    if (confirmed) {
      clearAuthSession();
      navigate('/login', { replace: true });
    }
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <header>
      <Logo />
      <nav>
        <Link className={pathname === '/turfs' ? 'on' : ''} to="/turfs">
          Find Turfs
        </Link>
        <Link className={pathname === '/#how-it-works' ? 'on' : ''} to="/#how-it-works">
          How it Works
        </Link>

        {token && user ? (
          <>
            {user.role === 'user' && (
              <Link className={pathname === '/bookings' ? 'on' : ''} to="/bookings">
                My Bookings
              </Link>
            )}
            {user.role === 'user' && (
              <Link className={pathname === '/favorites' ? 'on favoriteNavLink' : 'favoriteNavLink'} to="/favorites" aria-label={`Favorites${favoriteCount ? `, ${favoriteCount} saved` : ''}`}>
                Favorites
                {favoriteCount > 0 && <span className="favoriteBadge" aria-hidden="true">{favoriteCount > 99 ? '99+' : favoriteCount}</span>}
              </Link>
            )}
            <Link className={pathname === '/support' ? 'on' : ''} to="/support">Support</Link>
            <NotificationBell />
            <Link className={pathname.includes('/profile') ? 'on' : ''} to={user.role === 'owner' ? '/owner/profile' : user.role === 'admin' ? '/admin/profile' : '/profile'}>
              Profile
            </Link>
            <div className="headerAvatar" title={user.name || 'Account'}>
              {initials}
            </div>
            <button className="userLogout" onClick={signOut}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link className="headerLoginBtn" to="/login">
              Log in
            </Link>
            <Link className="headerSignupBtn" to="/signup">
              Sign Up →
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="footerTop">
        <div className="footerBrand">
          <Logo />
          <p>
            Find and book the best sports grounds near you — football, cricket,
            tennis, basketball and more. Instant confirmation, zero hassle.
          </p>
        </div>
        <div className="footerCol">
          <h4>Explore</h4>
          <Link to="/">Home</Link>
          <Link to="/turfs">Find Turfs</Link>
          <Link to="/#how-it-works">How it Works</Link>
          <Link to="/signup">Sign Up</Link>
        </div>
        <div className="footerCol">
          <h4>Support</h4>
          <a href="#">Contact Us</a>
          <a href="#">FAQ</a>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
        </div>
        <div className="footerCol">
          <h4>For Owners</h4>
          <a href="#">List Your Ground</a>
          <a href="#">Owner Dashboard</a>
          <a href="#">Pricing</a>
          <a href="#">Partner with Us</a>
        </div>
      </div>
      <div className="footerBottom">
        <span>© 2024 TurfBook. All rights reserved.</span>
        <span>Play Hard, Book Easy.</span>
      </div>
    </footer>
  );
}

export function Page({ children }) {
  return (
    <main className="shell">
      <Header />
      <Breadcrumbs />
      {children}
      <Footer />
    </main>
  );
}

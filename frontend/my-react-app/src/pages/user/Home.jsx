import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';
import { images, categories, testimonials } from '../../data/turfs';
import { turfService } from '../../services/turfService';
import { getImageUrl } from '../../utils/imageUrl';


const steps = [
  {
    num: '1',
    title: 'Find a Ground',
    desc: 'Search by city, sport or date. Filter by price, amenities and availability.',
  },
  {
    num: '2',
    title: 'Book Your Slot',
    desc: 'Compare prices, pick an available time that suits your team and book instantly.',
  },
  {
    num: '3',
    title: 'Play Your Game',
    desc: 'Receive instant confirmation and show up ready to play. It\'s that simple.',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [searchLocation, setSearchLocation] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchSport, setSearchSport] = useState('');
  const [featured, setFeatured] = useState([]);
  const [areas, setAreas] = useState([]);
  useEffect(() => {
    turfService.list({ page: '1', limit: '50', sort: 'rating' })
      .then((data) => {
        const turfs = data.turfs || [];
        setAreas([...new Set(turfs.map((turf) => turf.location?.city).filter(Boolean))].sort((a, b) => a.localeCompare(b)));
        setFeatured(turfs.slice(0, 3).map((turf) => ({
          id: turf._id,
          name: turf.name,
          area: `${turf.location.city}, ${turf.location.state || ''}`,
          image: turf.primaryImage || turf.images?.[0] || images.hero,
          price: `₹${turf.pricePerHour}/hr`,
          rating: turf.averageRating ? turf.averageRating.toFixed(1) + ' ★' : 'New',
          reviews: turf.reviewCount || 0,
          sport: turf.sports?.[0] || 'Multi-sport',
          status: turf.status === 'Active' ? 'Available' : 'Booked',
        })));
      })
      .catch(() => {
        setFeatured([]);
      });
  }, []);

  return (
    <main className="shell">
      {/* ── HERO ── */}
      <section
        className="hero"
        style={{ backgroundImage: `url(${images.hero})` }}
      >
        <div className="heroOverlay" />
        <Header />
        <div className="heroBody">
          <span className="heroEyebrow">🏟 YOUR NEXT GAME STARTS HERE</span>
          <h1>
            Reserve Your Perfect<br />
            <span>Sports Ground</span> in Seconds
          </h1>
          <p>
            Find and book top-rated football, cricket, tennis &amp; multi-sport
            venues near you. Instant confirmation, transparent pricing.
          </p>

          {/* Search Bar */}
          <form className="heroSearch" onSubmit={(event) => {
            event.preventDefault();
            const params = new URLSearchParams();
            if (searchLocation) params.set('city', searchLocation);
            if (searchDate) params.set('date', searchDate);
            if (searchSport) params.set('sport', searchSport);
            navigate(`/turfs${params.size ? `?${params.toString()}` : ''}`);
          }}>
            <div className="heroSearchField">
              <label htmlFor="home-search-location">Location</label>
              <select id="home-search-location" value={searchLocation} onChange={(event) => setSearchLocation(event.target.value)}>
                <option value="">Select an area</option>
                {areas.map((area) => <option key={area} value={area}>{area}</option>)}
              </select>
            </div>
            <div className="heroSearchField">
              <label htmlFor="home-search-date">Date</label>
              <input id="home-search-date" type="date" value={searchDate} onChange={(event) => setSearchDate(event.target.value)} />
            </div>
            <div className="heroSearchField">
              <label htmlFor="home-search-sport">Sport</label>
              <select id="home-search-sport" value={searchSport} onChange={(event) => setSearchSport(event.target.value)}>
                <option value="">All sports</option>
                {['Football', 'Cricket', 'Tennis', 'Basketball', 'Badminton'].map((sport) => <option key={sport} value={sport}>{sport}</option>)}
              </select>
            </div>
            <button className="heroSearchBtn" type="submit">Search</button>
          </form>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="homeSection">
        <p className="sectionLabel">Browse by Sport</p>
        <h2 className="sectionTitle">Popular Ground Categories</h2>
        <div className="categoriesGrid">
          {categories.map((cat) => (
            <Link className="categoryCard" key={cat.label} to={`/categories/${cat.label.toLowerCase()}`}>
              <img src={cat.image} alt={cat.label} />
              <small>{cat.count} Grounds</small>
              <span>{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURED VENUES ── */}
      <section className="homeSection alt">
        <p className="sectionLabel">Don't Miss Out</p>
        <h2 className="sectionTitle">Featured Venues This Weekend</h2>
        <div className="venueGrid">
          {featured.map((turf) => (
            <Link className="venueCard" key={turf.id} to={`/turfs/${turf.id}`}>
              <div
                className="venueCardImg"
                style={{ backgroundImage: `url(${getImageUrl(turf.image)})` }}
              >
                <span
                  className={
                    'venueCardBadge' +
                    (turf.status === 'Filling Fast' ? ' filling' : '')
                  }
                >
                  {turf.status}
                </span>
              </div>
              <div className="venueCardBody">
                <h3>{turf.name}</h3>
                <p className="venueLocation">{turf.area}</p>
                <div className="venueCardMeta">
                  <span className="venueRating">
                    {turf.rating} <span>({turf.reviews} reviews)</span>
                  </span>
                  <span className="venueSport">{turf.sport}</span>
                  <span className="venuePrice">{turf.price}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="homeSection" id="how-it-works" style={{ textAlign: 'center' }}>
        <p className="sectionLabel">Simple Process</p>
        <h2 className="sectionTitle" style={{ margin: '0 auto 36px' }}>
          Book &amp; Play in 3 Steps
        </h2>
        <div className="stepsGrid">
          {steps.map((step) => (
            <div className="stepCard" key={step.num}>
              <div className="stepNum">{step.num}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="homeSection alt">
        <p className="sectionLabel">What Players Say</p>
        <h2 className="sectionTitle">Trusted By Local Playgroups</h2>
        <div className="testimonialsGrid">
          {testimonials.map((t) => (
            <div className="testimonialCard" key={t.name}>
              <p>{t.text}</p>
              <div className="testimonialAuthor">
                <div className="testimonialAvatar">{t.avatar}</div>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <div className="ctaBanner">
        <div className="ctaBannerText">
          <h2>Own a Turf? Join TurfBook Marketplace Today</h2>
          <p>
            List your ground, reach thousands of players and manage bookings
            effortlessly — all in one place.
          </p>
        </div>
        <Link className="ctaBannerBtn" to="/signup">
          List Your Ground →
        </Link>
      </div>

      <Footer />
    </main>
  );
}

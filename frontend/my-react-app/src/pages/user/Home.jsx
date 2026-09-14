import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../../components/Layout';
import Pagination from '../../components/Pagination';
import { images, categories, testimonials } from '../../data/turfs';

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
  const [featured, setFeatured] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });

  useEffect(() => {
    fetch(`http://localhost:5000/api/turfs?page=${page}&limit=5`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load turfs.')))
      .then(({ data, pagination: result }) => {
        setFeatured(data.map((turf) => ({
          id: turf._id,
          name: turf.name,
          area: `${turf.location.city}, ${turf.location.state || ''}`,
          image: turf.primaryImage || turf.images?.[0] || images.hero,
          price: `₹${turf.pricePerHour}/hr`,
          rating: 'New',
          reviews: 0,
          sport: turf.sports?.[0] || 'Multi-sport',
          status: turf.status === 'Active' ? 'Available' : 'Booked',
        })));
        setPagination(result || { totalPages: 1, totalItems: data.length });
      })
      .catch(() => {
        setFeatured([]);
        setPagination({ totalPages: 1, totalItems: 0 });
      });
  }, [page]);

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
          <div className="heroSearch">
            <div className="heroSearchField">
              <label>📍 Location</label>
              <span>Select City or Area</span>
            </div>
            <div className="heroSearchField">
              <label>📅 Date</label>
              <span>Pick a date</span>
            </div>
            <div className="heroSearchField">
              <label>⚽ Sport</label>
              <span>All Sports</span>
            </div>
            <Link className="heroSearchBtn" to="/turfs">
              🔍 Search
            </Link>
          </div>
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
                style={{ backgroundImage: `url(${turf.image.startsWith('/') ? `http://localhost:5000${turf.image}` : turf.image})` }}
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
        {pagination.totalPages > 1 && (
          <div className="homePagination">
            <Pagination page={page} totalPages={pagination.totalPages} onChange={setPage} />
          </div>
        )}
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

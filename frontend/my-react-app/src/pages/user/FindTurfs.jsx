import { useEffect, useState } from 'react';
import { Header, Footer } from '../../components/Layout';
import { useParams, useSearchParams } from 'react-router-dom';
import FilterPanel from '../../components/FilterPanel';
import Pagination from '../../components/Pagination';
import TurfCard from '../../components/TurfCard';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { turfService } from '../../services/turfService';

const PAGE_SIZE = 5;

// Compute the best offer label + discounted price for display
function computeOfferDisplay(turf) {
  const pricePerHour = turf.pricePerHour || 0;

  // Active offers from the dedicated offers collection (returned in turf list)
  if (turf.activeOffers?.length) {
    const best = turf.activeOffers[0];
    const discounted =
      best.discountType === 'percentage'
        ? pricePerHour - (pricePerHour * best.discountValue) / 100
        : pricePerHour - best.discountValue;
    return {
      offer: best.title,
      price: `₹${Math.max(0, Math.round(discounted))}/hr`,
      originalPrice: `₹${pricePerHour}/hr`,
    };
  }

  return { offer: null, price: `₹${pricePerHour}/hr`, originalPrice: null };
}

export default function FindTurfs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { category } = useParams();
  const categoryName = category ? category.charAt(0).toUpperCase() + category.slice(1) : '';
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || '');
  const [page, setPage] = useState(1);
  const [availableTurfs, setAvailableTurfs] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState({ sport: categoryName || searchParams.get('sport') || '', facility: '', minPrice: '', maxPrice: '' });
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setFilters((current) => ({ ...current, sport: categoryName || searchParams.get('sport') || '' }));
    setPage(1);
  }, [categoryName]);

  useEffect(() => {
    const query = { search: debouncedSearch, city, page: String(page), limit: String(PAGE_SIZE), sort };
    if (selectedDate) query.date = selectedDate;
    Object.entries(filters).forEach(([name, value]) => {
      if (value !== '') query[name] = value;
    });
    turfService.list(query)
      .then((data) => {
        setAvailableTurfs(data.turfs || data.data || []);
        setPagination(data.pagination || { totalPages: data.totalPages || 1, totalItems: (data.turfs || data.data || []).length });
      })
      .catch(() => { setAvailableTurfs([]); setPagination({ totalPages: 1, totalItems: 0 }); });
  }, [debouncedSearch, city, filters, page, selectedDate, sort]);

  const updateSearchDate = (value) => {
    setSelectedDate(value);
    setPage(1);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('date', value);
    else next.delete('date');
    setSearchParams(next, { replace: true });
  };

  return (
    <main className="shell findPage">
      <Header />

      {/* Dark page header */}
      <div className="findPageHeader">
        <h1>{categoryName ? `${categoryName} Grounds Near You` : 'Sports Grounds in Your Area'}</h1>
        <p>{categoryName ? `Discover and book ${categoryName.toLowerCase()} venues with available slots.` : 'Discover and book top-rated venues near you'}</p>
        <div className="findSearchBar">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by turf name, area or sport…"
          />
          <input aria-label="Filter by city or area" value={city} onChange={(event) => { setCity(event.target.value); setPage(1); }} placeholder="City or area" />
          <label className="findDateFilter">Availability date
            <input type="date" value={selectedDate} onChange={(event) => updateSearchDate(event.target.value)} />
          </label>
        </div>
      </div>

      {/* Filter + Cards */}
      <div className="findBody">
        <FilterPanel
          filters={filters}
          onChange={(next) => { setFilters(next); setPage(1); }}
          onClear={() => { setFilters({ sport: '', facility: '', minPrice: '', maxPrice: '' }); setPage(1); }}
        />

        <div className="cardsArea">
          <div className="cardsTopBar">
            <span>
              <strong>{pagination.totalItems}</strong> turf
              {pagination.totalItems !== 1 ? 's' : ''} found
            </span>
            <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
              <option value="newest">Sort: Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>

          <div className="cardsGrid">
            {availableTurfs.map((turf) => {
              const { offer, price, originalPrice } = computeOfferDisplay(turf);
              return (
                <TurfCard
                  key={turf._id}
                  turf={{
                    id: turf._id,
                    name: turf.name,
                    image: turf.primaryImage || turf.images?.[0],
                    area: `${turf.location.city}, ${turf.location.state || ''}`,
                    sport: turf.sports?.[0] || 'Multi-sport',
                    price,
                    originalPrice,
                    offer,
                    rating: turf.averageRating ? turf.averageRating.toFixed(1) + ' ★' : 'New',
                    reviews: turf.reviewCount || 0,
                    status: 'Available',
                    bookingDate: selectedDate,
                  }}
                />
              );
            })}
            {availableTurfs.length === 0 && (
              <p
                style={{
                  gridColumn: '1/-1',
                  color: 'var(--text-3)',
                  padding: '40px 0',
                  textAlign: 'center',
                }}
              >
                No turfs match your search.
              </p>
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagesRow">
              <Pagination page={page} totalPages={pagination.totalPages} onChange={setPage} />
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

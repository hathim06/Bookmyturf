import { useEffect, useState } from 'react';
import { Header, Footer } from '../../components/Layout';
import { useParams } from 'react-router-dom';
import FilterPanel from '../../components/FilterPanel';
import Pagination from '../../components/Pagination';
import TurfCard from '../../components/TurfCard';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const PAGE_SIZE = 5;

export default function FindTurfs() {
  const { category } = useParams();
  const categoryName = category ? category.charAt(0).toUpperCase() + category.slice(1) : '';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [availableTurfs, setAvailableTurfs] = useState([]);
  const [pagination, setPagination] = useState({ totalPages: 1, totalItems: 0 });
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState({ sport: categoryName, facility: '', minPrice: '', maxPrice: '' });
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setFilters((current) => ({ ...current, sport: categoryName }));
    setPage(1);
  }, [categoryName]);

  useEffect(() => {
    const params = new URLSearchParams({ search: debouncedSearch, page: String(page), limit: String(PAGE_SIZE), sort });
    Object.entries(filters).forEach(([name, value]) => {
      if (value !== '') params.set(name, value);
    });
    fetch(`http://localhost:5000/api/turfs?${params}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Unable to load turfs.')))
      .then(({ data, pagination: result }) => { setAvailableTurfs(data); setPagination(result); })
      .catch(() => { setAvailableTurfs([]); setPagination({ totalPages: 1, totalItems: 0 }); });
  }, [debouncedSearch, filters, page, sort]);

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
          
        </div>
      </div>

      {/* Filter + Cards */}
      <div className="findBody">
        <FilterPanel filters={filters} onChange={(next) => { setFilters(next); setPage(1); }} onClear={() => { setFilters({ sport: '', facility: '', minPrice: '', maxPrice: '' }); setPage(1); }} />

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
            {availableTurfs.map((turf) => (
              <TurfCard key={turf._id} turf={{ id: turf._id, name: turf.name, image: turf.primaryImage || turf.images?.[0], area: `${turf.location.city}, ${turf.location.state || ''}`, sport: turf.sports?.[0] || 'Multi-sport', price: `₹${turf.pricePerHour}/hr`, rating: 'New', reviews: 0, status: 'Available' }} />
            ))}
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

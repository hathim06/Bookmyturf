export default function FilterPanel({ filters, onChange, onClear }) {
  const update = (name, value) => onChange({ ...filters, [name]: value });

  return (
    <aside className="filterPanel">
      <div className="filterHeader">
        <h3>Filters</h3>
        <button onClick={onClear}>Clear All</button>
      </div>

      <div className="filterSection">
        <h4>Sport Type</h4>
        <label className="filterCheck">
          <input type="checkbox" checked={filters.sport === 'Football'} onChange={(event) => update('sport', event.target.checked ? 'Football' : '')} /> Football
        </label>
        <label className="filterCheck">
          <input type="checkbox" checked={filters.sport === 'Cricket'} onChange={(event) => update('sport', event.target.checked ? 'Cricket' : '')} /> Cricket
        </label>
        <label className="filterCheck">
          <input type="checkbox" checked={filters.sport === 'Tennis'} onChange={(event) => update('sport', event.target.checked ? 'Tennis' : '')} /> Tennis
        </label>
        <label className="filterCheck">
          <input type="checkbox" checked={filters.sport === 'Basketball'} onChange={(event) => update('sport', event.target.checked ? 'Basketball' : '')} /> Basketball
        </label>
        <label className="filterCheck">
          <input type="checkbox" checked={filters.sport === 'Badminton'} onChange={(event) => update('sport', event.target.checked ? 'Badminton' : '')} /> Badminton
        </label>
      </div>

      <div className="filterSection">
        <h4>Price Range (per hr)</h4>
        <div className="priceInputs">
          <label>
            Minimum price
            <input
              type="number"
              min="0"
              step="50"
              value={filters.minPrice}
              onChange={(event) => update('minPrice', event.target.value)}
              placeholder="₹0"
            />
          </label>
          <label>
            Maximum price
            <input
              type="number"
              min="0"
              step="50"
              value={filters.maxPrice}
              onChange={(event) => update('maxPrice', event.target.value)}
              placeholder="₹3000"
            />
          </label>
        </div>
      </div>

      <div className="filterSection">
        <h4>Amenities</h4>
        <label className="filterCheck">
          <input type="checkbox" checked={filters.facility === 'Floodlights'} onChange={(event) => update('facility', event.target.checked ? 'Floodlights' : '')} /> Floodlights
        </label>
        <label className="filterCheck">
          <input type="checkbox" checked={filters.facility === 'Parking'} onChange={(event) => update('facility', event.target.checked ? 'Parking' : '')} /> Parking
        </label>
        <label className="filterCheck">
          <input type="checkbox" checked={filters.facility === 'Changing Room'} onChange={(event) => update('facility', event.target.checked ? 'Changing Room' : '')} /> Changing Room
        </label>
        <label className="filterCheck">
          <input type="checkbox" checked={filters.facility === 'Drinking Water'} onChange={(event) => update('facility', event.target.checked ? 'Drinking Water' : '')} /> Drinking Water
        </label>
      </div>

      <div className="filterSection">
        <h4>Availability</h4>
        <label className="filterCheck">
          <input type="checkbox" checked readOnly /> Available Now
        </label>
        <label className="filterCheck">
          <input type="checkbox" /> This Weekend
        </label>
      </div>

      <button className="applyFiltersBtn" onClick={() => onChange(filters)}>Apply Filters</button>
    </aside>
  );
}

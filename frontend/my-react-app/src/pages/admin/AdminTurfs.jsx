import { useEffect, useState } from 'react';
import DashboardShell from '../../components/DashboardShell';
import Pagination from '../../components/Pagination';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { getAuthToken } from '../../utils/auth';
import { confirmAction } from '../../utils/alert';

const API_URL = 'http://localhost:5000/api/admin';

export default function AdminTurfs() {
  const [turfs, setTurfs] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [selectedTurf, setSelectedTurf] = useState(null);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams({ search: debouncedSearch, page: String(page), limit: '5' });
        const response = await fetch(`${API_URL}/turfs?${params}`, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Unable to load turfs.');
        setTurfs(data.turfs); setTotalPages(data.totalPages);
      } catch (requestError) { setError(requestError.message); }
    }
    load();
  }, [debouncedSearch, page]);

  async function toggleListing(turf) {
    try {
      const response = await fetch(`${API_URL}/turfs/${turf._id}/listing`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ isListed: !turf.isListed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update listing.');
      setTurfs((items) => items.map((item) => item._id === turf._id ? data.turf : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function setStatus(turf, status) {
    try {
      const response = await fetch(`${API_URL}/turfs/${turf._id}/status`, { method: 'PATCH', headers: { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to update status.');
      setTurfs((items) => items.map((item) => item._id === turf._id ? data.turf : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function deactivate(turf) {
    if (!await confirmAction({ title: 'Deactivate turf?', text: `${turf.name} will be hidden without deleting its history.`, icon: 'warning', confirmButtonText: 'Yes, deactivate', danger: true })) return;
    try {
      const response = await fetch(`${API_URL}/turfs/${turf._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getAuthToken()}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to deactivate turf.');
      setTurfs((items) => items.filter((item) => item._id !== turf._id));
    } catch (requestError) { setError(requestError.message); }
  }

  return <DashboardShell role="admin" title="Turf listings" subtitle="List or unlist venues across the platform"><section className="managementCard"><div className="panelTitle"><div><h2>All turfs</h2><p>Control which venues are visible to users</p></div></div><input className="managementSearch" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by turf name or city" />{error && <p className="authError">{error}</p>}{turfs.map((turf) => <div className="accountRow" key={turf._id}><span><b>{turf.name}</b><small>{turf.location.city}</small></span><span><small>Owner: {turf.owner?.name || 'Unknown'}</small><small>₹{turf.pricePerHour}/hour</small></span><span><em className={turf.status !== 'Active' ? 'blocked' : ''}>{turf.status}</em></span><span className="accountActions"><button onClick={() => setSelectedTurf(turf)}>View</button><button onClick={() => toggleListing(turf)}>{turf.isListed ? 'Unlist' : 'List'}</button><button onClick={() => setStatus(turf, turf.status === 'Blocked' ? 'Active' : 'Blocked')}>{turf.status === 'Blocked' ? 'Unblock' : 'Block'}</button><button className="deleteButton" onClick={() => deactivate(turf)}>Delete</button></span></div>)}{!turfs.length && <p className="managementEmpty">No turfs found.</p>}<Pagination page={page} totalPages={totalPages} onChange={setPage} /></section>{selectedTurf && <div className="detailsOverlay" onClick={() => setSelectedTurf(null)}><section className="detailsDialog" onClick={(event) => event.stopPropagation()}><div className="panelTitle"><h2>{selectedTurf.name}</h2><button onClick={() => setSelectedTurf(null)}>×</button></div><div className="adminTurfGallery">{(selectedTurf.images?.length ? selectedTurf.images : []).map((image) => <img key={image} src={image.startsWith('/') ? `http://localhost:5000${image}` : image} alt={selectedTurf.name} />)}</div><p>{selectedTurf.description || 'No description added.'}</p><p><b>Owner:</b> {selectedTurf.owner?.name || 'Unknown'} · <b>Location:</b> {selectedTurf.location.address}, {selectedTurf.location.city}</p><h3>Time slots</h3><div className="adminSlotList">{selectedTurf.slots?.length ? selectedTurf.slots.map((slot) => <span key={`${slot.startTime}-${slot.endTime}`}>{slot.startTime} - {slot.endTime} · ₹{slot.price}</span>) : <span>No slots configured</span>}</div></section></div>}</DashboardShell>;
}

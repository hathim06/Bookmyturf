import { useEffect, useState } from 'react';
import DashboardShell from '../../components/DashboardShell';
import Pagination from '../../components/Pagination';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { confirmAction } from '../../utils/alert';
import { adminService } from '../../services/adminService';
import { getImageUrl } from '../../utils/imageUrl';

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
        const data = await adminService.getTurfs({ search: debouncedSearch, page: String(page), limit: '5' });
        setTurfs(data.turfs); setTotalPages(data.totalPages);
      } catch (requestError) { setError(requestError.message); }
    }
    load();
  }, [debouncedSearch, page]);

  async function toggleListing(turf) {
    try {
      const data = await adminService.setTurfListing(turf._id, !turf.isListed);
      setTurfs((items) => items.map((item) => item._id === turf._id ? data.turf : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function setStatus(turf, status) {
    try {
      const data = await adminService.setTurfStatus(turf._id, status);
      setTurfs((items) => items.map((item) => item._id === turf._id ? data.turf : item));
    } catch (requestError) { setError(requestError.message); }
  }

  async function deactivate(turf) {
    if (!await confirmAction({ title: 'Deactivate turf?', text: `${turf.name} will be hidden without deleting its history.`, icon: 'warning', confirmButtonText: 'Yes, deactivate', danger: true })) return;
    try {
      await adminService.deleteTurf(turf._id);
      setTurfs((items) => items.filter((item) => item._id !== turf._id));
    } catch (requestError) { setError(requestError.message); }
  }

  return (
    <DashboardShell role="admin" title="Turf Listings" subtitle="Manage and moderate all venues on the platform">
      <section className="managementCard">
        <div className="panelTitle">
          <div>
            <h2>All Turfs</h2>
            <p>Control which venues are visible to users</p>
          </div>
        </div>
        <input className="managementSearch" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by turf name or city…" />
        {error && <p className="authError">{error}</p>}
        <div className="adminTurfTable">
          {turfs.length === 0 && <p className="managementEmpty">No turfs found.</p>}
          {turfs.map((turf) => (
            <article className="adminTurfRow" key={turf._id}>
              <div className="adminTurfThumb">
                {turf.primaryImage || turf.images?.[0]
                  ? <img src={getImageUrl(turf.primaryImage || turf.images[0])} alt={turf.name} />
                  : <div className="adminTurfThumbPlaceholder">🏟</div>}
              </div>
              <div className="adminTurfInfo">
                <strong>{turf.name}</strong>
                <span>{turf.location.city}</span>
                <span>Owner: {turf.owner?.name || 'Unknown'} · ₹{turf.pricePerHour}/hr</span>
              </div>
              <div className="adminTurfStatus">
                <em className={`statusPill ${turf.status === 'Active' ? 'confirmed' : 'cancelled'}`}>{turf.status}</em>
                <span className={`listingBadge ${turf.isListed ? 'listed' : ''}`}>{turf.isListed ? 'Listed' : 'Unlisted'}</span>
              </div>
              <div className="adminTurfActions">
                <button className="dashAction small" onClick={() => setSelectedTurf(turf)}>View</button>
                <button className="outlineDashAction small" onClick={() => toggleListing(turf)}>{turf.isListed ? 'Unlist' : 'List'}</button>
                <button className="outlineDashAction small" onClick={() => setStatus(turf, turf.status === 'Blocked' ? 'Active' : 'Blocked')}>{turf.status === 'Blocked' ? 'Unblock' : 'Block'}</button>
                <button className="deleteButton small" onClick={() => deactivate(turf)}>Delete</button>
              </div>
            </article>
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </section>

      {selectedTurf && (
        <div className="detailsOverlay" onClick={() => setSelectedTurf(null)}>
          <section className="turfDetailDialog" onClick={(event) => event.stopPropagation()}>
            <div className="turfDialogHeader">
              <div>
                <p className="pageKicker">TURF DETAILS</p>
                <h2>{selectedTurf.name}</h2>
                <p>{selectedTurf.location.address}, {selectedTurf.location.city}</p>
              </div>
              <button className="dialogClose" onClick={() => setSelectedTurf(null)}>✕</button>
            </div>
            {(selectedTurf.images?.length > 0) && (
              <div className="turfDialogGallery">
                {selectedTurf.images.slice(0, 3).map((image) => (
                  <img key={image} src={getImageUrl(image)} alt={selectedTurf.name} />
                ))}
              </div>
            )}
            <div className="turfDialogBody">
              <div className="turfDialogFacts">
                <div><small>OWNER</small><b>{selectedTurf.owner?.name || 'Unknown'}</b></div>
                <div><small>PRICE</small><b>₹{selectedTurf.pricePerHour}/hr</b></div>
                <div><small>STATUS</small><b>{selectedTurf.status}</b></div>
                <div><small>LISTED</small><b>{selectedTurf.isListed ? 'Yes' : 'No'}</b></div>
              </div>
              {selectedTurf.description && <p className="turfDialogDesc">{selectedTurf.description}</p>}
              <div className="turfDialogSection">
                <h4>Time Slots</h4>
                <div className="adminSlotList">
                  {selectedTurf.slots?.length
                    ? selectedTurf.slots.map((slot) => (
                        <span key={`${slot.startTime}-${slot.endTime}`} className="slotPill">
                          {slot.startTime} – {slot.endTime} · ₹{slot.price}
                        </span>
                      ))
                    : <span className="managementEmpty">No slots configured</span>}
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </DashboardShell>
  );
}

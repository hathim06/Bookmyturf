import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { images } from '../../data/turfs';

const DEFAULT_SLOTS = ['06:00 - 07:00', '07:00 - 08:00', '17:00 - 18:00', '18:00 - 19:00', '19:00 - 20:00', '21:00 - 22:00'];

export default function TurfDetails() {
  const { id } = useParams();
  const [turf, setTurf] = useState(null);
  const [activeSlot, setActiveSlot] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`http://localhost:5000/api/turfs/${id}`)
      .then((response) => response.ok ? response.json() : response.json().then((data) => Promise.reject(new Error(data.message))))
      .then(({ data }) => setTurf(data))
      .catch((requestError) => setError(requestError.message || 'Unable to load this turf.'));
  }, [id]);

  if (error) return <Page><div className="detailsPage"><p className="authError">{error}</p><Link to="/turfs">Back to turfs</Link></div></Page>;
  if (!turf) return <Page><div className="detailsPage"><p>Loading turf...</p></div></Page>;

  const gallery = (turf.images?.length ? turf.images : [images.arena, images.cricket]).map((image) => image.startsWith('/') ? `http://localhost:5000${image}` : image);
  const location = `${turf.location.address}, ${turf.location.city}${turf.location.state ? `, ${turf.location.state}` : ''}`;
  const slots = turf.slots?.length ? turf.slots.map((slot) => ({ label: `${slot.startTime} - ${slot.endTime}`, price: slot.price ?? turf.pricePerHour })) : DEFAULT_SLOTS.map((label) => ({ label, price: turf.pricePerHour }));

  return <Page>
    <div className="detailsPage">
      <div style={{ background: '#0f172a', padding: '0' }}><div className="detailsHeroGrid" style={{ margin: '0 auto', maxWidth: '1140px' }}><div className="detailsHeroMain"><img src={gallery[0]} alt={turf.name} /></div><div className="detailsHeroSide">{gallery.slice(1, 3).map((image) => <img key={image} src={image} alt="Turf view" />)}</div></div></div>
      <div className="detailsBody"><div className="detailsMain">
        <div className="detailsTitleCard"><h1>{turf.name}</h1><p className="detailsLocation">{location}</p><div className="detailsMeta"><span className="detailsRating">New <span>(No reviews yet)</span></span><span className="detailsSport">{turf.category || turf.turfType}</span></div></div>
        <div className="detailsCard"><h3>About this Turf</h3><p>{turf.description || 'A quality sports venue ready for your next game.'}</p><h4>Facilities</h4><div className="amenitiesGrid">{(turf.facilities || []).map((facility) => <span className="amenityBadge" key={facility}>✓ {facility}</span>)}</div></div>
        <div className="detailsCard"><h3>Venue information</h3><p>Open {turf.openingTime} - {turf.closingTime}</p><p>{turf.rules || 'Please follow venue instructions and leave the turf ready for the next players.'}</p><h4>Sports</h4><div className="amenitiesGrid">{(turf.sports || []).map((sport) => <span className="amenityBadge" key={sport}>{sport}</span>)}</div></div>
        <div className="detailsCard"><h3>Location</h3><p>{location}</p>{turf.location.latitude && turf.location.longitude && <iframe title="Turf location" width="100%" height="240" loading="lazy" src={`https://www.google.com/maps?q=${turf.location.latitude},${turf.location.longitude}&z=15&output=embed`} />}</div>
      </div><aside className="bookingWidget"><h2>Book a Slot</h2><p className="bookingWidgetSub">{turf.name}</p><div className="bookingWidgetPrice">Select a slot<span> to see price</span></div><div className="widgetSection"><h4>Available Slots</h4><div className="slotsGrid">{slots.map((slot) => <button key={slot.label} className={activeSlot?.label === slot.label ? 'slotBtn active' : 'slotBtn'} onClick={() => setActiveSlot(slot)}>{slot.label}<small>₹{slot.price}</small></button>)}</div></div><div className="bookingTotal"><span>Total {activeSlot ? '(1 Slot)' : ''}</span><strong>{activeSlot ? `₹${activeSlot.price}` : '—'}</strong></div><Link className="bookNowBtn" to={activeSlot ? `/checkout?turf=${turf._id}&slot=${encodeURIComponent(activeSlot.label)}` : '#'} onClick={(event) => { if (!activeSlot) event.preventDefault(); }}>Proceed to Book →</Link></aside></div>
    </div>
  </Page>;
}

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { getAuthToken, getAuthUser } from '../../utils/auth';

const RAZORPAY_KEY_ID = 'rzp_test_TaceAtw6quWlFr';

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [turf, setTurf] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const slot = params.get('slot') || '';
  const user = getAuthUser() || {};
  const [startTime, endTime] = slot.split(' - ');

  useEffect(() => {
    const id = params.get('turf');
    if (!id) return;
    fetch(`http://localhost:5000/api/turfs/${id}`).then((response) => response.json().then((data) => response.ok ? data : Promise.reject(new Error(data.message)))).then(({ data }) => setTurf(data)).catch((requestError) => setError(requestError.message || 'Unable to load turf.'));
  }, [params]);

  async function confirmBooking() {
    if (!turf || !startTime || !endTime) return setError('Choose an available slot first.');
    setSaving(true);
    setError('');

    try {
      const bookingData = { turf: turf._id, date, startTime, endTime, sport: turf.sports?.[0] || 'Multi-sport' };

      if (paymentMethod === 'cod') {
        const response = await fetch('http://localhost:5000/api/users/bookings', {
          method: 'POST',
          headers: { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Booking failed.');
        navigate(`/payment/success?venue=${encodeURIComponent(turf.name)}&amount=${encodeURIComponent(String(Number(turf.pricePerHour || 0)))}`, { replace: true });
        return;
      }

      const orderResponse = await fetch('http://localhost:5000/api/users/payments/create-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ turfId: turf._id, amount: Number(turf.pricePerHour || 0), bookingData }),
      });
      const orderPayload = await orderResponse.json();
      if (!orderResponse.ok || !orderPayload.success) throw new Error(orderPayload.message || 'Unable to prepare payment.');

      const { order } = orderPayload;
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Razorpay checkout failed to load.'));
          document.body.appendChild(script);
        });
      }

      const razorpay = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'TurfBook',
        description: `Booking for ${turf.name}`,
        order_id: order.id,
        handler: async function (paymentResponse) {
          const verifyResponse = await fetch('http://localhost:5000/api/users/payments/verify', {
            method: 'POST',
            headers: { Authorization: `Bearer ${getAuthToken()}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
              bookingData,
            }),
          });

          const verifyPayload = await verifyResponse.json();
          if (!verifyResponse.ok || !verifyPayload.success) {
            throw new Error(verifyPayload.message || 'Payment verification failed.');
          }

          navigate(`/payment/success?venue=${encodeURIComponent(turf.name)}&amount=${encodeURIComponent(String(Number(turf.pricePerHour || 0)))}`, { replace: true });
        },
        prefill: {
          name: user.name || 'Guest User',
          email: user.email || '',
        },
        theme: { color: '#16a34a' },
        modal: {
          ondismiss: () => {
            setError('Payment was cancelled.');
            setSaving(false);
          },
        },
      });

      razorpay.open();
    } catch (requestError) {
      setError(requestError.message || 'Payment failed.');
    } finally {
      setSaving(false);
    }
  }

  return <Page><div className="checkoutPage"><div className="checkoutHeader"><Link to={`/turfs/${params.get('turf')}`}>← Back to Details</Link><h1>Secure Checkout</h1></div>{(error || !params.get('turf')) && <p className="authError">{error || 'Choose a turf before checkout.'}</p>}{turf && <div className="checkoutBody"><div><div className="checkoutCard"><h2>Billing Information</h2><p>{user.name || 'Signed-in user'}</p><p>{user.email || ''}</p></div><div className="checkoutCard"><h2>Booking details</h2><label>Date<input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setDate(event.target.value)} /></label><p>Time: {slot}</p><p>Sport: {turf.sports?.[0] || 'Multi-sport'}</p></div><div className="checkoutCard"><h2>Payment method</h2><div className="paymentMethods"><button type="button" className={`paymentMethod ${paymentMethod === 'cod' ? 'selected' : ''}`} onClick={() => setPaymentMethod('cod')}><span className="paymentMethodIcon">💵</span> Cash on Delivery</button><button type="button" className={`paymentMethod ${paymentMethod === 'razorpay' ? 'selected' : ''}`} onClick={() => setPaymentMethod('razorpay')}><span className="paymentMethodIcon">💳</span> Razorpay</button></div></div></div><aside className="orderSummary"><h2>Order Summary</h2><div className="orderVenueInfo"><h3>{turf.name}</h3><p>{turf.location.address}, {turf.location.city}</p></div><div className="orderPriceRow total"><span>Total Amount</span><span>₹{turf.pricePerHour}</span></div><button className="confirmPayBtn" onClick={confirmBooking} disabled={saving}>{saving ? 'Processing...' : paymentMethod === 'cod' ? 'Confirm Booking →' : 'Pay with Razorpay →'}</button></aside></div>}</div></Page>;
}

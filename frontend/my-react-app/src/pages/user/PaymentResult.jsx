import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '../../components/Layout';
import { images } from '../../data/turfs';

export default function PaymentResult({ success }) {
  const [params] = useSearchParams();
  const failed = !success;
  const venue = params.get('venue') || 'Agra Arena & Multi-Sport Complex';
  const amount = params.get('amount') || '2,882';
  return <Page><main className="paymentResultPage"><section className={`paymentResultCard ${failed ? 'failure' : 'success'}`}><div className="resultIcon">{failed ? '×' : '✓'}</div><p className="pageKicker">{failed ? 'PAYMENT NOT COMPLETED' : 'PAYMENT SUCCESSFUL'}</p><h1>{failed ? 'Payment Failed' : 'Booking Confirmed!'}</h1><p className="resultLead">{failed ? 'We could not complete your payment. Your booking has not been created.' : 'Your turf is reserved. We have sent the confirmation details to your email.'}</p>{!failed && <div className="resultBooking"><img src={images.arena} alt={venue} /><div><b>{venue}</b><span>Football · Sep 15, 2026</span><span>18:00 - 20:00 · ₹{amount}</span></div></div>}{failed && <div className="failureNotice">Your bank declined the transaction. No money has been charged to your account.</div>}<div className="resultActions">{failed ? <><button className="primaryAction">Retry Payment</button><Link className="outlineAction" to="/bookings">Change Payment Method</Link></> : <><Link className="primaryAction" to="/bookings">View Booking</Link><Link className="outlineAction" to="/turfs">Book Another</Link></>}</div></section><p className={`resultBanner ${failed ? 'failure' : ''}`}>{failed ? 'Need help? Contact support and include your payment reference.' : 'A confirmation email has been sent. You can also find this booking in My Bookings.'}</p></main></Page>;
}

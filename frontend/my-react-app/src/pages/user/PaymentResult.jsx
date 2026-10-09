import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '../../components/Layout';

export default function PaymentResult({ success }) {
  const [params] = useSearchParams();
  const failed = !success;
  const venue = params.get('venue') || 'Your Turf';
  const amount = params.get('amount') || '0';
  const bookingId = params.get('bookingId');
  const failureMessage = params.get('message') || 'Payment was not completed.';

  return (
    <Page>
      <main className="paymentResultPage">
        <div className={`paymentResultCard ${failed ? 'failure' : 'success'}`}>
          
          {/* Icon */}
          <div className={`resultIconWrap ${failed ? 'fail' : 'ok'}`}>
            <div className="resultIcon">
              {failed ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              )}
            </div>
          </div>

          {/* Status */}
          <p className="pageKicker" style={{ textAlign: 'center' }}>
            {failed ? 'PAYMENT NOT COMPLETED' : 'BOOKING CONFIRMED'}
          </p>
          <h1 className="resultTitle">
            {failed ? 'Payment Failed' : 'You\'re all set!'}
          </h1>
          <p className="resultLead">
            {failed
              ? failureMessage
              : `Your slot at ${venue} has been successfully reserved.`}
          </p>

          {/* Booking Summary (success only) */}
          {!failed && (
            <div className="resultBookingSummary">
              <div className="resultBookingRow">
                <span>Venue</span>
                <strong>{venue}</strong>
              </div>
              <div className="resultBookingRow">
                <span>Amount Paid</span>
                <strong>₹{amount}</strong>
              </div>
              <div className="resultBookingRow">
                <span>Status</span>
                <strong className="statusGreen">Confirmed ✓</strong>
              </div>
            </div>
          )}

          {/* Failure notice */}
          {failed && (
            <div className="failureNotice">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {bookingId
                ? 'Your booking is saved as payment pending for up to four hours. Retry is available only while this slot remains free.'
                : 'No booking was created. Please choose an available slot and try again.'}
            </div>
          )}

          {/* Actions */}
          <div className="resultActions">
            {failed ? (
              <>
                {bookingId
                  ? <Link className="primaryAction" to={`/bookings?retry=${encodeURIComponent(bookingId)}`}>Retry Payment</Link>
                  : <Link className="primaryAction" to="/turfs">Choose another slot</Link>}
                <Link className="outlineAction" to="/bookings">My Bookings</Link>
              </>
            ) : (
              <>
                <Link className="primaryAction" to="/bookings">View My Booking</Link>
                <Link className="outlineAction" to="/turfs">Book Another Turf</Link>
              </>
            )}
          </div>

          {/* Footer note */}
          <p className="resultFootNote">
            {failed
              ? 'Need help? Contact our support team with your payment reference.'
              : 'A confirmation has been sent to your email. You can find this in My Bookings.'}
          </p>
        </div>
      </main>
    </Page>
  );
}

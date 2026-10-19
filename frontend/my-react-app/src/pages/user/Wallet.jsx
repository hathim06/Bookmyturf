import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Page } from "../../components/Layout";
import Pagination from "../../components/Pagination";
import { userService } from "../../services/userService";

const PAGE_SIZE = 5;
const formatAmount = (amount) =>
  `₹${Number(amount || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function Wallet() {
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    userService.getWallet()
      .then((data) => {
        if (active) setWallet(data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Unable to load wallet.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const transactions = wallet.transactions || [];
  const totalPages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const visibleTransactions = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Page>
      <main className="userWorkspace walletPage">
        <div className="workspaceHeading">
          <div>
            <p className="pageKicker">ACCOUNT</p>
            <h1>My Wallet</h1>
            <p>Refunds from eligible online booking cancellations are added here.</p>
          </div>
          <Link className="outlineAction" to="/bookings">View bookings</Link>
        </div>

        {error && <p className="authError" role="alert">{error}</p>}

        <section className="walletBalanceCard" aria-label="Wallet balance">
          <div>
            <span>Available wallet balance</span>
            <strong>{loading ? "Loading…" : formatAmount(wallet.balance)}</strong>
          </div>
          <span className="walletBalanceIcon" aria-hidden="true">₹</span>
        </section>

        <section className="walletHistoryCard">
          <div className="walletHistoryHeading">
            <div>
              <h2>Wallet activity</h2>
              <p>Credits and refunds added to your wallet.</p>
            </div>
            <span>{transactions.length} transaction{transactions.length === 1 ? "" : "s"}</span>
          </div>

          {loading ? (
            <p className="walletEmpty">Loading wallet activity…</p>
          ) : transactions.length === 0 ? (
            <div className="walletEmpty">
              <span aria-hidden="true">↗</span>
              <h3>No wallet activity yet</h3>
              <p>Refunds for eligible cancelled online bookings will appear here.</p>
            </div>
          ) : (
            <div className="walletTransactions">
              {visibleTransactions.map((transaction) => (
                <article className="walletTransaction" key={transaction._id}>
                  <span className="walletTransactionIcon" aria-hidden="true">{transaction.type === "credit" ? "↙" : "↗"}</span>
                  <div className="walletTransactionInfo">
                    <strong>{transaction.reason === "booking_refund" ? "Booking refund" : transaction.description || "Wallet transaction"}</strong>
                    <small>{transaction.description || "Wallet activity"}</small>
                    <time dateTime={transaction.createdAt}>{new Date(transaction.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</time>
                  </div>
                  <strong className={transaction.type === "credit" ? "walletCredit" : "walletDebit"}>
                    {transaction.type === "credit" ? "+" : "−"}{formatAmount(transaction.amount)}
                  </strong>
                </article>
              ))}
            </div>
          )}
          {!loading && totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          )}
        </section>
      </main>
    </Page>
  );
}

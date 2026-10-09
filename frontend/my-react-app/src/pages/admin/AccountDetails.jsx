import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import DashboardShell from "../../components/DashboardShell";
import Pagination from "../../components/Pagination";
import { adminService } from "../../services/adminService";


const PAGE_SIZE = 5;

export default function AccountDetails({ role }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const data = await adminService.getUserById(id);
        if (data.user.role !== role)
          throw new Error("This account does not match this management page.");
        setDetails(data);
      } catch (requestError) {
        setError(requestError.message);
      }
    }
    load();
  }, [id, role]);

  const label = role === "owner" ? "Owner" : "User";
  const items = details
    ? role === "owner"
      ? details.turfs
      : details.bookings
    : [];
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const visibleItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <DashboardShell
      role="admin"
      title={`${label} details`}
      subtitle="Account information and activity"
    >
      <section className="accountDetailsPage">
        <button className="back" data-confirmation-skip="true" onClick={() => navigate(`/admin/${role}s`)}>
          ← Back to {role}s
        </button>
        {error && <p className="authError">{error}</p>}
        {!details && !error ? (
          <p>Loading details...</p>
        ) : (
          details && (
            <>
              <section className="detailProfile">
                <div className="detailAvatar">{details.user.name[0]}</div>
                <div>
                  <h2>{details.user.name}</h2>
                  <p>
                    {details.user.email} · {details.user.phone}
                  </p>
                  <em className={details.user.isBlocked ? "blocked" : ""}>
                    {details.user.isBlocked ? "Blocked" : "Active"}
                  </em>
                </div>
                <dl>
                  <div>
                    <dt>Role</dt>
                    <dd>{details.user.role}</dd>
                  </div>
                  <div>
                    <dt>Joined</dt>
                    <dd>
                      {new Date(details.user.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="detailContent">
                <h2>
                  {role === "owner"
                    ? `Turfs (${details.turfs.length})`
                    : `Bookings (${details.bookings.length})`}
                </h2>
                {!items.length ? (
                  <p>
                    {role === "owner"
                      ? "No turfs have been added by this owner."
                      : "No bookings found for this user."}
                  </p>
                ) : (
                  <>
                    {visibleItems.map((item) =>
                      role === "owner" ? (
                        <article className="adminDetailItem" key={item._id}>
                          <h3>{item.name}</h3>
                          <p>{item.description || "No description added."}</p>
                          <div>
                            <b>Location</b>
                            <span>
                              {item.location.address}, {item.location.city}
                              {item.location.state
                                ? `, ${item.location.state}`
                                : ""}{" "}
                              {item.location.pincode}
                            </span>
                          </div>
                          <div>
                            <b>Sports</b>
                            <span>{item.sports.join(", ") || "Not added"}</span>
                          </div>
                          <div>
                            <b>Price</b>
                            <span>₹{item.pricePerHour}/hour</span>
                          </div>
                        </article>
                      ) : (
                        <article className="adminDetailItem" key={item._id}>
                          <h3>{item.turf?.name || "Deleted turf"}</h3>
                          <div>
                            <b>Place</b>
                            <span>
                              {item.turf
                                ? `${item.turf.location.address}, ${item.turf.location.city}`
                                : "Turf is unavailable"}
                            </span>
                          </div>
                          <div>
                            <b>Slot</b>
                            <span>
                              {new Date(item.date).toLocaleDateString()} ·{" "}
                              {item.startTime} - {item.endTime}
                            </span>
                          </div>
                          <div>
                            <b>Status</b>
                            <span>{item.status}</span>
                          </div>
                          <div>
                            <b>Amount</b>
                            <span>₹{item.amount}</span>
                          </div>
                        </article>
                      ),
                    )}
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onChange={setPage}
                    />
                  </>
                )}
              </section>
            </>
          )
        )}
      </section>
    </DashboardShell>
  );
}



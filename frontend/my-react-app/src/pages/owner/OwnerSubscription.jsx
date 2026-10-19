import { useEffect, useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import { subscriptionService } from "../../services/subscriptionService";
import { getAuthUser } from "../../utils/auth";
import Swal from "sweetalert2";
import { useOwnerSubscription } from "../../contexts/ownerSubscriptionContext";

const PLAN_ICONS = { monthly: "👑" };
const PLAN_COLORS = { monthly: "#f59e0b" };

export default function OwnerSubscription() {
  const { refreshSubscriptionAccess } = useOwnerSubscription();
  const [plans, setPlans] = useState({});
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState("");
  const [tab, setTab] = useState("plans"); // plans | history
  const user = getAuthUser() || {};

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [p, a, h] = await Promise.all([
        subscriptionService.getPlans(),
        subscriptionService.getMySubscription(),
        subscriptionService.getMyHistory(),
      ]);
      setPlans(p);
      setActive(a);
      setHistory(h);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (planKey) => {
    const plan = plans[planKey];
    const result = await Swal.fire({
      title: `Subscribe to ${plan.name}?`,
      html: `<p style="color:#94a3b8">You'll be charged <strong style="color:#f59e0b">₹${plan.amount}/month</strong>.</p>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Pay with Razorpay",
      cancelButtonText: "Cancel",
      background: "#1e293b",
      color: "#f1f5f9",
      confirmButtonColor: PLAN_COLORS[planKey],
    });
    if (!result.isConfirmed) return;
    
    setSubscribing(planKey);
    try {
      const res = await loadRazorpay();
      if (!res) throw new Error("Razorpay SDK failed to load");

      const orderPayload = await subscriptionService.createOrder({ plan: planKey });
      if (!orderPayload.success) throw new Error(orderPayload.message || "Failed to create order");
      
      const { order, key } = orderPayload;

      const options = {
        key,
        amount: order.amount,
        currency: order.currency,
        name: "BookMyTurf",
        description: `Subscription - ${plan.name}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            const verifyPayload = await subscriptionService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyPayload.success) {
              await Swal.fire({
                title: "Subscribed! 🎉",
                text: "Your subscription is now active.",
                icon: "success",
                background: "#1e293b",
                color: "#f1f5f9",
                confirmButtonColor: PLAN_COLORS[planKey],
              });
              await Promise.all([fetchAll(), refreshSubscriptionAccess()]);
            } else {
              throw new Error(verifyPayload.message || "Verification failed");
            }
          } catch (err) {
            Swal.fire({ title: "Error", text: err.message, icon: "error", background: "#1e293b", color: "#f1f5f9" });
          }
        },
        prefill: {
          name: user.name || "Owner",
          email: user.email || "",
          contact: user.phone || ""
        },
        theme: { color: PLAN_COLORS[planKey] },
        modal: {
          ondismiss: () => {
             Swal.fire({ title: "Cancelled", text: "Payment was cancelled.", icon: "info", background: "#1e293b", color: "#f1f5f9" });
             setSubscribing("");
          }
        }
      };
      
      const rzp1 = new window.Razorpay(options);
      rzp1.open();

    } catch (err) {
      Swal.fire({ title: "Error", text: err.message, icon: "error", background: "#1e293b", color: "#f1f5f9" });
    } finally {
      setSubscribing("");
    }
  };

  const handleCancel = async () => {
    if (!active) return;
    const result = await Swal.fire({
      title: "Cancel Subscription?",
      text: "Your subscription will be cancelled immediately.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, cancel it",
      cancelButtonText: "Keep it",
      background: "#1e293b",
      color: "#f1f5f9",
      confirmButtonColor: "#ef4444",
    });
    if (!result.isConfirmed) return;
    try {
      await subscriptionService.cancelSubscription(active._id);
      Swal.fire({ title: "Cancelled", text: "Subscription cancelled successfully.", icon: "success", background: "#1e293b", color: "#f1f5f9" });
      fetchAll();
    } catch (err) {
      Swal.fire({ title: "Error", text: err.message, icon: "error", background: "#1e293b", color: "#f1f5f9" });
    }
  };

  const daysLeft = active
    ? Math.max(0, Math.ceil((new Date(active.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  const statusBadge = (status) => {
    const map = { active: "#22c55e", expired: "#ef4444", cancelled: "#94a3b8", pending: "#f59e0b" };
    return (
      <span style={{ background: `${map[status]}22`, color: map[status], padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: "uppercase" }}>
        {status}
      </span>
    );
  };

  return (
    <DashboardShell role="owner" title="Subscription" subtitle="Manage your monthly subscription plan">
      <div className="sub-wrap">
        {/* Active subscription banner */}
        {active && (
          <div className="sub-active-banner" style={{ borderColor: PLAN_COLORS[active.plan] }}>
            <div>
              <span className="sub-active-icon">{PLAN_ICONS[active.plan]}</span>
              <div>
                <h3>{plans[active.plan]?.name || active.plan} Plan — Active</h3>
                <p style={{ color: "#94a3b8", fontSize: 14 }}>
                  Expires <strong style={{ color: "#f1f5f9" }}>{new Date(active.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>
                  &nbsp;· <strong style={{ color: daysLeft < 5 ? "#ef4444" : "#22c55e" }}>{daysLeft} days left</strong>
                </p>
              </div>
            </div>
            <button className="sub-cancel-btn" onClick={handleCancel}>Cancel Plan</button>
          </div>
        )}

        {/* Tabs */}
        <div className="sub-tabs">
          <button className={tab === "plans" ? "sub-tab-active" : ""} onClick={() => setTab("plans")}>📦 Plans</button>
          <button className={tab === "history" ? "sub-tab-active" : ""} onClick={() => setTab("history")}>🕓 History</button>
        </div>

        {loading ? (
          <div className="sub-loading">
            <div className="sub-spinner" />
            <p>Loading subscription data…</p>
          </div>
        ) : tab === "plans" ? (
          <div className="sub-plans-grid">
            {Object.entries(plans).map(([key, plan]) => {
              const isActive = active?.plan === key && active?.status === "active";
              const color = PLAN_COLORS[key] || "#6366f1";
              return (
                <div key={key} className={`sub-plan-card ${isActive ? "sub-plan-current" : ""}`} style={{ "--plan-color": color }}>
                  <div className="sub-plan-header" style={{ background: `linear-gradient(135deg,${color}33,${color}11)` }}>
                    <span className="sub-plan-icon">{PLAN_ICONS[key] || "📦"}</span>
                    <h3>{plan.name}</h3>
                    {isActive && <span className="sub-current-badge">Current Plan</span>}
                  </div>
                  <div className="sub-plan-price">
                    <span className="sub-price-amount">₹{plan.amount}</span>
                    <span className="sub-price-period">/month</span>
                  </div>
                  <p className="sub-plan-desc">{plan.description}</p>
                  <ul className="sub-features">
                    <li><span className="sub-feat-check">✓</span> Up to <strong>{plan.maxTurfs}</strong> turf{plan.maxTurfs > 1 ? "s" : ""}</li>
                    <li className={plan.analyticsAccess ? "" : "sub-feat-disabled"}><span>{plan.analyticsAccess ? "✓" : "✗"}</span> Analytics Access</li>
                    <li className={plan.prioritySupport ? "" : "sub-feat-disabled"}><span>{plan.prioritySupport ? "✓" : "✗"}</span> Priority Support</li>
                    <li className={plan.customBranding ? "" : "sub-feat-disabled"}><span>{plan.customBranding ? "✓" : "✗"}</span> Custom Branding</li>
                  </ul>
                  <button
                    className="sub-subscribe-btn"
                    style={{ background: isActive ? "#1e293b" : color, border: `2px solid ${color}`, color: isActive ? color : "#fff" }}
                    onClick={() => !isActive && handleSubscribe(key)}
                    disabled={isActive || subscribing === key}
                  >
                    {subscribing === key ? "Processing…" : isActive ? "✓ Current Plan" : `Subscribe — ₹${plan.amount}/mo`}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="sub-history">
            <h3 style={{ color: "#f1f5f9", marginBottom: 16 }}>Subscription History</h3>
            {history.length === 0 ? (
              <div className="sub-empty"><span>📋</span><p>No subscription history found.</p></div>
            ) : (
              <table className="sub-history-table">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s._id}>
                      <td>
                        <span style={{ marginRight: 6 }}>{PLAN_ICONS[s.plan] || "📦"}</span>
                        <strong style={{ color: PLAN_COLORS[s.plan] || "#6366f1", textTransform: "capitalize" }}>{s.plan}</strong>
                      </td>
                      <td>₹{s.amount}</td>
                      <td>{new Date(s.startDate).toLocaleDateString("en-IN")}</td>
                      <td>{new Date(s.endDate).toLocaleDateString("en-IN")}</td>
                      <td>{statusBadge(s.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

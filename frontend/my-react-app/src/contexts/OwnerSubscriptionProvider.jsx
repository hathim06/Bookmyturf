import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { subscriptionService } from "../services/subscriptionService";
import { OwnerSubscriptionContext } from "./ownerSubscriptionContext";

export default function OwnerSubscriptionProvider({ children }) {
  const navigate = useNavigate();
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promptOpen, setPromptOpen] = useState(false);

  const refreshSubscriptionAccess = useCallback(async () => {
    try {
      const result = await subscriptionService.getMySubscriptionAccess();
      setAccess(result);
    } catch {
      setAccess({ state: "required", canCreate: false, subscription: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(refreshSubscriptionAccess, 0);
    const timer = window.setInterval(refreshSubscriptionAccess, 60000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [refreshSubscriptionAccess]);

  const requireSubscription = useCallback(() => {
    if (access?.canCreate) return true;
    setPromptOpen(true);
    return false;
  }, [access]);

  const contextValue = useMemo(() => ({
    access,
    loading,
    requireSubscription,
    refreshSubscriptionAccess,
  }), [access, loading, requireSubscription, refreshSubscriptionAccess]);

  return (
    <OwnerSubscriptionContext.Provider value={contextValue}>
      {children}
      {promptOpen && (
        <div className="ownerSubscriptionModalBackdrop" role="presentation" onClick={() => setPromptOpen(false)}>
          <section className="ownerSubscriptionModal" role="dialog" aria-modal="true" aria-labelledby="owner-subscription-title" onClick={(event) => event.stopPropagation()}>
            <button className="ownerSubscriptionModalClose" type="button" aria-label="Close" onClick={() => setPromptOpen(false)}>×</button>
            <span className="ownerSubscriptionModalIcon">✦</span>
            <h2 id="owner-subscription-title">Subscribe to continue</h2>
            <p>You need a subscription to create a turf, offer, or category. Choose a plan to unlock owner tools.</p>
            <button className="ownerSubscriptionModalAction" type="button" onClick={() => { setPromptOpen(false); navigate("/owner/subscription"); }}>View subscription plans</button>
            <button className="ownerSubscriptionModalDismiss" type="button" onClick={() => setPromptOpen(false)}>Maybe later</button>
          </section>
        </div>
      )}
    </OwnerSubscriptionContext.Provider>
  );
}

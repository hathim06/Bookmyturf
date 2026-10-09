import { useEffect, useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import { ownerTurfService } from "../../services/ownerTurfService";
import { confirmAction } from "../../utils/alert";
import { getImageUrl } from "../../utils/imageUrl";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const emptyForm = {
  turfId: "",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  offerDate: "",
};

export default function OwnerOffers() {
  const [turfs, setTurfs] = useState([]);
  const [offers, setOffers] = useState([]);
  const [selectedTurfId, setSelectedTurfId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    ownerTurfService.list({ limit: 50 }).then((data) => {
      const ownTurfs = data.turfs || [];
      setTurfs(ownTurfs);
      setSelectedTurfId((current) => current || ownTurfs[0]?._id || "");
    }).catch(() => {});
    loadOffers();
  }, []);

  async function loadOffers() {
    setLoading(true);
    try {
      const data = await ownerTurfService.listOffers();
      setOffers(data.offers || []);
    } catch (err) {
      setError(err.message || "Unable to load offers.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  function beginCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, turfId: selectedTurfId });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function beginEdit(offer) {
    setEditingId(offer._id);
    setForm({
      turfId: offer.turf?._id || offer.turf || "",
      title: offer.title,
      description: offer.description || "",
      discountType: offer.discountType,
      discountValue: String(offer.discountValue),
      offerDate: offer.validFrom ? offer.validFrom.slice(0, 10) : "",
    });
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.turfId) return setError("Select a turf for this offer.");
    if (!form.title.trim()) return setError("Offer title is required.");
    if (!form.discountValue || Number(form.discountValue) <= 0)
      return setError("Enter a valid discount value.");
    if (!form.offerDate) return setError("Choose the date this offer applies to.");
    setSaving(true);
    try {
      const payload = {
        turfId: form.turfId,
        title: form.title.trim(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        validFrom: form.offerDate,
        validTo: form.offerDate,
        daysOfWeek: [],
      };
      if (editingId) {
        const data = await ownerTurfService.updateOffer(editingId, payload);
        setOffers((items) => items.map((o) => o._id === editingId ? data.offer : o));
        setSuccess("Offer updated successfully.");
      } else {
        const data = await ownerTurfService.createOffer(payload);
        setOffers((items) => [data.offer, ...items]);
        setSuccess("Offer created successfully.");
      }
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(err.message || "Failed to save offer.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(offer) {
    try {
      const data = await ownerTurfService.updateOffer(offer._id, { isActive: !offer.isActive });
      setOffers((items) => items.map((o) => o._id === offer._id ? data.offer : o));
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteOffer(offer) {
    const confirmed = await confirmAction({
      title: "Delete offer?",
      text: `"${offer.title}" will be permanently removed.`,
      icon: "warning",
      confirmButtonText: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await ownerTurfService.deleteOffer(offer._id);
      setOffers((items) => items.filter((o) => o._id !== offer._id));
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredOffers = offers.filter((offer) => String(offer.turf?._id || offer.turf) === selectedTurfId);

  function formatDiscount(offer) {
    return offer.discountType === "percentage"
      ? `${offer.discountValue}% off`
      : `₹${offer.discountValue} flat off`;
  }

  function formatDays(daysOfWeek) {
    if (!daysOfWeek?.length) return "Selected date only";
    return daysOfWeek.sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join(", ");
  }

  function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <DashboardShell role="owner" title="Offers & Promotions" subtitle="Create special offers for your turfs to attract more players">
      <div className="offersPage">
        {/* Top bar */}
        <div className="offersTopBar">
          <div className="offersTurfFilter">
            <label>Filter by turf</label>
            <select value={selectedTurfId} onChange={(e) => setSelectedTurfId(e.target.value)}>
              {turfs.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button className="dashAction" onClick={beginCreate}>+ Create Offer</button>
        </div>

        {error && <p className="authError">{error}</p>}
        {success && <p className="authSuccess">{success}</p>}

        {/* Offer Form */}
        {showForm && (
          <div className="offerFormCard">
            <div className="offerFormHeader">
              <h2>{editingId ? "Edit Offer" : "Create New Offer"}</h2>
              <button className="iconBtn" onClick={() => { setShowForm(false); setEditingId(null); setError(""); }}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="offerForm">
              <label>
                Turf
                <select name="turfId" value={form.turfId} onChange={updateField} required>
                  <option value="">Select a turf</option>
                  {turfs.map((t) => (
                    <option key={t._id} value={t._id}>{t.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Offer title
                <input
                  name="title"
                  value={form.title}
                  onChange={updateField}
                  placeholder="e.g. Weekend Special, Morning Discount"
                  required
                />
              </label>

              <label className="wide">
                Description (optional)
                <input
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  placeholder="e.g. Book before 10 AM and save big!"
                />
              </label>

              <div className="offerDiscountRow">
                <label>
                  Discount type
                  <select name="discountType" value={form.discountType} onChange={updateField}>
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </label>
                <label>
                  Discount value
                  <input
                    name="discountValue"
                    type="number"
                    min="1"
                    max={form.discountType === "percentage" ? 100 : undefined}
                    value={form.discountValue}
                    onChange={updateField}
                    placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 200"}
                    required
                  />
                </label>
              </div>

              <label>
                Offer date
                <input type="date" name="offerDate" value={form.offerDate} onChange={updateField} required />
              </label>

              <div className="offerFormActions">
                <button className="dashAction" type="submit" disabled={saving}>
                  {saving ? "Saving…" : editingId ? "Save changes" : "Create offer"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setError(""); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Offers List */}
        {loading ? (
          <p style={{ color: "var(--text-3)", padding: "24px 0" }}>Loading offers…</p>
        ) : !filteredOffers.length ? (
          <div className="offersEmpty">
            <div className="offersEmptyIcon">🎁</div>
            <h3>No offers yet</h3>
            <p>Create special discounts to attract more players to your turfs.</p>
            <button className="dashAction" onClick={beginCreate}>Create your first offer</button>
          </div>
        ) : (
          <div className="offersGrid">
            {filteredOffers.map((offer) => {
              const turfImage = offer.turf?.primaryImage || offer.turf?.images?.[0] || "";
              return (
                <div key={offer._id} className={`offerCard ${!offer.isActive ? "offerInactive" : ""}`}>
                  <div className="offerCardBadge">
                    {offer.discountType === "percentage"
                      ? `${offer.discountValue}% OFF`
                      : `₹${offer.discountValue} OFF`}
                  </div>
                  {turfImage && (
                    <div className="offerCardImg" style={{ backgroundImage: `url(${getImageUrl(turfImage)})` }} />
                  )}
                  <div className="offerCardBody">
                    <div className="offerCardTurf">
                      {offer.turf?.name || "Unknown turf"}
                    </div>
                    <h3 className="offerCardTitle">{offer.title}</h3>
                    {offer.description && <p className="offerCardDesc">{offer.description}</p>}
                    <div className="offerCardMeta">
                      <span>📅 {formatDays(offer.daysOfWeek)}</span>
                      {(offer.validFrom || offer.validTo) && (
                        <span>
                          🗓 {offer.validFrom ? formatDate(offer.validFrom) : "Now"}
                          {" → "}
                          {offer.validTo ? formatDate(offer.validTo) : "Ongoing"}
                        </span>
                      )}
                      <span className={`offerStatus ${offer.isActive ? "active" : "inactive"}`}>
                        {offer.isActive ? "✓ Active" : "✗ Inactive"}
                      </span>
                    </div>
                  </div>
                  <div className="offerCardActions">
                    <button onClick={() => beginEdit(offer)}>Edit</button>
                    <button onClick={() => toggleActive(offer)}>
                      {offer.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button className="deleteButton" onClick={() => deleteOffer(offer)}>Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

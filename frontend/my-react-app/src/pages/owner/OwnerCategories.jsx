import { useEffect, useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import { confirmAction, showSuccess } from "../../utils/alert";
import { ownerTurfService } from "../../services/ownerTurfService";
import { useOwnerSubscription } from "../../contexts/ownerSubscriptionContext";

const DEFAULT_CATEGORIES = [
  "Football",
  "Cricket",
  "Basketball",
  "Tennis",
  "Rugby",
  "Badminton",
];

export default function OwnerCategories() {
  const { requireSubscription } = useOwnerSubscription();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

    async function loadCategories() {
      try {
        const data = await ownerTurfService.listCategories();
        setCategories(data.categories || []);
      } catch (requestError) {
        setError(requestError.message || "Unable to load categories.");
      } finally {
        setLoading(false);
      }
    }

  useEffect(() => {
    loadCategories();
  }, []);

  async function addCategory(event) {
    event.preventDefault();
    if (!requireSubscription()) return;
    setError("");
    const categoryNames = [
      ...new Set(
        name
          .split(/[\n,]+/)
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
    if (!categoryNames.length) {
      setError("Enter at least one category.");
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.all(
        categoryNames.map(async (categoryName) => {
          try {
            const data = await ownerTurfService.addCategory({ name: categoryName });
            return { ok: true, data, categoryName };
          } catch (error) {
            return { ok: false, data: error, categoryName };
          }
        }),
      );
      const added = results
        .filter(({ ok }) => ok)
        .map(({ data }) => data.category);
      const failed = results.filter(({ ok }) => !ok);
      if (!added.length && failed.length)
        throw new Error(failed[0].data.message || "Unable to add categories.");
      setCategories((items) =>
        [...items, ...added].sort((first, second) =>
          first.name.localeCompare(second.name),
        ),
      );
      setName("");
      showSuccess(
        "Categories added",
        `${added.length} categor${added.length === 1 ? "y is" : "ies are"} ready to use on your turfs.`,
      );
      if (failed.length)
        setError(
          `${failed.length} categor${failed.length === 1 ? "y was" : "ies were"} skipped because they already exist or were invalid.`,
        );
    } catch (requestError) {
      setError(requestError.message || "Unable to add category.");
    } finally {
      setSaving(false);
    }
  }

  async function removeCategory(category) {
    const confirmed = await confirmAction({
      title: "Remove category?",
      text: `${category.name} will no longer appear in your category selector. Existing turfs will not be deleted.`,
      confirmButtonText: "Yes, remove",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await ownerTurfService.removeCategory(category._id);
      setCategories((items) =>
        items.filter((item) => item._id !== category._id),
      );
    } catch (requestError) {
      setError(requestError.message || "Unable to remove category.");
    }
  }

  return (
    <DashboardShell
      role="owner"
      title="Categories"
      subtitle="Create and manage the categories used by your turfs"
    >
      <section className="categoryManager">
        <div className="categoryManagerIntro">
          <p className="pageKicker">VENUE ORGANIZATION</p>
          <h2>Add categories</h2>
          <p>
            Add multiple categories at once by separating names with commas or
            new lines.
          </p>
          <form onSubmit={addCategory}>
            <textarea
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength="400"
              rows="3"
              placeholder="Football, Cricket, Pickleball"
              aria-label="Category names"
            />
            <button className="dashAction" disabled={saving}>
              {saving ? "Adding..." : "Add categories"}
            </button>
          </form>
        </div>
        <div className="categoryManagerList">
          <div className="panelTitle">
            <div>
              <h2>Your categories</h2>
              <p>Built-in categories are always available.</p>
            </div>
          </div>
          {error && <p className="authError">{error}</p>}
          {loading ? (
            <p className="managementEmpty">Loading categories...</p>
          ) : (
            <div className="categoryManagerGrid">
              {DEFAULT_CATEGORIES.map((category) => (
                <div className="categoryManagerItem" key={category}>
                  <span>{category}</span>
                  <small>Built-in</small>
                </div>
              ))}
              {categories.map((category) => (
                <div className="categoryManagerItem" key={category._id}>
                  <span>{category.name}</span>
                  <button
                    onClick={() => removeCategory(category)}
                    aria-label={`Remove ${category.name}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </DashboardShell>
  );
}

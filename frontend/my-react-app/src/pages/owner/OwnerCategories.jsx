import { useEffect, useState } from "react";
import DashboardShell from "../../components/DashboardShell";
import { getAuthToken } from "../../utils/auth";
import { confirmAction, showSuccess } from "../../utils/alert";

const API_URL = "http://localhost:5000/api/owner/categories";
const DEFAULT_CATEGORIES = [
  "Football",
  "Cricket",
  "Basketball",
  "Tennis",
  "Rugby",
  "Badminton",
];

export default function OwnerCategories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadCategories() {
    try {
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to load categories.");
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
          const response = await fetch(API_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getAuthToken()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name: categoryName }),
          });
          const data = await response.json();
          return { response, data, categoryName };
        }),
      );
      const added = results
        .filter(({ response }) => response.ok)
        .map(({ data }) => data.category);
      const failed = results.filter(({ response }) => !response.ok);
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
      const response = await fetch(`${API_URL}/${category._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Unable to remove category.");
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

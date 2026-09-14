import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardShell from "../../components/DashboardShell";
import Pagination from "../../components/Pagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { getAuthToken } from "../../utils/auth";
import { confirmAction, showSuccess } from "../../utils/alert";
import TurfImageUploader from "../../components/TurfImageUploader";

const API_URL = "http://localhost:5000/api/owner/turfs";
const CATEGORY_API_URL = "http://localhost:5000/api/owner/categories";
const CATEGORY_OPTIONS = [
  "Football",
  "Cricket",
  "Basketball",
  "Tennis",
  "Rugby",
  "Badminton",
  "Other",
];
const emptyForm = {
  name: "",
  description: "",
  categories: ["Football"],
  turfType: "Outdoor",
  facilities: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  latitude: "",
  longitude: "",
  contactNumber: "",
  openingTime: "06:00",
  closingTime: "22:00",
  rules: "",
};
const defaultSlots = [{ startTime: "06:00", endTime: "07:00", price: "" }];
async function readResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      `The server returned an unexpected response (${response.status}).`,
    );
  }
}

export default function ManageTurfs() {
  const location = useLocation();
  const navigate = useNavigate();
  const createOnly = location.pathname.endsWith("/new");
  const [turfs, setTurfs] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [imageFiles, setImageFiles] = useState([]);
  const [slots, setSlots] = useState(defaultSlots);
  const [categories, setCategories] = useState([]);
  const debouncedSearch = useDebouncedValue(search);
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getAuthToken()}`,
  };

  useEffect(() => {
    fetch(CATEGORY_API_URL, {
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    })
      .then((response) =>
        response
          .json()
          .then((data) =>
            response.ok ? data : Promise.reject(new Error(data.message)),
          ),
      )
      .then((data) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  const categoryOptions = [
    ...new Set([
      ...CATEGORY_OPTIONS,
      ...categories.map((category) => category.name),
    ]),
  ];

  useEffect(() => {
    async function loadTurfs() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: debouncedSearch,
          page: String(page),
          limit: "5",
        });
        const response = await fetch(`${API_URL}?${params}`, {
          headers: authHeaders,
        });
        const data = await readResponse(response);
        if (!response.ok)
          throw new Error(data.message || "Unable to load turfs.");
        setTurfs(data.turfs);
        setTotalPages(data.totalPages);
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }
    loadTurfs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, refresh]);

  useEffect(() => {
    if (createOnly && location.state?.turf) beginEdit(location.state.turf);
  }, [createOnly, location.state]);
  const updateField = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setImageFiles([]);
    setSlots(defaultSlots);
    setError("");
    setSuccess("");
  };
  const beginEdit = (turf) => {
    setEditingId(turf._id);
    setForm({
      name: turf.name,
      description: turf.description || "",
      categories: turf.categories?.length
        ? turf.categories
        : [turf.category || turf.sports?.[0] || "Other"],
      turfType: turf.turfType || "Outdoor",
      facilities: turf.facilities.join(", "),
      address: turf.location.address,
      city: turf.location.city,
      state: turf.location.state || "",
      pincode: turf.location.pincode || "",
      latitude: turf.location.latitude ?? "",
      longitude: turf.location.longitude ?? "",
      contactNumber: turf.contactNumber || "",
      openingTime: turf.openingTime || "06:00",
      closingTime: turf.closingTime || "22:00",
      rules: turf.rules || "",
    });
    setSlots(
      turf.slots?.length
        ? turf.slots.map((slot) => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            price: slot.price ?? turf.pricePerHour,
          }))
        : [{ ...defaultSlots[0], price: turf.pricePerHour }],
    );
    setError("");
    setSuccess("");
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const isEditing = Boolean(editingId);
    if (!form.name.trim() || !form.address.trim() || !form.city.trim()) {
      setError("Enter the turf name, address, and city.");
      return;
    }
    if (!form.categories.length) {
      setError("Select at least one category.");
      return;
    }

    const confirmed = await confirmAction({
      title: isEditing ? "Update Turf Details?" : "Add New Turf?",
      text: isEditing
        ? `Save updated details for ${form.name}?`
        : `Add ${form.name} to venue listings?`,
      icon: "question",
      confirmButtonText: isEditing ? "Yes, update turf" : "Yes, add turf",
    });
    if (!confirmed) return;

    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key !== "categories") body.append(key, value);
      });
      body.append("categories", JSON.stringify(form.categories));
      body.append("slots", JSON.stringify(slots));
      imageFiles.forEach((file) => body.append("images", file));
      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { Authorization: `Bearer ${getAuthToken()}` },
          body,
        },
      );
      const data = await readResponse(response);
      if (!response.ok)
        throw new Error(data.message || "Unable to save the turf.");
      resetForm();
      const msg = isEditing
        ? "Turf and location updated."
        : "Turf created successfully.";
      setSuccess(msg);
      showSuccess(isEditing ? "Turf Updated" : "Turf Created", msg);
      if (createOnly) {
        navigate("/owner/turfs");
        return;
      }
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function toggleListing(turf) {
    try {
      const response = await fetch(`${API_URL}/${turf._id}/listing`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ isListed: !turf.isListed }),
      });
      const data = await readResponse(response);
      if (!response.ok)
        throw new Error(data.message || "Unable to update listing.");
      setTurfs((items) =>
        items.map((item) => (item._id === turf._id ? data.turf : item)),
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteTurf(turf) {
    const confirmed = await confirmAction({
      title: "Delete turf?",
      text: `${turf.name} and its bookings will be permanently removed.`,
      icon: "warning",
      confirmButtonText: "Yes, delete turf",
      danger: true,
    });
    if (!confirmed) return;
    try {
      const response = await fetch(`${API_URL}/${turf._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      const data = await readResponse(response);
      if (!response.ok)
        throw new Error(data.message || "Unable to delete turf.");
      setTurfs((items) => items.filter((item) => item._id !== turf._id));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <DashboardShell
      role="owner"
      title="My turfs"
      subtitle="Search, add, update, and manage venues"
    >
      <section
        className={
          createOnly ? "turfManager createOnly" : "turfManager listingOnly"
        }
      >
        {!createOnly && (
          <div className="turfList">
            <div className="panelTitle">
              <h2>Your venues</h2>
              <button onClick={() => navigate("/owner/turfs/new")}>
                + Add turf
              </button>
            </div>
            <input
              className="managementSearch"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by turf name or location"
            />
            {loading ? (
              <p>Loading turfs...</p>
            ) : turfs.length ? (
              turfs.map((turf) => (
                <article className="turfItem" key={turf._id}>
                  <div className="turfItemImage">
                    {turf.primaryImage || turf.images?.[0] ? (
                      <img
                        src={
                          (turf.primaryImage || turf.images[0]).startsWith("/")
                            ? `http://localhost:5000${turf.primaryImage || turf.images[0]}`
                            : turf.primaryImage || turf.images[0]
                        }
                        alt={turf.name}
                      />
                    ) : (
                      <span>No image</span>
                    )}
                  </div>
                  <div>
                    <b>{turf.name}</b>
                    <small>{turf.category || "Other"}</small>
                    <small>
                      {turf.location.address}, {turf.location.city}
                    </small>
                    <small>
                      ₹{turf.pricePerHour}/hour ·{" "}
                      {turf.sports.join(", ") || "No sports added"}
                    </small>
                  </div>
                  <div className="accountActions">
                    <button
                      onClick={() =>
                        navigate("/owner/turfs/new", { state: { turf } })
                      }
                    >
                      Edit
                    </button>
                    <button onClick={() => toggleListing(turf)}>
                      {turf.isListed ? "Unlist" : "List"}
                    </button>
                    <button
                      className="deleteButton"
                      onClick={() => deleteTurf(turf)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p>No turfs found.</p>
            )}
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </div>
        )}
        {createOnly && (
          <section className="turfFormCard">
            <h2>{editingId ? "Edit turf and location" : "Add a new turf"}</h2>
            <p>
              Owners can update venue details and exact location at any time.
            </p>
            {error && <p className="authError">{error}</p>}
            {success && <p className="authSuccess">{success}</p>}
            <form className="turfForm" onSubmit={handleSubmit}>
              <label>
                Turf name
                <input name="name" value={form.name} onChange={updateField} />
              </label>
              <fieldset className="categoryChoices">
                <legend>Categories</legend>
                <div>
                  {categoryOptions.map((category) => (
                    <label key={category}>
                      <input
                        type="checkbox"
                        checked={form.categories.includes(category)}
                        onChange={() =>
                          setForm({
                            ...form,
                            categories: form.categories.includes(category)
                              ? form.categories.filter(
                                  (item) => item !== category,
                                )
                              : [...form.categories, category],
                          })
                        }
                      />
                      {category}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                Turf type
                <select
                  name="turfType"
                  value={form.turfType}
                  onChange={updateField}
                >
                  <option>Outdoor</option>
                  <option>Indoor</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                Contact number
                <input
                  name="contactNumber"
                  value={form.contactNumber}
                  onChange={updateField}
                />
              </label>
              <label className="wide">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateField}
                />
              </label>
              <label>
                Facilities (comma-separated)
                <input
                  name="facilities"
                  value={form.facilities}
                  onChange={updateField}
                />
              </label>
              <label className="wide">
                Address
                <input
                  name="address"
                  value={form.address}
                  onChange={updateField}
                />
              </label>
              <label>
                City
                <input name="city" value={form.city} onChange={updateField} />
              </label>
              <label>
                State
                <input name="state" value={form.state} onChange={updateField} />
              </label>
              <label>
                Pincode
                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={updateField}
                />
              </label>
              <label>
                Latitude
                <input
                  name="latitude"
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={updateField}
                />
              </label>
              <label>
                Longitude
                <input
                  name="longitude"
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={updateField}
                />
              </label>
              <label>
                Opening time
                <input
                  name="openingTime"
                  type="time"
                  value={form.openingTime}
                  onChange={updateField}
                />
              </label>
              <label>
                Closing time
                <input
                  name="closingTime"
                  type="time"
                  value={form.closingTime}
                  onChange={updateField}
                />
              </label>
              <label className="wide">
                Turf rules
                <textarea
                  name="rules"
                  value={form.rules}
                  onChange={updateField}
                />
              </label>
              <div className="wide slotEditor">
                <div className="slotEditorHeader">
                  <strong>Available time slots and prices</strong>
                  <button
                    type="button"
                    onClick={() =>
                      setSlots([
                        ...slots,
                        {
                          startTime: form.openingTime,
                          endTime: form.closingTime,
                          price: "",
                        },
                      ])
                    }
                  >
                    + Add slot
                  </button>
                </div>
                {slots.map((slot, index) => (
                  <div className="slotEditorRow" key={index}>
                    <label>
                      Start
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(event) =>
                          setSlots(
                            slots.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, startTime: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      End
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(event) =>
                          setSlots(
                            slots.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, endTime: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Price
                      <input
                        type="number"
                        min="0"
                        value={slot.price}
                        placeholder="Optional"
                        onChange={(event) =>
                          setSlots(
                            slots.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, price: event.target.value }
                                : item,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setSlots(
                          slots.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <small>
                  Slots must fit between opening and closing time and cannot
                  overlap.
                </small>
              </div>
              <div className="wide">
                <TurfImageUploader onChange={setImageFiles} />
              </div>
              <div className="formActions">
                <button className="dashAction" type="submit">
                  {editingId ? "Save changes" : "Create turf"}
                </button>
                {editingId && (
                  <button type="button" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </section>
        )}
      </section>
    </DashboardShell>
  );
}

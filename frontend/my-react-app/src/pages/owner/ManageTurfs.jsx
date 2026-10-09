import { useCallback, useEffect, useReducer, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DashboardShell from "../../components/DashboardShell";
import Pagination from "../../components/Pagination";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { confirmAction } from "../../utils/alert";
import TurfImageUploader from "../../components/TurfImageUploader";
import FieldError from "../../components/FieldError";
import TimePicker from "../../components/TimePicker";
import { ownerTurfService } from "../../services/ownerTurfService";
import ownerTurfReducer, {
  createTurfEditorState,
  defaultTurfSlots,
} from "../../reducers/ownerTurfReducer";
import { getImageUrl, SERVER_URL } from "../../utils/imageUrl";
import LeafletLocationPicker from "../../components/LeafletLocationPicker";


const CATEGORY_OPTIONS = [
  "Football",
  "Cricket",
  "Basketball",
  "Tennis",
  "Rugby",
  "Badminton",
  "Other",
];
const minutes = (timeStr) => {
  const str = String(timeStr || "").trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return NaN;
  let hours = Number(match[1]);
  const mins = Number(match[2]);
  const period = match[3]?.toUpperCase();

  if (period) {
    if (period === "AM" && hours === 12) hours = 0;
    if (period === "PM" && hours !== 12) hours += 12;
  }
  return hours * 60 + mins;
};
const validateSlots = (slots, openingTime, closingTime) => {
  const opening = minutes(openingTime);
  let closing = minutes(closingTime);
  if (closing === 0) closing = 1440;

  if (
    !Number.isFinite(opening) ||
    !Number.isFinite(closing) ||
    opening >= closing
  )
    return "Opening time must be before closing time.";
  if (!slots.length) return "Add at least one available slot.";
  const checked = slots.map((slot, index) => {
    let start = minutes(slot.startTime);
    let end = minutes(slot.endTime);
    if (end === 0 && start !== 0) end = 1440; 
    if (end === 0 && start === 0) end = 1440;
    return { ...slot, index: index + 1, start, end };
  });

  for (const slot of checked) {
    if (!Number.isFinite(slot.start) || !Number.isFinite(slot.end))
      return `Slot ${slot.index} needs a start and end time.`;
    if (slot.end <= slot.start)
      return `Slot ${slot.index} must end after it starts.`;
    if (slot.start < opening || slot.end > closing)
      return `Slot ${slot.index} must be within the opening hours.`;
    if (
      slot.price !== "" &&
      (!Number.isFinite(Number(slot.price)) || Number(slot.price) < 0)
    )
      return `Slot ${slot.index} price must be zero or more.`;
  }
  const sorted = [...checked].sort((a, b) => a.start - b.start);
  if (
    sorted.some(
      (slot, index) => index > 0 && sorted[index - 1].end > slot.start,
    )
  )
    return "Time slots cannot overlap.";
  return "";
};
export default function ManageTurfs() {
  const location = useLocation();
  const navigate = useNavigate();
  const createOnly = location.pathname.endsWith("/new");
  const [turfs, setTurfs] = useState([]);
  const [editor, dispatch] = useReducer(
    ownerTurfReducer,
    undefined,
    createTurfEditorState,
  );
  const { form, editingId, error, imageFiles, slots, success } = editor;
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [categories, setCategories] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [existingImages, setExistingImages] = useState([]);
  const debouncedSearch = useDebouncedValue(search);
  const handlePlaceSelect = useCallback((place) => {
    dispatch({ type: "UPDATE_FIELD", name: "address", value: place.address || "" });
    dispatch({ type: "UPDATE_FIELD", name: "city", value: place.city || "" });
    dispatch({ type: "UPDATE_FIELD", name: "state", value: place.state || "" });
    dispatch({ type: "UPDATE_FIELD", name: "pincode", value: place.pincode || "" });
    dispatch({ type: "UPDATE_FIELD", name: "latitude", value: place.latitude ?? "" });
    dispatch({ type: "UPDATE_FIELD", name: "longitude", value: place.longitude ?? "" });
  }, []);
  useEffect(() => {
    ownerTurfService
      .listCategories()
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
        const params = {
          search: debouncedSearch,
          page,
          limit: 5,
        };
        const data = await ownerTurfService.list(params);
        setTurfs(data.turfs);
        setTotalPages(data.totalPages);
      } catch (requestError) {
        dispatch({ type: "SET_ERROR", message: requestError.message });
      } finally {
        setLoading(false);
      }
    }
    loadTurfs();
  }, [debouncedSearch, page, refresh, location.pathname]);

  useEffect(() => {
    const updatedTurf = location.state?.updatedTurf;
    if (updatedTurf)
      setTurfs((items) =>
        items.map((item) =>
          item._id === updatedTurf._id ? updatedTurf : item,
        ),
      );
  }, [location.state]);

  const updateField = (event) => {
    const { name , value } = event.target;
    dispatch({ type: "UPDATE_FIELD", name, value });
    if (fieldErrors[name])
      setFieldErrors((errors) => ({ ...errors, [name]: "" }));
  };
  const resetForm = () => {
    setFieldErrors({});
    setExistingImages([]);
    dispatch({ type: "RESET" });
  };
  function beginEdit(turf) {
    if (!turf || typeof turf !== "object") {
      dispatch({ type: "SET_ERROR", message: "Could not load this turf for editing. Return to My Turfs and try again." });
      return;
    }
    const turfLocation = turf.location || {};
    const turfCategories = Array.isArray(turf.categories) ? turf.categories : [];
    const nextForm = {
      name: turf.name,
      description: turf.description || "",
      categories: turfCategories.length
        ? turfCategories
        : [turf.category || turf.sports?.[0] || "Other"],
      turfType: turf.turfType || "Outdoor",
      facilities: (Array.isArray(turf.facilities) ? turf.facilities : []).join(", "),
      address: turfLocation.address || turf.address || "",
      city: turfLocation.city || "",
      state: turfLocation.state || "",
      pincode: turfLocation.pincode || "",
      latitude: turfLocation.latitude ?? "",
      longitude: turfLocation.longitude ?? "",
      contactNumber: turf.contactNumber || "",
      offerPrice: turf.offerPrice ?? "",
      offerTitle: turf.offerTitle || "",
      openingTime: turf.openingTime || "06:00",
      closingTime: turf.closingTime || "22:00",
      rules: turf.rules || "",
    };
    const nextSlots = Array.isArray(turf.slots) && turf.slots.length
      ? turf.slots.map((slot) => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          price: slot.price ?? turf.pricePerHour,
        }))
      : [{ ...defaultTurfSlots()[0], price: turf.pricePerHour }];
    setFieldErrors({});
    const savedImages = turf.images?.length
      ? turf.images
      : turf.primaryImage
        ? [turf.primaryImage]
        : [];
    setExistingImages(savedImages.map((image) => getImageUrl(image)));
    dispatch({ type: "START_EDIT", turf, form: nextForm, slots: nextSlots });
  }

  useEffect(() => {
    if (createOnly && location.state?.turf) beginEdit(location.state.turf);
  }, [createOnly, location.state]);

  async function handleSubmit(event) {
    event.preventDefault();
    dispatch({ type: "CLEAR_FEEDBACK" });
    const isEditing = Boolean(editingId);
    const nextFieldErrors = {
      name: form.name.trim() ? "" : "Turf name is required.",
      categories: form.categories.length ? "" : "Select at least one category.",
      address: form.address.trim() ? "" : "Address is required.",
      city: form.city.trim() ? "" : "City is required.",
      slots: validateSlots(slots, form.openingTime, form.closingTime),
    };
    setFieldErrors(nextFieldErrors);
    if (Object.values(nextFieldErrors).some(Boolean)) {
      return;
    }

    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key !== "categories") body.append(key, value);
      });
      body.append("categories", JSON.stringify(form.categories));
      body.append("slots", JSON.stringify(slots));
      imageFiles.forEach((file) => body.append("images", file));
      if (isEditing) {
        existingImages.forEach((img) =>
          body.append("images", img.replace(SERVER_URL, "")),
        );
        if (!existingImages.length && !imageFiles.length) body.append("images", "");
      }
      const data = await ownerTurfService.save(editingId, body);
      setTurfs((items) =>
        isEditing
          ? items.map((item) => (item._id === data.turf._id ? data.turf : item))
          : [data.turf, ...items],
      );
      resetForm();
      const msg = isEditing
        ? "Turf and location updated."
        : "Turf created successfully.";
      dispatch({ type: "SET_SUCCESS", message: msg });
      if (createOnly) {
        navigate("/owner/turfs", { state: { updatedTurf: data.turf } });
        return;
      }
      setPage(1);
      setRefresh((value) => value + 1);
    } catch (requestError) {
      dispatch({ type: "SET_ERROR", message: requestError.message });
    }
  }

  async function toggleListing(turf) {
    try {
      const data = await ownerTurfService.setListing(turf._id, !turf.isListed);
      setTurfs((items) =>
        items.map((item) => (item._id === turf._id ? data.turf : item)),
      );
    } catch (requestError) {
      dispatch({ type: "SET_ERROR", message: requestError.message });
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
      await ownerTurfService.remove(turf._id);
      setTurfs((items) => items.filter((item) => item._id !== turf._id));
    } catch (requestError) {
      dispatch({ type: "SET_ERROR", message: requestError.message });
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
              <button
                data-confirmation-skip="true"
                onClick={() => navigate("/owner/turfs/new")}
              >
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
                        src={getImageUrl(turf.primaryImage || turf.images[0])}
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
                      data-confirmation-skip="true"
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
                <FieldError message={fieldErrors.name} />
                <input name="name" value={form.name} onChange={updateField} />
              </label>
              <fieldset className="categoryChoices">
                <legend>Categories</legend>
                <FieldError message={fieldErrors.categories} />
                <div>
                  {categoryOptions.map((category) => (
                    <label key={category}>
                      <input
                        type="checkbox"
                        checked={form.categories.includes(category)}
                        onChange={() => {
                          dispatch({
                            type: "SET_CATEGORIES",
                            categories: form.categories.includes(category)
                              ? form.categories.filter(
                                  (item) => item !== category,
                                )
                              : [...form.categories, category],
                          });
                          if (fieldErrors.categories)
                            setFieldErrors((errors) => ({
                              ...errors,
                              categories: "",
                            }));
                        }}
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
                Offer Title (e.g. Full Day Offer)
                <input
                  name="offerTitle"
                  value={form.offerTitle}
                  onChange={updateField}
                />
              </label>
              <label>
                Offer Price
                <input
                  name="offerPrice"
                  type="number"
                  min="0"
                  value={form.offerPrice}
                  onChange={updateField}
                />
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
                Choose venue on the map
                <FieldError message={fieldErrors.address} />
                <LeafletLocationPicker
                  address={form.address}
                  latitude={form.latitude}
                  longitude={form.longitude}
                  onSelect={handlePlaceSelect}
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
                <FieldError message={fieldErrors.city} />
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
              <div style={{ display: "none" }}>
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
              </div>
              <label>
                Opening time
                <TimePicker
                  value={form.openingTime}
                  ariaLabel="Opening time"
                  onChange={(value) =>
                    dispatch({
                      type: "UPDATE_FIELD",
                      name: "openingTime",
                      value,
                    })
                  }
                />
              </label>
              <label>
                Closing time
                <TimePicker
                  value={form.closingTime}
                  ariaLabel="Closing time"
                  onChange={(value) =>
                    dispatch({
                      type: "UPDATE_FIELD",
                      name: "closingTime",
                      value,
                    })
                  }
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
                      dispatch({
                        type: "SET_SLOTS",
                        slots: [
                          ...slots,
                          {
                            startTime: form.openingTime,
                            endTime: form.closingTime,
                            price: "",
                          },
                        ],
                      })
                    }
                  >
                    + Add slot
                  </button>
                </div>
                <FieldError message={fieldErrors.slots} />
                {slots.map((slot, index) => (
                  <div className="slotEditorRow" key={index}>
                    <label>
                      Start
                      <TimePicker
                        value={slot.startTime}
                        ariaLabel={`Slot ${index + 1} start time`}
                        onChange={(value) =>
                          dispatch({
                            type: "SET_SLOTS",
                            slots: slots.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, startTime: value }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                    <label>
                      End
                      <TimePicker
                        value={slot.endTime}
                        ariaLabel={`Slot ${index + 1} end time`}
                        onChange={(value) =>
                          dispatch({
                            type: "SET_SLOTS",
                            slots: slots.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, endTime: value }
                                : item,
                            ),
                          })
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
                          dispatch({
                            type: "SET_SLOTS",
                            slots: slots.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, price: event.target.value }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "SET_SLOTS",
                          slots: slots.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        })
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
                <TurfImageUploader
                  onChange={(files) => dispatch({ type: "SET_IMAGES", files })}
                  existingImages={editingId ? existingImages : []}
                  onRemoveExisting={(image) => setExistingImages((items) => items.filter((item) => item !== image))}
                />
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

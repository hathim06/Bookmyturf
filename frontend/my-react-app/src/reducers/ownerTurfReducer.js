export const emptyTurfForm = {
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
  closingTime: "18:00",
  rules: "",
};

export const defaultTurfSlots = () => [
  { startTime: "06:00", endTime: "07:00", price: "" },
];

export const createTurfEditorState = () => ({
  form: { ...emptyTurfForm, categories: [...emptyTurfForm.categories] },
  editingId: null,
  imageFiles: [],
  slots: defaultTurfSlots(),
  error: "",
  success: "",
});

export default function ownerTurfReducer(state, action) {
  switch (action.type) {
    case "UPDATE_FIELD":
      return { ...state, form: { ...state.form, [action.name]: action.value } };
    case "SET_CATEGORIES":
      return { ...state, form: { ...state.form, categories: action.categories } };
    case "SET_SLOTS":
      return { ...state, slots: action.slots };
    case "SET_IMAGES":
      return { ...state, imageFiles: action.files };
    case "SET_ERROR":
      return { ...state, error: action.message };
    case "SET_SUCCESS":
      return { ...state, success: action.message };
    case "CLEAR_FEEDBACK":
      return { ...state, error: "", success: "" };
    case "RESET":
      return createTurfEditorState();
    case "START_EDIT":
      return {
        ...state,
        editingId: action.turf._id,
        form: action.form,
        slots: action.slots,
        error: "",
        success: "",
      };
    default:
      return state;
  }
}

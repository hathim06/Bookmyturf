import { useEffect, useState, useRef } from "react";
import { Page } from "../../components/Layout";
import DashboardShell from "../../components/DashboardShell";
import { useNavigate } from "react-router-dom";
import PasswordInput from "../../components/PasswordInput";
import { updateAuthUser } from "../../utils/auth";
import { confirmAction, showSuccess } from "../../utils/alert";
import {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
  validatePincode,
} from "../../utils/validation";
import FieldError from "../../components/FieldError";
import { userService } from "../../services/userService";
import { getImageUrl } from "../../utils/imageUrl";

const emptyProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
  pincode: "",
  place: "",
  district: "",

};



export default function Profile({ role = "user" }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(emptyProfile),
    [savedProfile, setSavedProfile] = useState(emptyProfile),
    [editing, setEditing] = useState(false),
    [panel, setPanel] = useState(""),
    [emailForm, setEmailForm] = useState({ email: "", password: "" }),
    [passwordForm, setPasswordForm] = useState({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [lookupStatus, setLookupStatus] = useState(""),
    [fieldErrors, setFieldErrors] = useState({ name: "", phone: "", pincode: "" }),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  useEffect(() => {
    async function load() {
      try {
        const data = await userService.getProfile();
        const user = { ...emptyProfile, ...data.user };
        setForm(user);
        setSavedProfile(user);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);
  const updateField = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  async function lookupPincode(pincode) {
    if (!/^\d{6}$/.test(pincode)) return setLookupStatus("");
    setLookupStatus("Finding place…");
    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pincode}`,
      );
      const [result] = await response.json();
      const office =
        result?.Status === "Success" ? result.PostOffice?.[0] : null;
      if (!office) throw new Error();
      setForm((current) => ({
        ...current,
        place: office.Name || "",
        district: office.District || "",
      }));
      setLookupStatus("Place and district filled from pincode.");
    } catch {
      setLookupStatus("Pincode not found. Enter the details manually.");
    }
  }
  const handlePincode = (event) => {
    const pincode = event.target.value.replace(/\D/g, "").slice(0, 6);
    setForm({ ...form, pincode });
    lookupPincode(pincode);
  };

  async function saveProfile(event) {
    event.preventDefault();

    const nameErr = validateName(form.name);
    const phoneErr = validatePhone(form.phone);
    let pinErr = "";
    if (form.pincode) pinErr = validatePincode(form.pincode);

    setFieldErrors({ name: nameErr, phone: phoneErr, pincode: pinErr });
    if (nameErr || phoneErr || pinErr) {
      return;
    }

    const confirmed = await confirmAction({
      title: "Save Profile Changes?",
      text: "Are you sure you want to update your personal profile details?",
      icon: "question",
      confirmButtonText: "Yes, save changes",
    });
    if (!confirmed) return;

    setSaving(true);
    setError("");
    try {
      const data = await userService.updateProfile(form);
      const user = { ...emptyProfile, ...data.user };
      setForm(user);
      setSavedProfile(user);
      updateAuthUser(user);
      setSuccess("Your profile has been updated.");
      showSuccess("Profile Updated", "Your profile details have been saved.");
      setEditing(false);
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(
        "Please upload an image file (e.g. JPG, PNG). PDFs and other documents are not allowed.",
      );
      return;
    }

    let croppedFile;
    try {
      croppedFile = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const size = Math.min(image.width, image.height);
          const canvas = document.createElement("canvas");
          canvas.width = 600; canvas.height = 600;
          canvas.getContext("2d").drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 600, 600);
          canvas.toBlob((blob) => blob ? resolve(new File([blob], file.name, { type: "image/jpeg" })) : reject(new Error("Unable to crop image.")), "image/jpeg", 0.9);
        };
        image.onerror = reject; image.src = reader.result;
      };
      reader.onerror = reject; reader.readAsDataURL(file);
      });
    } catch {
      setError("Unable to crop this image. Please choose another image.");
      return;
    }
    const formData = new FormData();
    formData.append("profilePicture", croppedFile);

    setSaving(true);
    setError("");
    try {
      const data = await userService.uploadPicture(formData);
      const user = { ...form, ...data.user };
      setForm(user);
      setSavedProfile(user);
      updateAuthUser(user);
      setSuccess("Profile picture updated successfully.");
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePictureDelete() {
    const confirmed = await confirmAction({
      title: "Remove Profile Picture?",
      text: "Are you sure you want to remove your profile picture?",
      icon: "question",
      confirmButtonText: "Yes, remove it",
    });
    if (!confirmed) return;

    setSaving(true);
    setError("");
    try {
      const data = await userService.deletePicture();
      const user = { ...form, ...data.user };
      setForm(user);
      setSavedProfile(user);
      updateAuthUser(user);
      setSuccess("Profile picture removed successfully.");
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function change(event, endpoint, body, message) {
    event.preventDefault();
    const isEmail = endpoint.includes("email");

    if (isEmail) {
      const emailErr = validateEmail(body.email);
      if (emailErr) return setError(emailErr);
    } else {
      const passErr = validatePassword(body.newPassword);
      if (passErr) return setError(passErr);
    }

    const confirmed = await confirmAction({
      title: isEmail ? "Request Email Change?" : "Request Password Change?",
      text: isEmail
        ? `Send verification OTP to confirm email change to ${body.email}?`
        : "Send verification OTP to confirm password change?",
      icon: "question",
      confirmButtonText: "Yes, send OTP",
    });
    if (!confirmed) return;

    setSaving(true);
    setError("");
    try {
      const data = isEmail
        ? await userService.changeEmail(body)
        : await userService.changePassword(body);
      if (data.requiresOtp)
        return navigate("/verify-otp", { state: { purpose: data.purpose } });
      if (data.user) {
        const user = { ...form, ...data.user };
        setForm(user);
        setSavedProfile(user);
        updateAuthUser(data.user);
      }
      setSuccess(message);
      showSuccess("Account Updated", message);
      setPanel("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const togglePanel = (next) => {
    setPanel(panel === next ? "" : next);
    setError("");
    setSuccess("");
  };
  const Shell = role === "user" ? Page : DashboardShell;
  const shellProps = role === "user" ? {} : {
    role,
    title: role === "admin" ? "Admin profile" : "Owner profile",
    subtitle: role === "admin" ? "Manage your administrator account" : "Manage your owner account",
  };
  return (
    <Shell {...shellProps}>
      <section className="profileSettings">
        <div className="profilePageTitle">
          <p className="authEyebrow">ACCOUNT SETTINGS</p>
          <h1>Profile & settings</h1>
          <span>Manage your personal details, address, and security.</span>
        </div>
        {loading ? (
          <p>Loading profile...</p>
        ) : (
          <>
            <form className="profileCard" onSubmit={saveProfile}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  className="profileAvatar"
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    cursor: "pointer",
                    overflow: "hidden",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    position: "relative",
                  }}
                  title="Click to upload profile picture"
                >
                  {form.profilePicture ? (
                    <img
                      src={getImageUrl(form.profilePicture)}
                      alt="Profile"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    form.name?.charAt(0).toUpperCase()
                  )}
                </div>
                {form.profilePicture && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePictureDelete();
                    }}
                    style={{
                      background: "#fee2e2",
                      border: "none",
                      color: "#ef4444",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 14px",
                      borderRadius: "20px",
                      fontSize: "0.85rem",
                      fontWeight: "500",
                      transition: "background 0.2s ease",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#fecaca")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#fee2e2")
                    }
                    title="Remove profile picture"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18"></path>
                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                    Remove
                  </button>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handlePictureUpload}
                style={{ display: "none" }}
              />
              <div className="profileCardTitle">
                <h2>Personal profile</h2>
                <p>Keep your account and address information up to date.</p>
              </div>
              {!editing && (
                <button
                  className="editProfile"
                  type="button"
                  onClick={() => {
                    setEditing(true);
                    setSuccess("");
                  }}
                >
                  Edit profile
                </button>
              )}
              {error && !panel && (
                <p className="authError profileMessage">{error}</p>
              )}
              {success && (
                <p className="authSuccess profileMessage">{success}</p>
              )}
              <div className="profileFields">
                <label>
                  Full name
                  <FieldError message={fieldErrors.name} />
                  <input
                    name="name"
                    value={form.name}
                    onChange={updateField}
                    disabled={!editing}
                    style={fieldErrors.name ? { borderColor: '#ef4444' } : {}}
                  />
                </label>
                <label>
                  Email address
                  <input value={form.email} disabled readOnly />
                  {!form.googleId && <small>Use Change email below to update this.</small>}
                </label>
                <label>
                  Phone number
                  <FieldError message={fieldErrors.phone} />
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={updateField}
                    disabled={!editing}
                    style={fieldErrors.phone ? { borderColor: '#ef4444' } : {}}
                  />
                </label>
                <label>
                  Pincode
                  <FieldError message={fieldErrors.pincode} />
                  <input
                    name="pincode"
                    value={form.pincode}
                    onChange={handlePincode}
                    disabled={!editing}
                    inputMode="numeric"
                    maxLength="6"
                    placeholder="e.g. 682001"
                    style={fieldErrors.pincode ? { borderColor: '#ef4444' } : {}}
                  />
                  {lookupStatus && <small>{lookupStatus}</small>}
                </label>
                <label>
                  Place
                  <input
                    name="place"
                    value={form.place}
                    onChange={updateField}
                    disabled={!editing}
                    placeholder="Auto-filled from pincode"
                  />
                </label>
                <label>
                  District
                  <input
                    name="district"
                    value={form.district}
                    onChange={updateField}
                    disabled={!editing}
                    placeholder="Auto-filled from pincode"
                  />
                </label>
                <label className="addressField">
                  Address / house details
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={updateField}
                    disabled={!editing}
                    placeholder="House name, street, landmark"
                  />
                </label>
              </div>
              {editing && (
                <div className="profileActions">
                  <button className="authSubmit" disabled={saving}>
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(savedProfile);
                      setEditing(false);
                      setLookupStatus("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </form>
            <section className="securityCard">
              <div>
                <h2>Login & security</h2>
                <p>{form.googleId ? "This account uses Google sign-in." : "Update your email address or password."}</p>
              </div>
              <div className="securityActions">
                {!form.googleId && <button type="button" onClick={() => togglePanel("email")}>Change email</button>}
                {!form.googleId && <button type="button" onClick={() => togglePanel("password")}>Change password</button>}
              </div>
              {panel === "email" && (
                <form
                  className="securityForm"
                  onSubmit={(event) =>
                    change(
                      event,
                      "/profile/email",
                      emailForm,
                      "Email address updated.",
                    )
                  }
                >
                  <h3>Change email address</h3>
                  {error && <p className="authError">{error}</p>}
                  <label>
                    New email
                    <input
                      type="email"
                      value={emailForm.email}
                      onChange={(event) =>
                        setEmailForm({
                          ...emailForm,
                          email: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Current password
                    <PasswordInput
                      value={emailForm.password}
                      onChange={(event) =>
                        setEmailForm({
                          ...emailForm,
                          password: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button className="authSubmit" disabled={saving}>
                    {saving ? "Updating..." : "Update email"}
                  </button>
                </form>
              )}
              {panel === "password" && (
                <form
                  className="securityForm"
                  onSubmit={(event) => {
                    if (
                      passwordForm.newPassword !== passwordForm.confirmPassword
                    ) {
                      event.preventDefault();
                      return setError("New passwords do not match.");
                    }
                    change(
                      event,
                      "/profile/password",
                      passwordForm,
                      "Password updated successfully.",
                    );
                  }}
                >
                  <h3>Change password</h3>
                  {error && <p className="authError">{error}</p>}
                  <label>
                    Current password
                    <PasswordInput
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    New password
                    <PasswordInput
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Confirm new password
                    <PasswordInput
                      value={passwordForm.confirmPassword}
                      onChange={(event) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: event.target.value,
                        })
                      }
                    />
                  </label>
                  <button className="authSubmit" disabled={saving}>
                    {saving ? "Updating..." : "Update password"}
                  </button>
                </form>
              )}
            </section>
          </>
        )}
      </section>
    </Shell>
  );
}

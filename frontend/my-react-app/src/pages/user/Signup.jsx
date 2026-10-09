import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import PasswordInput from "../../components/PasswordInput";
import { setAuthSession } from "../../utils/auth";
import {
  validateName,
  validateEmail,
  validatePhone,
  validatePassword,
} from "../../utils/validation";
import FormError from "../../components/FormError";
import FieldError from "../../components/FieldError";
import { authService } from "../../services/authService";

export default function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validators = {
    name: validateName,
    email: validateEmail,
    phone: validatePhone,
    password: validatePassword,
    confirmPassword: (v) =>
      v !== form.password ? "Passwords do not match." : "",
  };

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: "" });
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    setFieldErrors({ ...fieldErrors, [name]: validators[name]?.(value) || "" });
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const errs = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      phone: validatePhone(form.phone),
      password: validatePassword(form.password),
      confirmPassword:
        form.password !== form.confirmPassword ? "Passwords do not match." : "",
    };
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    setLoading(true);
    try {
      await authService.register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      navigate("/verify-otp", {
        state: { purpose: "signup", email: form.email },
      });
    } catch (requestError) {
      setError(requestError.message || "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const data = await authService.googleLogin(credentialResponse.credential);
      if (data.token) {
        setAuthSession(data.token, data.user);
        const destinations = {
          admin: "/admin/dashboard",
          owner: "/owner/dashboard",
          user: "/",
        };
        navigate(destinations[data.user.role] || "/", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Google signup error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authContent">
          <Link className="authBrand" to="/">
            BookMy<span>Turf</span>
          </Link>
          <p className="authEyebrow">JOIN THE GAME</p>
          <h1>Create your account</h1>
          <FormError message={error} />

          <div className="authSocial">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google signup failed.")}
            />
          </div>
          <div className="authDivider">
            <span>OR</span>
          </div>

          <form className="authForm" onSubmit={handleSubmit}>
            <label>
              Full name
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                onBlur={handleBlur}
                autoComplete="name"
                style={fieldErrors.name ? { borderColor: "#ef4444" } : {}}
              />
              <FieldError message={fieldErrors.name} />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                onBlur={handleBlur}
                autoComplete="email"
                style={fieldErrors.email ? { borderColor: "#ef4444" } : {}}
              />
              <FieldError message={fieldErrors.email} />
            </label>
            <label>
              Phone number
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateField}
                onBlur={handleBlur}
                autoComplete="tel"
                style={fieldErrors.phone ? { borderColor: "#ef4444" } : {}}
              />
              <FieldError message={fieldErrors.phone} />
            </label>
            <label>
              Password
              <PasswordInput
                name="password"
                value={form.password}
                onChange={updateField}
                onBlur={handleBlur}
                minLength="6"
                autoComplete="new-password"
                style={fieldErrors.password ? { borderColor: "#ef4444" } : {}}
              />
              <FieldError message={fieldErrors.password} />
            </label>
            <label>
              Confirm password
              <PasswordInput
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={updateField}
                onBlur={handleBlur}
                minLength="6"
                autoComplete="new-password"
                style={
                  fieldErrors.confirmPassword ? { borderColor: "#ef4444" } : {}
                }
              />
              <FieldError message={fieldErrors.confirmPassword} />
            </label>
            <button className="authSubmit" disabled={loading} type="submit">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="authSwitch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

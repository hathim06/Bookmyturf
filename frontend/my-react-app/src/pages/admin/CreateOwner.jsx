import { useState } from 'react';
import DashboardShell from '../../components/DashboardShell';
import PasswordInput from '../../components/PasswordInput';
import { confirmAction, showSuccess } from '../../utils/alert';
import { validateName, validateEmail, validatePhone, validatePassword } from '../../utils/validation';
import FormError from '../../components/FormError';
import FieldError from '../../components/FieldError';
import { adminService } from '../../services/adminService';


export default function CreateOwner() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm({ ...form, [name]: value });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: '' });
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    const validators = { name: validateName, email: validateEmail, phone: validatePhone, password: validatePassword };
    setFieldErrors({ ...fieldErrors, [name]: validators[name]?.(value) || '' });
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    const nameErr = validateName(form.name);
    const emailErr = validateEmail(form.email);
    const phoneErr = validatePhone(form.phone);
    const passErr = validatePassword(form.password);
    const errs = { name: nameErr, email: emailErr, phone: phoneErr, password: passErr };
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

    const confirmed = await confirmAction({
      title: 'Create Owner Account?',
      text: `Are you sure you want to add ${form.name} as a turf owner?`,
      icon: 'question',
      confirmButtonText: 'Yes, create owner'
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const data = await adminService.createOwner(form);
      setSuccess(`${data.user.name} has been added as a turf owner.`);
      showSuccess('Owner Created', `${data.user.name} has been added as a turf owner.`);
      setForm({ name: '', email: '', phone: '', password: '' });
    } catch (requestError) {
      setError(requestError.message || 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }


  return <DashboardShell role="admin" title="Create owner" subtitle="Add a turf owner to the platform">
    <section className="ownerFormCard">
      <div><h2>Owner details</h2><p>Create an owner account that can access the owner dashboard.</p></div>
      <FormError message={error} />
      {success && <p className="authSuccess" role="status">{success}</p>}
      <form className="ownerForm" onSubmit={handleSubmit}>
        <label>Full name
          <input name="name" value={form.name} onChange={updateField} onBlur={handleBlur} autoComplete="name" style={fieldErrors.name ? { borderColor: '#ef4444' } : {}} />
          <FieldError message={fieldErrors.name} />
        </label>
        <label>Email address
          <input name="email" type="email" value={form.email} onChange={updateField} onBlur={handleBlur} autoComplete="email" style={fieldErrors.email ? { borderColor: '#ef4444' } : {}} />
          <FieldError message={fieldErrors.email} />
        </label>
        <label>Phone number
          <input name="phone" type="tel" value={form.phone} onChange={updateField} onBlur={handleBlur} autoComplete="tel" style={fieldErrors.phone ? { borderColor: '#ef4444' } : {}} />
          <FieldError message={fieldErrors.phone} />
        </label>
        <label>Temporary password
          <PasswordInput name="password" value={form.password} onChange={updateField} onBlur={handleBlur} minLength="6" autoComplete="new-password" style={fieldErrors.password ? { borderColor: '#ef4444' } : {}} />
          <FieldError message={fieldErrors.password} />
        </label>
        <button className="dashAction ownerSubmit" type="submit" disabled={loading}>{loading ? 'Creating owner...' : 'Create owner'}</button>
      </form>
    </section>
  </DashboardShell>;
}


export const validateName = (name) => {
  if (!name || name.trim().length === 0) return 'Name is required.';
  if (name.trim().length < 2) return 'Name must be at least 2 characters.';
  if (!/^[a-zA-Z\s]+$/.test(name)) return 'Name can only contain letters and spaces.';
  return '';
};

export const validateEmail = (email) => {
  if (!email || email.trim().length === 0) return 'Email is required.';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Please enter a valid email address.';
  return '';
};

export const validatePhone = (phone) => {
  if (!phone || phone.trim().length === 0) return 'Phone number is required.';
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone)) return 'Phone number must be exactly 10 digits.';
  return '';
};

export const validatePassword = (password) => {
  if (!password) return 'Password is required.';
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return '';
};

export const validatePincode = (pincode) => {
  if (!pincode || pincode.trim().length === 0) return 'Pincode is required.';
  if (!/^\d{6}$/.test(pincode)) return 'Pincode must be exactly 6 digits.';
  return '';
};

export const validateOtp = (otp) => {
  if (!otp || otp.trim().length === 0) return 'OTP is required.';
  if (!/^\d{6}$/.test(otp)) return 'OTP must be exactly 6 digits.';
  return '';
};

import mongoose from 'mongoose';
const pendingSignupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, default: null },   
  phone: { type: String, required: true },
  googleId: { type: String, default: null },    
  otp: { type: String, required: true },
  otpExpires: { type: Date, required: true }
}, { timestamps: true });
export default mongoose.model('pendingSignup', pendingSignupSchema);


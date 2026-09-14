import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,     
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS  
  }
});

transporter.verify((error) => {
  if (error) {
    console.error('Email transporter error:', error.message);
  } else {
    console.log('Email transporter ready — emails will be sent via', process.env.EMAIL_USER);
  }
});

export default transporter;

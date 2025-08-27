// otpStore.js

const otpMap = new Map(); // Stores OTP and metadata in memory

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_LIMIT = 3; // Max resend attempts (reduced to 3)
const OTP_LOCK_MS = 24 * 60 * 60 * 1000; // 24 hours (increased from 12)

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit string
}

function storeOTP(email, otp) {
  const now = Date.now();

  otpMap.set(email, {
    otp,
    createdAt: now,
    attempts: 0,
    lastSent: now,
    lockedUntil: null,
  });
}

function verifyOTP(email, inputOtp) {
  const entry = otpMap.get(email);
  if (!entry) return false;

  const now = Date.now();

  // Check expired
  if (now - entry.createdAt > OTP_EXPIRY_MS) {
    otpMap.delete(email);
    return false;
  }

  // Check match
  return entry.otp === inputOtp;
}

function canSendOTP(email) {
  const entry = otpMap.get(email);

  if (!entry) return { canSend: true, message: null };

  const now = Date.now();

  // Check if user is locked due to too many attempts
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const hoursLeft = Math.ceil((entry.lockedUntil - now) / (1000 * 60 * 60));
    return { 
      canSend: false, 
      message: `You have reached the maximum number of OTP resend attempts. Try again after ${hoursLeft} hours and check your email trash.` 
    };
  }

  // Check if user has reached the limit
  if (entry.attempts >= OTP_LIMIT) {
    entry.lockedUntil = now + OTP_LOCK_MS;
    return { 
      canSend: false, 
      message: "You have reached the maximum number of OTP resend attempts. Try again after 24 hours and check your email trash." 
    };
  }

  return { canSend: true, message: null };
}

function incrementOTPAttempt(email) {
  const entry = otpMap.get(email);
  if (entry) {
    entry.attempts = (entry.attempts || 0) + 1;
  }
}

function resetOTP(email) {
  otpMap.delete(email);
}

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  canSendOTP,
  incrementOTPAttempt,
  resetOTP
};

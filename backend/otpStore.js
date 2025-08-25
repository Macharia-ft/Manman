// otpStore.js

const otpMap = new Map(); // Stores OTP and metadata in memory

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_LIMIT = 5; // Max resend attempts
const OTP_LOCK_MS = 12 * 60 * 60 * 1000; // 12 hours

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

  if (!entry) return true;

  const now = Date.now();

  if (entry.lockedUntil && now < entry.lockedUntil) {
    return false;
  }

  if (entry.attempts >= OTP_LIMIT) {
    entry.lockedUntil = now + OTP_LOCK_MS;
    return false;
  }

  return true;
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

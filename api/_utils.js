const crypto = require('crypto');

const AMOUNT_IN_PAISE = 14900;
const CURRENCY = 'INR';
const PRODUCT_ID = 'quick-symbols-lifetime-pro';
const PRODUCT_NAME = 'Quick Symbols';

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request body is too large.'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(statusCode === 204 ? '' : JSON.stringify(payload));
}

function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return true;
  }
  return false;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured.`);
  }
  return value;
}

function sign(value, secret) {
  return crypto.createHmac('sha256', secret).update(value).digest('hex');
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const expected = sign(`${orderId}|${paymentId}`, requireEnv('RAZORPAY_KEY_SECRET'));
  if (!signature || expected.length !== signature.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

function encodeBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function createLicense(payload) {
  const secret = process.env.LICENSE_SECRET || requireEnv('RAZORPAY_KEY_SECRET');
  const body = encodeBase64Url(JSON.stringify(payload));
  const signature = sign(body, secret);
  return `${body}.${signature}`;
}

function readLicense(license) {
  if (!license || !license.includes('.')) {
    throw new Error('Invalid license key.');
  }

  const secret = process.env.LICENSE_SECRET || requireEnv('RAZORPAY_KEY_SECRET');
  const [body, signature] = license.split('.');
  const expected = sign(body, secret);
  if (!signature || expected.length !== signature.length) {
    throw new Error('Invalid license signature.');
  }
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    throw new Error('Invalid license signature.');
  }

  return JSON.parse(decodeBase64Url(body));
}

async function razorpayRequest(path, options = {}) {
  const keyId = requireEnv('RAZORPAY_KEY_ID');
  const keySecret = requireEnv('RAZORPAY_KEY_SECRET');
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json();

  if (!response.ok) {
    const message = data?.error?.description || 'Razorpay request failed.';
    throw new Error(message);
  }

  return data;
}

function isPaidPayment(payment) {
  return payment
    && payment.currency === CURRENCY
    && payment.amount === AMOUNT_IN_PAISE
    && payment.status === 'captured';
}

function isFullyRefundedPayment(payment) {
  return Boolean(
    payment
    && (
      payment.status === 'refunded'
      || payment.refund_status === 'full'
      || payment.amount_refunded >= payment.amount
    )
  );
}

module.exports = {
  AMOUNT_IN_PAISE,
  CURRENCY,
  PRODUCT_ID,
  PRODUCT_NAME,
  createLicense,
  handleOptions,
  isFullyRefundedPayment,
  isPaidPayment,
  razorpayRequest,
  readJson,
  readLicense,
  sendJson,
  verifyRazorpaySignature
};

const {
  AMOUNT_IN_PAISE,
  CURRENCY,
  PRODUCT_ID,
  handleOptions,
  isFullyRefundedPayment,
  isPaidPayment,
  razorpayRequest,
  readJson,
  readLicense,
  sendJson
} = require('./_utils');

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const { license } = await readJson(req);
    const payload = readLicense(license);

    if (
      payload.product !== PRODUCT_ID
      || payload.amount !== AMOUNT_IN_PAISE
      || payload.currency !== CURRENCY
      || !payload.paymentId
      || !payload.orderId
    ) {
      sendJson(res, 400, { error: 'License is not valid for this product.' });
      return;
    }

    const payment = await razorpayRequest(`/payments/${payload.paymentId}`);
    if (payment.order_id !== payload.orderId) {
      sendJson(res, 400, { error: 'License payment does not match this order.' });
      return;
    }

    if (!isPaidPayment(payment)) {
      sendJson(res, 402, { error: 'Payment is not captured.' });
      return;
    }

    if (isFullyRefundedPayment(payment)) {
      sendJson(res, 402, { error: 'This payment has been refunded.' });
      return;
    }

    sendJson(res, 200, {
      pro: true,
      email: payload.email || '',
      issuedAt: payload.issuedAt || ''
    });
  } catch (error) {
    sendJson(res, 400, { error: error.message || 'License check failed.' });
  }
};

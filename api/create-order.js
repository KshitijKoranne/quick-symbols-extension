const {
  AMOUNT_IN_PAISE,
  CURRENCY,
  PRODUCT_ID,
  handleOptions,
  razorpayRequest,
  readJson,
  sendJson
} = require('./_utils');

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const { email } = await readJson(req);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendJson(res, 400, { error: 'Enter a valid email address.' });
      return;
    }

    const order = await razorpayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: AMOUNT_IN_PAISE,
        currency: CURRENCY,
        receipt: `qs_${Date.now()}`,
        notes: { email, product: PRODUCT_ID }
      })
    });

    sendJson(res, 200, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Could not create order.' });
  }
};

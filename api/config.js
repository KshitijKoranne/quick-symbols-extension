const { AMOUNT_IN_PAISE, CURRENCY, PRODUCT_NAME, handleOptions, sendJson } = require('./_utils');

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  sendJson(res, 200, {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    amount: AMOUNT_IN_PAISE,
    currency: CURRENCY,
    productName: `${PRODUCT_NAME} Lifetime Pro`
  });
};

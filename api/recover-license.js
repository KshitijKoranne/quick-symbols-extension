const {
  AMOUNT_IN_PAISE,
  CURRENCY,
  PRODUCT_ID,
  createLicense,
  handleOptions,
  isFullyRefundedPayment,
  isPaidPayment,
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
    const { email, paymentId, orderId } = await readJson(req);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sendJson(res, 400, { error: 'Enter the email used for payment.' });
      return;
    }
    if (!paymentId?.startsWith('pay_') || !orderId?.startsWith('order_')) {
      sendJson(res, 400, { error: 'Enter valid Razorpay payment and order IDs.' });
      return;
    }

    const payment = await razorpayRequest(`/payments/${paymentId}`);
    if (payment.order_id !== orderId) {
      sendJson(res, 400, { error: 'Payment does not match this order.' });
      return;
    }
    if (!isPaidPayment(payment)) {
      sendJson(res, 402, { error: 'Payment is not captured yet.' });
      return;
    }
    if (isFullyRefundedPayment(payment)) {
      sendJson(res, 402, { error: 'This payment has been refunded.' });
      return;
    }

    const order = await razorpayRequest(`/orders/${orderId}`);
    if (order.amount !== AMOUNT_IN_PAISE || order.currency !== CURRENCY || order.notes?.product !== PRODUCT_ID) {
      sendJson(res, 400, { error: 'Order does not match this product.' });
      return;
    }

    const orderEmail = order.notes?.email || payment.email || '';
    if (orderEmail && orderEmail !== email) {
      sendJson(res, 400, { error: 'Email does not match this payment.' });
      return;
    }

    const license = createLicense({
      email: orderEmail || email,
      orderId,
      paymentId,
      amount: AMOUNT_IN_PAISE,
      currency: CURRENCY,
      issuedAt: new Date().toISOString(),
      product: PRODUCT_ID
    });

    sendJson(res, 200, { license, email: orderEmail || email });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Could not recover license.' });
  }
};

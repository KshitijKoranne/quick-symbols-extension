const {
  AMOUNT_IN_PAISE,
  CURRENCY,
  PRODUCT_ID,
  createLicense,
  handleOptions,
  isPaidPayment,
  razorpayRequest,
  readJson,
  sendJson,
  verifyRazorpaySignature
} = require('./_utils');

module.exports = async function handler(req, res) {
  if (handleOptions(req, res)) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const {
      email,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    } = await readJson(req);

    if (!email || !orderId || !paymentId || !signature) {
      sendJson(res, 400, { error: 'Missing payment verification fields.' });
      return;
    }

    if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
      sendJson(res, 400, { error: 'Payment signature is invalid.' });
      return;
    }

    const payment = await razorpayRequest(`/payments/${paymentId}`);
    if (payment.order_id !== orderId) {
      sendJson(res, 400, { error: 'Payment does not match this order.' });
      return;
    }

    if (!isPaidPayment(payment)) {
      sendJson(res, 402, { error: 'Payment is not captured yet. Please try again in a minute.' });
      return;
    }

    const order = await razorpayRequest(`/orders/${orderId}`);
    if (order.amount !== AMOUNT_IN_PAISE || order.currency !== CURRENCY || order.notes?.product !== PRODUCT_ID) {
      sendJson(res, 400, { error: 'Order does not match this product.' });
      return;
    }

    const orderEmail = order.notes?.email || '';
    if (orderEmail && orderEmail !== email) {
      sendJson(res, 400, { error: 'Payment email does not match this order.' });
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
    sendJson(res, 500, { error: error.message || 'Could not verify payment.' });
  }
};

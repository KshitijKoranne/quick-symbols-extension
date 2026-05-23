const payButton = document.getElementById('pay');
const emailInput = document.getElementById('email');
const message = document.getElementById('message');
const licenseCard = document.getElementById('license-card');
const licenseText = document.getElementById('license');
const copyButton = document.getElementById('copy-license');
const paymentIdInput = document.getElementById('payment-id');
const orderIdInput = document.getElementById('order-id');
const recoverButton = document.getElementById('recover-license');

let checkoutConfig = null;

init();

async function init() {
  try {
    const response = await fetch('/api/config');
    checkoutConfig = await response.json();
    if (!checkoutConfig.keyId) {
      showMessage('Razorpay public key is not configured yet.');
      payButton.disabled = true;
    }
  } catch (error) {
    showMessage('Payment setup could not be loaded.');
    payButton.disabled = true;
  }
}

payButton.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage('Enter a valid email address.');
    return;
  }

  payButton.disabled = true;
  showMessage('Creating secure order...');

  try {
    const orderResponse = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      throw new Error(order.error || 'Could not create order.');
    }

    const checkout = new Razorpay({
      key: checkoutConfig.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'Quick Symbols',
      description: 'Lifetime Pro',
      order_id: order.orderId,
      prefill: { email },
      theme: { color: '#6366f1' },
      handler: async (paymentResult) => {
        await verifyPayment(email, paymentResult);
      }
    });

    checkout.on('payment.failed', (response) => {
      showMessage(response.error?.description || 'Payment failed.');
      payButton.disabled = false;
    });

    checkout.open();
  } catch (error) {
    showMessage(error.message || 'Payment could not start.');
    payButton.disabled = false;
  }
});

copyButton.addEventListener('click', async () => {
  await navigator.clipboard.writeText(licenseText.value);
  showMessage('License copied.');
});

recoverButton.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const paymentId = paymentIdInput.value.trim();
  const orderId = orderIdInput.value.trim();
  if (!email || !paymentId || !orderId) {
    showMessage('Enter email, payment ID, and order ID.');
    return;
  }

  recoverButton.disabled = true;
  showMessage('Checking captured payment...');

  try {
    const response = await fetch('/api/recover-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, paymentId, orderId })
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Could not recover license.');
    }

    licenseText.value = result.license;
    licenseCard.classList.remove('hidden');
    showMessage('License recovered. Copy your license key.');
  } catch (error) {
    showMessage(error.message || 'Could not recover license.');
  } finally {
    recoverButton.disabled = false;
  }
});

async function verifyPayment(email, paymentResult) {
  showMessage('Verifying payment...');

  const response = await fetch('/api/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...paymentResult })
  });
  const result = await response.json();
  if (!response.ok) {
    showMessage(result.error || 'Payment verification failed.');
    payButton.disabled = false;
    return;
  }

  licenseText.value = result.license;
  licenseCard.classList.remove('hidden');
  showMessage('Payment verified. Copy your license key.');
}

function showMessage(text) {
  message.textContent = text;
}

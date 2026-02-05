const LicenseManager = {
  // Check if user has pro access
  async isPro() {
    const data = await chrome.storage.local.get(['isPro']);
    return !!data.isPro;
  },

  // Validate license key with Gumroad API
  async validateLicense(key) {
    try {
      if (!key || key.length < 5) {
        throw new Error('Invalid license key format');
      }



      // Encode parameters for x-www-form-urlencoded
      const params = new URLSearchParams();
      // Use permalink instead of ID for potentially better matching
      params.append('product_permalink', CONFIG.GUMROAD_PERMALINK);
      params.append('license_key', key.trim());
      params.append('increment_uses_count', 'true');

      const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      const data = await response.json();

      if (!data.success) {
        // Handle specific error case for refunded/chargebacked
        if (data.purchase && (data.purchase.refunded || data.purchase.chargebacked)) {
          await this.deactivatePro();
          throw new Error('License has been refunded or disabled');
        }
        // Return Gumroad's specific error message if available, or fallback
        throw new Error(data.message || 'Invalid license key');
      }

      // Check if refunded even if success is true (edge case)
      if (data.purchase.refunded || data.purchase.chargebacked) {
         await this.deactivatePro();
         throw new Error('License has been refunded');
      }

      // Success! Activate pro
      await this.activatePro(key);
      return true;

    } catch (error) {
      console.error('License validation error:', error);
      throw error;
    }
  },

  // Activate pro status
  async activatePro(key) {
    await chrome.storage.local.set({
      isPro: true,
      licenseKey: key,
      activationDate: new Date().toISOString()
    });
  },

  // Deactivate pro status (for testing or refunds)
  async deactivatePro() {
    await chrome.storage.local.remove(['isPro', 'licenseKey', 'activationDate']);
  }
};

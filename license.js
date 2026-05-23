const LicenseManager = {
  async storageGet(defaults) {
    if (globalThis.chrome?.storage?.local) {
      return chrome.storage.local.get(defaults);
    }

    const result = {};
    Object.keys(defaults).forEach((key) => {
      const value = localStorage.getItem(key);
      result[key] = value ? JSON.parse(value) : defaults[key];
    });
    return result;
  },

  async storageSet(values) {
    if (globalThis.chrome?.storage?.local) {
      return chrome.storage.local.set(values);
    }

    Object.entries(values).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  },

  async storageRemove(keys) {
    if (globalThis.chrome?.storage?.local) {
      return chrome.storage.local.remove(keys);
    }

    keys.forEach((key) => localStorage.removeItem(key));
  },

  // Check if user has pro access
  async isPro() {
    const data = await this.storageGet({ licenseKey: '', licenseEntitlement: null });
    if (!data.licenseKey) return false;

    if (data.licenseEntitlement?.isPro) {
      return true;
    }

    try {
      await this.validateLicense(data.licenseKey);
      return true;
    } catch (error) {
      return false;
    }
  },

  getApiBaseUrl() {
    const apiBaseUrl = (CONFIG.API_BASE_URL || '').replace(/\/$/, '');
    if (!apiBaseUrl || apiBaseUrl.includes('your-vercel-project')) {
      return '';
    }
    return apiBaseUrl;
  },

  getUpgradeUrl() {
    return CONFIG.UPGRADE_URL || this.getApiBaseUrl();
  },

  // Validate license key with the Razorpay-backed license API
  async validateLicense(key) {
    try {
      if (!key || key.length < 5) {
        throw new Error('Invalid license key format');
      }

      const apiBaseUrl = this.getApiBaseUrl();
      if (!apiBaseUrl) {
        throw new Error('License server is not configured yet');
      }

      const response = await fetch(`${apiBaseUrl}/api/check-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license: key.trim() })
      });

      const data = await response.json();

      if (!response.ok || !data.pro) {
        await this.deactivatePro();
        throw new Error(data.error || 'Invalid license key');
      }

      await this.activatePro(key, data);
      return true;

    } catch (error) {
      console.error('License validation error:', error);
      throw error;
    }
  },

  // Activate pro status
  async activatePro(key, entitlement = {}) {
    await this.storageSet({
      licenseKey: key,
      licenseEntitlement: {
        isPro: true,
        email: entitlement.email || '',
        issuedAt: entitlement.issuedAt || ''
      },
      licenseLastCheckedAt: Date.now(),
      activationDate: new Date().toISOString()
    });
  },

  // Deactivate pro status (for testing or refunds)
  async deactivatePro() {
    await this.storageRemove(['isPro', 'licenseKey', 'licenseEntitlement', 'licenseLastCheckedAt', 'activationDate']);
  }
};

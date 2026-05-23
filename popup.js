// DOM Elements
const searchInput = document.getElementById('search-input');
const resultsGrid = document.getElementById('results-grid');
const recentGrid = document.getElementById('recent-grid');
const recentSection = document.getElementById('recent-section');
const toast = document.getElementById('toast');
const proBadge = document.getElementById('pro-badge');

// Monetization Elements
const upgradeModal = document.getElementById('upgrade-modal');
const licenseModal = document.getElementById('license-modal');
const upgradeBtn = document.getElementById('upgrade-btn');
const enterKeyBtn = document.getElementById('enter-key-btn');
const backToUpgradeBtn = document.getElementById('back-to-upgrade');
const activateBtn = document.getElementById('activate-btn');
const licenseInput = document.getElementById('license-input');
const licenseError = document.getElementById('license-error');
const closeButtons = document.querySelectorAll('.close-modal');

let symbolsData = [];
let recentSymbols = [];
let favoriteSymbols = [];
let selectedIndex = -1;
let isProUser = false;
let searchTimeout;

async function getLocalStorage(defaults) {
  if (globalThis.chrome?.storage?.local) {
    return chrome.storage.local.get(defaults);
  }

  const result = {};
  Object.keys(defaults).forEach((key) => {
    const value = localStorage.getItem(key);
    result[key] = value ? JSON.parse(value) : defaults[key];
  });
  return result;
}

async function setLocalStorage(values) {
  if (globalThis.chrome?.storage?.local) {
    return chrome.storage.local.set(values);
  }

  Object.entries(values).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });
}

function openExtensionUrl(url) {
  if (globalThis.chrome?.tabs?.create) {
    chrome.tabs.create({ url });
    return;
  }
  window.open(url, '_blank', 'noopener');
}

// Pastel colors for hover effect
const pastelColors = [
  '#FFD1DC', '#FFECB3', '#C1E1C1', '#B3E5FC', '#D1C4E9',
  '#F8BBD0', '#E1F5FE', '#F1F8E9', '#FFF9C4', '#FFE0B2',
  '#E0F2F1', '#F3E5F5', '#E8EAF6', '#FBE9E7', '#EFEBE9',
  '#DCEDC8', '#FFF9C4', '#B2EBF2', '#D1C4E9', '#F48FB1',
  '#CE93D8', '#90CAF9', '#A5D6A7', '#FFF59D', '#FFE082',
  '#BCAAA4', '#B0BEC5', '#FFCCBC', '#C5CAE9', '#C8E6C9'
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupMonetizationListeners();
  searchInput.focus();
});

async function loadData() {
  try {
    // Check Pro Status
    if (typeof LicenseManager !== 'undefined') {
      isProUser = await LicenseManager.isPro();
      updateProUI();
    }

    const response = await fetch('data/symbols.json');
    const data = await response.json();
    symbolsData = data.symbols;
    
    // Load recent and favorite symbols from storage
    const storage = await getLocalStorage({ recent: [], favorites: [] });
    recentSymbols = storage.recent || [];
    favoriteSymbols = storage.favorites || [];
    
    renderFavorites();
    renderRecent();
    renderResults(symbolsData);
  } catch (error) {
    console.error('Error loading symbols:', error);
  }
}

function updateProUI() {
  if (isProUser && proBadge) {
    proBadge.style.display = 'inline-block';
  }
}

function setupMonetizationListeners() {
  if (!upgradeBtn) return;

  // Upgrade Flow
  upgradeBtn.addEventListener('click', () => {
    const url = LicenseManager.getUpgradeUrl();
    if (!url) {
      licenseError.textContent = 'Payment page is not configured yet';
      licenseError.classList.add('visible');
      return;
    }
    openExtensionUrl(url);
  });

  enterKeyBtn.addEventListener('click', () => {
    upgradeModal.classList.add('hidden');
    licenseModal.classList.remove('hidden');
    licenseInput.focus();
  });

  backToUpgradeBtn.addEventListener('click', () => {
    licenseModal.classList.add('hidden');
    upgradeModal.classList.remove('hidden');
  });

  // License Activation
  activateBtn.addEventListener('click', handleActivation);
  
  licenseInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleActivation();
  });

  // Close Modals
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      upgradeModal.classList.add('hidden');
      licenseModal.classList.add('hidden');
      licenseError.classList.remove('visible');
    });
  });

  // Close on outside click
  window.addEventListener('click', (e) => {
    if (e.target === upgradeModal) upgradeModal.classList.add('hidden');
    if (e.target === licenseModal) licenseModal.classList.add('hidden');
  });
}

async function handleActivation() {
  const key = licenseInput.value;
  activateBtn.textContent = 'Verifying...';
  activateBtn.disabled = true;
  licenseError.classList.remove('visible');

  try {
    const isValid = await LicenseManager.validateLicense(key);
    if (isValid) {
      isProUser = true;
      updateProUI();
      licenseModal.classList.add('hidden');
      
      // Auto-focus search after success
      searchInput.focus();
      
      // Show success toast
      toast.textContent = 'Pro Unlocked! 🚀';
      showToast();
      
      // Reset toast text after delay
      setTimeout(() => { toast.textContent = 'Copied ✓'; }, 2500);
      
      // Re-render to unlock symbols
      renderResults(getCurrentResults());
      renderFavorites();
      renderRecent();
    }
  } catch (error) {
    licenseError.textContent = error.message || 'Invalid license key';
    licenseError.classList.add('visible');
  } finally {
    activateBtn.textContent = 'Activate Pro';
    activateBtn.disabled = false;
  }
}

function createSymbolItem(symbolData) {
  const isFavorite = favoriteSymbols.some(s => s.symbol === symbolData.symbol);
  
  // Monetization Check
  const isLocked = symbolData.tier === 'pro' && !isProUser;
  
  const item = document.createElement('div');
  item.className = `symbol-item ${isLocked ? 'locked' : ''}`;
  item.tabIndex = 0;
  
  // Update random color on every hover or focus (only if unlocked)
  if (!isLocked) {
    const randomizeColor = () => {
      const randomColor = pastelColors[Math.floor(Math.random() * pastelColors.length)];
      item.style.setProperty('--hover-color', randomColor);
    };
    item.addEventListener('mouseenter', randomizeColor);
    item.addEventListener('focus', randomizeColor);
  }

  // Add lock icon if locked
  if (isLocked) {
    const lockIcon = document.createElement('span');
    lockIcon.className = 'lock-icon';
    lockIcon.textContent = '🔒';
    item.appendChild(lockIcon);
  }
  
  const charSpan = document.createElement('span');
  charSpan.className = 'symbol-char';
  charSpan.textContent = symbolData.symbol;
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'symbol-name';
  nameSpan.textContent = symbolData.name;
  
  // Only show favorite button if NOT locked
  if (!isLocked) {
    const favBtn = document.createElement('button');
    favBtn.className = `favorite-btn ${isFavorite ? 'active' : ''}`;
    favBtn.title = 'Favorite';
    favBtn.textContent = '★';
    item.appendChild(favBtn);
    
    favBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavorite(symbolData);
    });
  }
  
  item.appendChild(charSpan);
  item.appendChild(nameSpan);
  
  item.addEventListener('click', (e) => {
    if (isLocked) {
      upgradeModal.classList.remove('hidden');
    } else {
      if (!e.target.classList.contains('favorite-btn')) {
        copyToClipboard(symbolData);
      }
    }
  });
  
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isLocked) {
        upgradeModal.classList.remove('hidden');
      } else {
        copyToClipboard(symbolData);
      }
    }
  });
  
  return item;
}

function renderResults(results) {
  resultsGrid.innerHTML = '';
  selectedIndex = -1;
  const fragment = document.createDocumentFragment();
  
  results.forEach((symbol) => {
    const item = createSymbolItem(symbol);
    fragment.appendChild(item);
  });
  
  resultsGrid.appendChild(fragment);
}

function renderRecent() {
  if (recentSymbols.length === 0) {
    recentSection.classList.add('hidden');
    return;
  }
  
  recentSection.classList.remove('hidden');
  recentGrid.innerHTML = '';
  recentSymbols.forEach((symbol) => {
    const item = createSymbolItem(symbol);
    recentGrid.appendChild(item);
  });
}

function renderFavorites() {
  const favoriteSection = document.getElementById('favorite-section');
  const favoriteGrid = document.getElementById('favorite-grid');
  
  if (favoriteSymbols.length === 0) {
    favoriteSection.classList.add('hidden');
    return;
  }
  
  favoriteSection.classList.remove('hidden');
  favoriteGrid.innerHTML = '';
  favoriteSymbols.forEach((symbol) => {
    const item = createSymbolItem(symbol);
    favoriteGrid.appendChild(item);
  });
}

async function toggleFavorite(symbolData) {
  const index = favoriteSymbols.findIndex(s => s.symbol === symbolData.symbol);
  if (index === -1) {
    favoriteSymbols.push(symbolData);
  } else {
    favoriteSymbols.splice(index, 1);
  }
  
  await setLocalStorage({ favorites: favoriteSymbols });
  renderFavorites();
  renderRecent();
  renderResults(getCurrentResults());
}

function getCurrentResults() {
  const query = searchInput.value.toLowerCase().trim();
  if (!query) return symbolsData;
  return symbolsData.filter(symbol => {
    return symbol.name.toLowerCase().includes(query) || 
           symbol.aliases.some(alias => alias.toLowerCase().includes(query)) ||
           symbol.category.toLowerCase().includes(query);
  });
}

async function copyToClipboard(symbolData) {
  try {
    await navigator.clipboard.writeText(symbolData.symbol);
    showToast();
    updateRecent(symbolData);
    
    // Auto-close popup after copy
    setTimeout(() => window.close(), 800);
  } catch (err) {
    console.error('Failed to copy!', err);
  }
}

function showToast() {
  toast.classList.remove('hidden');
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 1000);
}

async function updateRecent(symbolData) {
  // Remove if already exists
  recentSymbols = recentSymbols.filter(s => s.symbol !== symbolData.symbol);
  // Add to front
  recentSymbols.unshift(symbolData);
  // Limit to 10
  recentSymbols = recentSymbols.slice(0, 10);
  
  await setLocalStorage({ recent: recentSymbols });
  renderRecent();
}

// Search logic with simple debounce
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
      renderResults(symbolsData);
      return;
    }
    
    const filtered = symbolsData.filter(symbol => {
      return symbol.name.toLowerCase().includes(query) || 
             symbol.aliases.some(alias => alias.toLowerCase().includes(query)) ||
             symbol.category.toLowerCase().includes(query);
    });
    
    renderResults(filtered);
  }, 100);
});

// Keyboard navigation
window.addEventListener('keydown', (e) => {
  // If modal is open, handle escape
  if (!upgradeModal.classList.contains('hidden') || !licenseModal.classList.contains('hidden')) {
    if (e.key === 'Escape') {
      upgradeModal.classList.add('hidden');
      licenseModal.classList.add('hidden');
    }
    return;
  }

  const items = Array.from(document.querySelectorAll('.symbol-item'));
  if (items.length === 0) return;

  if (e.key === 'ArrowRight') {
    selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
    updateSelection(items);
    e.preventDefault();
  } else if (e.key === 'ArrowLeft') {
    selectedIndex = Math.max(selectedIndex - 1, 0);
    updateSelection(items);
    e.preventDefault();
  } else if (e.key === 'ArrowDown') {
    if (selectedIndex === -1) {
      selectedIndex = 0;
    } else {
      selectedIndex = Math.min(selectedIndex + 3, items.length - 1);
    }
    updateSelection(items);
    e.preventDefault();
  } else if (e.key === 'ArrowUp') {
    if (selectedIndex !== -1) {
      selectedIndex = Math.max(selectedIndex - 3, 0);
      updateSelection(items);
      e.preventDefault();
    }
  } else if (e.key === 'Enter' && selectedIndex !== -1) {
    items[selectedIndex].click();
  } else if (e.key === 'Escape') {
    window.close();
  }
});

function updateSelection(items) {
  items.forEach(item => item.classList.remove('selected'));
  if (selectedIndex !== -1) {
    items[selectedIndex].classList.add('selected');
    items[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    items[selectedIndex].focus();
  }
}

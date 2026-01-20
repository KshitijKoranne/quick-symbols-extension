let symbolsData = [];
let recentSymbols = [];
let favoriteSymbols = [];
let selectedIndex = -1;

const pastelColors = [
  '#FFD1DC', '#FFECB3', '#C1E1C1', '#B3E5FC', '#D1C4E9',
  '#F8BBD0', '#E1F5FE', '#F1F8E9', '#FFF9C4', '#FFE0B2',
  '#E0F2F1', '#F3E5F5', '#E8EAF6', '#FBE9E7', '#EFEBE9',
  '#DCEDC8', '#FFF9C4', '#B2EBF2', '#D1C4E9', '#F48FB1',
  '#CE93D8', '#90CAF9', '#A5D6A7', '#FFF59D', '#FFE082',
  '#BCAAA4', '#B0BEC5', '#FFCCBC', '#C5CAE9', '#C8E6C9'
];

const searchInput = document.getElementById('search-input');
const resultsGrid = document.getElementById('results-grid');
const recentGrid = document.getElementById('recent-grid');
const recentSection = document.getElementById('recent-section');
const toast = document.getElementById('toast');

// Load symbols data
async function loadData() {
  try {
    const response = await fetch('data/symbols.json');
    const data = await response.json();
    symbolsData = data.symbols;
    
    // Load recent and favorite symbols from storage
    const storage = await chrome.storage.local.get(['recent', 'favorites']);
    recentSymbols = storage.recent || [];
    favoriteSymbols = storage.favorites || [];
    
    renderFavorites();
    renderRecent();
    renderResults(symbolsData);
  } catch (error) {
    console.error('Error loading symbols:', error);
  }
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

function renderResults(results) {
  resultsGrid.innerHTML = '';
  selectedIndex = -1;
  
  results.forEach((symbol) => {
    const item = createSymbolItem(symbol);
    resultsGrid.appendChild(item);
  });
}

function createSymbolItem(symbolData) {
  const isFavorite = favoriteSymbols.some(s => s.symbol === symbolData.symbol);
  const item = document.createElement('div');
  item.className = 'symbol-item';
  item.tabIndex = 0;
  
  // Update random color on every hover or focus
  const randomizeColor = () => {
    const randomColor = pastelColors[Math.floor(Math.random() * pastelColors.length)];
    item.style.setProperty('--hover-color', randomColor);
  };
  
  item.addEventListener('mouseenter', randomizeColor);
  item.addEventListener('focus', randomizeColor);
  
  // Use textContent to prevent XSS
  const charSpan = document.createElement('span');
  charSpan.className = 'symbol-char';
  charSpan.textContent = symbolData.symbol;
  
  const nameSpan = document.createElement('span');
  nameSpan.className = 'symbol-name';
  nameSpan.textContent = symbolData.name;
  
  const favBtn = document.createElement('button');
  favBtn.className = `favorite-btn ${isFavorite ? 'active' : ''}`;
  favBtn.title = 'Favorite';
  favBtn.textContent = '★';
  
  item.appendChild(charSpan);
  item.appendChild(nameSpan);
  item.appendChild(favBtn);
  
  item.addEventListener('click', (e) => {
    if (e.target.classList.contains('favorite-btn')) {
      toggleFavorite(symbolData);
    } else {
      copyToClipboard(symbolData);
    }
  });
  
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      copyToClipboard(symbolData);
    }
  });
  
  return item;
}

async function toggleFavorite(symbolData) {
  const index = favoriteSymbols.findIndex(s => s.symbol === symbolData.symbol);
  if (index === -1) {
    favoriteSymbols.push(symbolData);
  } else {
    favoriteSymbols.splice(index, 1);
  }
  
  await chrome.storage.local.set({ favorites: favoriteSymbols });
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
  
  await chrome.storage.local.set({ recent: recentSymbols });
  renderRecent();
}

// Search logic with simple debounce
let searchTimeout;
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

// Focus search input on load
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  searchInput.focus();
});

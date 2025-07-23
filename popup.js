// popup.js - Extension popup interface

class PopupInterface {
  constructor() {
    this.autoMode = true;
    this.currentColors = null;
    this.init();
  }

  init() {
    // Get DOM elements
    this.statusEl = document.getElementById('status');
    this.statusMessageEl = document.getElementById('status-message');
    this.refreshBtn = document.getElementById('refresh-btn');
    this.toggleAutoBtn = document.getElementById('toggle-auto');
    this.colorPreviewEl = document.getElementById('color-preview');
    this.filePathEl = document.getElementById('file-path');
    this.lastUpdateEl = document.getElementById('last-update');

    // Setup event listeners
    this.refreshBtn.addEventListener('click', () => this.refreshColors());
    this.toggleAutoBtn.addEventListener('click', () => this.toggleAutoMode());

    // Load initial state
    this.loadStoredState();
    this.refreshColors();
  }

  async loadStoredState() {
    try {
      const result = await browser.storage.local.get(['autoMode', 'lastColors', 'lastUpdate']);
      
      this.autoMode = result.autoMode !== false; // Default to true
      this.updateAutoButton();
      
      if (result.lastColors) {
        this.displayColors(result.lastColors);
      }
      
      if (result.lastUpdate) {
        this.lastUpdateEl.textContent = `Updated: ${new Date(result.lastUpdate).toLocaleString()}`;
      }
    } catch (error) {
      console.error('Failed to load stored state:', error);
    }
  }

  async refreshColors() {
    this.setStatus('connecting', 'Refreshing...');
    
    try {
      // Send message to background script to refresh colors
      const response = await browser.runtime.sendMessage({ action: 'refreshColors' });
      
      if (response && response.success) {
        this.setStatus('connected', 'Connected');
        this.displayColors(response.colors);
        this.filePathEl.textContent = response.filePath || 'Colors loaded';
        this.lastUpdateEl.textContent = `Updated: ${new Date().toLocaleString()}`;
        
        // Store the update
        await browser.storage.local.set({
          lastColors: response.colors,
          lastUpdate: Date.now()
        });
      } else {
        this.setStatus('disconnected', response?.error || 'Failed to load colors');
      }
    } catch (error) {
      this.setStatus('disconnected', `Error: ${error.message}`);
    }
  }

  async toggleAutoMode() {
    this.autoMode = !this.autoMode;
    this.updateAutoButton();
    
    // Store the preference
    await browser.storage.local.set({ autoMode: this.autoMode });
    
    // Send to background script
    browser.runtime.sendMessage({ 
      action: 'setAutoMode', 
      enabled: this.autoMode 
    });
  }

  updateAutoButton() {
    this.toggleAutoBtn.textContent = `Auto: ${this.autoMode ? 'ON' : 'OFF'}`;
    this.toggleAutoBtn.style.backgroundColor = this.autoMode ? '#e8f5e8' : '#ffeaa7';
  }

  setStatus(type, message) {
    this.statusEl.className = `status ${type}`;
    this.statusMessageEl.textContent = message;
  }

  displayColors(colors) {
    if (!colors) return;
    
    this.currentColors = colors;
    this.colorPreviewEl.style.display = 'grid';
    this.colorPreviewEl.innerHTML = '';
    
    // Show key Material Design colors
    const keyColors = [
      'primary',
      'secondary', 
      'surface',
      'background',
      'on_primary',
      'on_secondary',
      'on_surface',
      'on_background'
    ];
    
    keyColors.forEach(colorKey => {
      if (colors[colorKey]) {
        const colorItem = document.createElement('div');
        colorItem.className = 'color-item';
        
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.backgroundColor = colors[colorKey];
        
        const label = document.createElement('span');
        label.textContent = colorKey.replace('_', ' ');
        
        colorItem.appendChild(swatch);
        colorItem.appendChild(label);
        this.colorPreviewEl.appendChild(colorItem);
      }
    });
    
    // Add click handler to copy color values
    this.colorPreviewEl.addEventListener('click', (e) => {
      const colorItem = e.target.closest('.color-item');
      if (colorItem) {
        const colorValue = colorItem.querySelector('.color-swatch').style.backgroundColor;
        navigator.clipboard.writeText(colorValue).then(() => {
          // Show brief feedback
          const originalText = colorItem.querySelector('span').textContent;
          colorItem.querySelector('span').textContent = 'Copied!';
          setTimeout(() => {
            colorItem.querySelector('span').textContent = originalText;
          }, 1000);
        });
      }
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupInterface();
});
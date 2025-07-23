// background.js - Main extension logic

class MaterialColorSync {
  constructor() {
    this.port = null;
    this.currentTheme = null;
    this.pollInterval = 2000; // Check for changes every 2 seconds
    this.init();
  }

  init() {
    // Start native messaging connection
    this.connectNativeApp();
    
    // Set up periodic checking
    this.startPeriodicCheck();
    
    // Listen for manual refresh requests
    browser.browserAction.onClicked.addListener(() => {
      this.refreshTheme();
    });
  }

  connectNativeApp() {
    try {
      this.port = browser.runtime.connectNative("material_color_reader");
      
      this.port.onMessage.addListener((response) => {
        if (response.success && response.colors) {
          this.applyMaterialTheme(response.colors);
        } else {
          console.error("Failed to read colors:", response.error);
        }
      });

      this.port.onDisconnect.addListener(() => {
        console.log("Native app disconnected");
        // Retry connection after delay
        setTimeout(() => this.connectNativeApp(), 5000);
      });
    } catch (error) {
      console.error("Failed to connect to native app:", error);
    }
  }

  startPeriodicCheck() {
    setInterval(() => {
      this.refreshTheme();
    }, this.pollInterval);
  }

  refreshTheme() {
    if (this.port) {
      this.port.postMessage({ action: "getColors" });
    }
  }

  applyMaterialTheme(materialColors) {
    const firefoxTheme = this.convertMaterialToFirefox(materialColors);
    
    // Only apply if theme has changed
    const themeHash = JSON.stringify(firefoxTheme);
    if (themeHash !== this.currentTheme) {
      browser.theme.update(firefoxTheme);
      this.currentTheme = themeHash;
      console.log("Theme updated with new Material colors");
    }
  }

  convertMaterialToFirefox(colors) {
    return {
      colors: {
        // Main browser chrome
        frame: colors.primary || '#6750a4',
        frame_inactive: colors.surface_variant || '#e7e0ec',
        
        // Toolbar
        toolbar: colors.surface_container || '#f3edf7',
        toolbar_text: colors.on_surface || '#1d1b20',
        toolbar_field: colors.surface_container_high || '#ece6f0',
        toolbar_field_text: colors.on_surface || '#1d1b20',
        toolbar_field_border: colors.outline || '#79747e',
        toolbar_field_focus: colors.surface_container_highest || '#e6e0e9',
        
        // Tabs
        tab_background_text: colors.on_surface_variant || '#49454f',
        tab_text: colors.on_surface || '#1d1b20',
        tab_line: colors.primary || '#6750a4',
        tab_loading: colors.primary || '#6750a4',
        
        // Buttons and UI elements
        button_background_hover: colors.secondary_container || '#e8def8',
        button_background_active: colors.secondary || '#625b71',
        
        // Popups and menus
        popup: colors.surface_container || '#f3edf7',
        popup_text: colors.on_surface || '#1d1b20',
        popup_border: colors.outline_variant || '#cac4d0',
        popup_highlight: colors.secondary_container || '#e8def8',
        popup_highlight_text: colors.on_secondary_container || '#1e192b',
        
        // Sidebar
        sidebar: colors.surface || '#fef7ff',
        sidebar_text: colors.on_surface || '#1d1b20',
        sidebar_border: colors.outline_variant || '#cac4d0',
        
        // Icons and accents
        icons: colors.on_surface_variant || '#49454f',
        icons_attention: colors.primary || '#6750a4',
        
        // Special states
        bookmark_text: colors.on_surface || '#1d1b20',
        toolbar_bottom_separator: colors.outline_variant || '#cac4d0',
        toolbar_top_separator: colors.outline_variant || '#cac4d0'
      },
      
      properties: {
        color_scheme: this.isDarkTheme(colors) ? 'dark' : 'light',
        content_color_scheme: this.isDarkTheme(colors) ? 'dark' : 'light'
      }
    };
  }

  isDarkTheme(colors) {
    // Simple heuristic: if surface is dark, assume dark theme
    const surface = colors.surface || '#ffffff';
    const rgb = this.hexToRgb(surface);
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }
}

// Initialize the extension
const materialSync = new MaterialColorSync();
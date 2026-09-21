import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  manifest: {
    name: 'Code Anatomy',
    description: 'Select any element to inspect its HTML, CSS, events, and get an AI-powered explanation.',
    permissions: ['sidePanel', 'storage', 'activeTab', 'scripting', 'contextMenus'],
    host_permissions: ['https://generativelanguage.googleapis.com/*'],
    icons: {
      16: '/icon-16.png',
      32: '/icon-32.png',
      48: '/icon-48.png',
      128: '/icon-128.png',
    },
    action: {
      default_icon: {
        16: '/icon-16.png',
        32: '/icon-32.png',
        48: '/icon-48.png',
      },
    },
    commands: {
      'activate-picker': {
        suggested_key: {
          default: 'Alt+C',
          mac: 'MacCtrl+C',
        },
        description: 'Activate Code Anatomy Picker',
      },
    },
    side_panel: {
      default_path: 'sidepanel/index.html',
    },
    sidebar_action: {
      default_panel: 'sidepanel/index.html',
      default_title: 'Code Anatomy',
      open_at_install: false,
    },
  },
  manifestVersion: 3,
});

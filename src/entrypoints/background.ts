import { browser } from 'wxt/browser';

export default defineBackground(() => {
  // Initialize context menu
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: 'inspect-code-anatomy',
      title: 'Inspect with Code Anatomy',
      contexts: ['all'],
    });
  });

  // Handle context menu clicks
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'inspect-code-anatomy' && tab?.id) {
      browser.tabs.sendMessage(tab.id, { type: 'INSPECT_CONTEXT_ELEMENT' }).catch(() => {});
    }
  });

  // Handle keyboard shortcuts
  browser.commands.onCommand.addListener((command, tab) => {
    if (command === 'activate-picker' && tab?.id) {
      browser.tabs.sendMessage(tab.id, { type: 'ACTIVATE_PICKER' }).catch(() => {});
    }
  });

  // Handle extension icon click → activate picker on the active tab
  browser.action.onClicked.addListener(async (tab) => {
    if (tab?.id) {
      browser.tabs.sendMessage(tab.id, { type: 'ACTIVATE_PICKER' }).catch(() => {});
    }
  });
  let lastSelectedElement: any = null;

  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'OPEN_PANEL' && sender.tab?.id) {
      // Open the side panel. This works because the message was sent synchronously 
      // from a user gesture (click) in the content script.
      if ((browser as any).sidePanel) {
        (browser as any).sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
      }
    } else if (msg.type === 'ELEMENT_SELECTED') {
      lastSelectedElement = msg.payload;
    } else if (msg.type === 'GET_LAST_SELECTED') {
      sendResponse({ payload: lastSelectedElement });
    }
  });
});

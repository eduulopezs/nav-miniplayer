chrome.action.onClicked.addListener((tab) => {
  if (tab.id == null) return;
  chrome.tabs.sendMessage(tab.id, { type: 'toggle' }).catch(() => {});
});

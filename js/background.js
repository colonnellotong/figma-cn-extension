chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(error => console.warn('FigmaCN could not initialize the side panel:', error.message));

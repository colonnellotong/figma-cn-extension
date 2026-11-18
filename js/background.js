chrome.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(error => console.warn('FigmaCN could not initialize the side panel:', error.message));

chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' })
  .catch(() => console.warn('FigmaCN could not restrict extension storage access.'));

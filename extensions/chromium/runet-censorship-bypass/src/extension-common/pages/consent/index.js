'use strict';

chrome.runtime.getBackgroundPage( (backgroundPage) =>
  backgroundPage.apis.errorHandlers.installListenersOn(
    window, 'CONSENT', () => {
      agreeBtn.onclick = () =>
        backgroundPage.apis.consent.give();
      rejectBtn.onclick = () =>
        chrome.management.uninstallSelf();
    },
  ),
);

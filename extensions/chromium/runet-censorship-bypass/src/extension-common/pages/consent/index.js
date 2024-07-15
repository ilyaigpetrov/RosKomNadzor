'use strict';

chrome.runtime.getBackgroundPage( (backgroundPage) =>
  backgroundPage.apis.errorHandlers.installListenersOn(
    window, 'CONSENT', () => {
      agreeBtn.onclick = () => {
        backgroundPage.apis.consent.give();
        window.close();
      }
      rejectBtn.onclick = () =>
        chrome.management.uninstallSelf();
    },
  ),
);

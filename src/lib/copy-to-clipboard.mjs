let IF_ALREADY_PROMISE; // A global promise to avoid concurrency issues.
const OFFSCREEN_DOC_PATH = '/src/lib/offscreen-doc-for-copying.html';

export const copyToClipboardAsync = async (copyMe) => {
  console.log('Going to copy this url:', copyMe);
  try {
    console.log('Trying `navigator.clipboard`...');
    return await navigator.clipboard.writeText(copyMe);
  } catch(e) {
    console.log('Got error while copying attempt:', e);
    if (globalThis.document) {
      console.log('Trying `globalThis.document`...');
      const area = document.createElement('textarea');
      area.value = copyMe;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      return;
    }
    console.log('Trying `chrome.offscreen`...');

    async function setupOffscreenDocument(path) {
      // Check all windows controlled by the service worker to see if one
      // of them is the offscreen document with the given path
      const offscreenUrl = chrome.runtime.getURL(path);
      const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl],
      });
      console.log('Existing contexts:', existingContexts);

      if (existingContexts.length > 0) {
        console.log('Offscreen document already exists.');
        return;
      }

      // create offscreen document
      if (IF_ALREADY_PROMISE) {
        return IF_ALREADY_PROMISE;
      }
      console.log('Creating new offscreen document for:', path);
      IF_ALREADY_PROMISE = chrome.offscreen.createDocument({
        url: path,
        reasons: [chrome.offscreen.Reason.CLIPBOARD],
        justification: 'reason for needing the document',
      });
      await IF_ALREADY_PROMISE;
      console.log('New offscreen document created.');
      IF_ALREADY_PROMISE = null;
    }
    await setupOffscreenDocument(OFFSCREEN_DOC_PATH);
    // Now that we have an offscreen document, we can dispatch the
    // message.
    chrome.runtime.sendMessage({
      type: 'copy-data-to-clipboard',
      target: 'offscreen-doc',
      data: copyMe,
    });
  }
};
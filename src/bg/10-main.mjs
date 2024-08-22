import { storage } from '../lib/index.mjs';

console.log('Main script starts...');

(async () => {
  const theState = await storage.getAsync();
  console.log('The state is:', theState);
})();

/*
const ID_TO_MENU_HANDLER = {};

const createMenuEntry = (id, type, title, handler, contexts, rest) => {
  ID_TO_MENU_HANDLER[id] = handler;
  console.log('Registered handler for', id);

  chrome.contextMenus.create({
    id,
    type,
    title,
    contexts,
    ...rest,
  }, () => {
    if (chrome.runtime.lastError) {
      // Suppress menus recreation.
    }
  });
};

const copyUrlInstalledPromise = (async () => {
  console.log('Main waits for migrations...');
  await globalThis.migrationPromise;
  console.log('Migration is finished.');

  const options = await storage.getAsync('options');

  // CheckBoxes
  const capitalizeFirstLetter = (str) => str
    .replace(
      /^./g,
      (firstLetter) => firstLetter.toUpperCase(),
    );

  options.forEach(([ key, value ], i) =>
    createMenuEntry(key, 'checkbox',
      chrome.i18n.getMessage(capitalizeFirstLetter(key)),
      (info) => {
        options[i] = [ key, info.checked ]; // Ordered.
        storage.setAsync({ options });
      },
      ['action'],
      {
        checked: value === true,
      },
    ),
  );
  // /CheckBoxes

  createMenuEntry('copyUrlFromTheAddressBar', 'normal',
    chrome.i18n.getMessage('CopyUrlFromTheAddressBar'),
    ({ pageUrl }) => copyUrl(pageUrl),
    ['page'],
  );

  createMenuEntry('donate', 'normal',
    chrome.i18n.getMessage('Donate'),
    async (info) => {
      chrome.tabs.create({ url: await storage.getAsync('donateUrl') });
    },
    ['action'],
  );

  createMenuEntry('copyUrl', 'normal',
    chrome.i18n.getMessage('CopyUnicodeUrl'),
    (info) => copyUrl(
      info.linkUrl ||
      info.srcUrl ||
      info.frameUrl ||
      info.selectionText ||
      info.pageUrl // Needed?
    ),
    ['link', 'image', 'video', 'audio', 'frame', 'selection'],
  );

  createMenuEntry(
    'copyHighlightLink', 'normal',
    chrome.i18n.getMessage('CopyUnicodeLinkToHighlight'),
    (info) => {
      copyUrl(`${info.pageUrl.replace(/#.*\/g, '')}#:~:text=${info.selectionText}`);
    },
    ['selection'],
  );

  return Promise.resolve();

})();

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const result = await copyUrlInstalledPromise;
  console.log('Promise resolved to:', result);
  const id = info.menuItemId;
  console.log('ALL THE LISTENERS:', Object.keys(ID_TO_MENU_HANDLER));
  const handler = ID_TO_MENU_HANDLER[id];
  console.log(`Here is the handler for ${id} w/ 'info':`, handler, info);
  if (handler) {
    handler(info);
  }
});

chrome.action.onClicked.addListener(async ({ url: urlToBeCopied }) => {
  console.log('Main waits for listeners to be installed...');
  const copyUrl = await copyUrlInstalledPromise;
  console.log('Action clicked with url:', urlToBeCopied);
  //copyUrl(urlToBeCopied);
});
*/
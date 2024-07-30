import { toUnicode } from '../../node_modules/punycode/punycode.es6.js';
import { copyToClipboardAsync } from '../lib/copy-to-clipboard.mjs';
import { storage } from '../lib/index.mjs';

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
  const getOpt = (key) => (options.find((el) => el[0] === key)[1]);
  console.log('Options are:', options);

  const localizeUrl = (url) => {
    console.log('Localizing url:', url);
    let u;
    try {
      u = new URL(url);
    } catch {
      u = new URL(`http://${url}`);
    }
    let newHref = u.href;
    let oldHref;
    do {
      oldHref = newHref;
      newHref = decodeURI(
        newHref
          .replace(u.hostname, toUnicode(u.hostname))
          /*
            Don't decode `%25` to `%` because it causes errors while being put in GitHub URLs.
            Test case: https://github.com/ilyaigpetrov/copy-unicode-urls/wiki/Test-%25-and-%3F
          */
          .replaceAll('%25', '%2525'),
      )
      // Encode whitespace.
      .replace(
        /\s/g,
        (_, index, wholeString) => encodeURIComponent(wholeString.charAt(index)),
      );
    } while (getOpt('ifToDecodeMultipleTimes') && oldHref !== newHref);
    console.log('Localized:', newHref);
    return newHref;
  };

  const copyUrl = async (url) => {
    if (getOpt('ifToDecode')) {
      url = localizeUrl(url);
    }
    if (getOpt('ifToEncodeUrlTerminators')) {
      console.log('Encoding terminators...');
      /*
        Issue #7.
        Thunderbird sources:
        https://searchfox.org/comm-central/source/mozilla/netwerk/streamconv/converters/mozTXTToHTMLConv.cpp#281 (mozTXTToHTMLConv::FindURLEnd)
        These chars terminate the URL: ><"`}{)]`
        These sequence doesn't terminate the URL: //[ (e.g. http://[1080::...)
        These chars are not allowed at the end of the URL: .,;!?-:'
        I apply slightly more strict rules below.
      **/
      const toPercentCode = (char) => '%' + char.charCodeAt(0).toString(16).toUpperCase();
      url = url.replace(
        /(?:[<>{}()[\]"`']|[.,;:!?-]$)/g,
        (matchedChar, index, wholeString) => toPercentCode(matchedChar),
      );
    }
    copyToClipboardAsync(url);
  };

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
      copyUrl(`${info.pageUrl.replace(/#.*/g, '')}#:~:text=${info.selectionText}`);
    },
    ['selection'],
  );

  return copyUrl;

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
  copyUrl(urlToBeCopied);
});
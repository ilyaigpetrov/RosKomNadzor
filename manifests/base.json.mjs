export const render = ({ version, edition }) => {
  let localizedSuffix;
  switch (edition) {
    case 'main':
      localizedSuffix = '';
      break;
    case 'test':
      localizedSuffix = ` __MSG_FOR_TESTING__`;
      break;
    default:
      throw new TypeError(`Edition type ${edition} is unknown.`);
  }
  return {
    "manifest_version": 3,

    "default_locale": "en",
    "name": `__MSG_ExtensionName__${localizedSuffix}`,
    "version": `${version}`,
    "description": "__MSG_ExtensionDescription__",
    "homepage_url": "https://github.com/anticensority/runet-censorship-bypass",
    "icons": {
      "128": "/icons/default-128.png"
    },
    "author": "anticensority+owners@googlegroups.com",
    "permissions": [
      "activeTab"
      , "contextMenus"
      , "storage"
      , "clipboardWrite"
    ],
      
    "action": {
      "default_title":
        `__MSG___ | __MSG_Version__: ${version + localizedSuffix}`,
      "default_popup": "/src/pages/options/index.html"
    },
    "options_ui": {
      "page": "/src/pages/options/index.html"
    },
    "commands": {
      "_execute_action": {
        "suggested_key": {
          "default": "Alt+P"
        }
      }
    }
  };
};
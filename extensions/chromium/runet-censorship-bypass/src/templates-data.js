'use strict';

const pacUrls = [
  // GitHub.io (anticensority), cached:
  'https://anticensority.github.io/generated-pac-scripts/anticensority.pac',
  // GitHub repo (anticensority), cached:
  'https://raw.githubusercontent.com/anticensority/generated-pac-scripts/master/anticensority.pac',
];

const commonContext = {
  version: '1.64',
  anticensorityPacUrls: [
    ...pacUrls,
  ],
};

exports.contexts = {};

const  extra_permissions = ', "webRequest", "webRequestBlocking", "webNavigation"';

exports.contexts.full = Object.assign({}, commonContext, {
  versionSuffix: '',
  nameSuffixEn: '',
  nameSuffixRu: '',
  extra_permissions,
  persistent: '',
  scripts_0x: '',
  scripts_2x: ', "20-ip-to-host-api.js"',
  scripts_8x: ', "80-error-menu.js", "83-last-errors.js", "85-block-informer.js"',
});

exports.contexts.mini = Object.assign({}, commonContext, {
  versionSuffix: '-mini',
  nameSuffixEn: ' MINI',
  nameSuffixRu: ' МИНИ',
  extra_permissions: '',
  persistent: '"persistent": false,',
  scripts_0x: '',
  scripts_2x: ', "20-for-mini-only.js"',
  scripts_8x: '',
});

exports.contexts.firefox = Object.assign({}, commonContext, {
  versionSuffix: '',
  nameSuffixEn: '',
  nameSuffixRu: '',
  extra_permissions,
  persistent: '',
  scripts_0x: ', "01-chrome-proxy-settings.js"',
  scripts_2x: ', "20-ip-to-host-api.js"',
  scripts_8x: ', "80-error-menu.js", "83-last-errors.js", "85-block-informer.js"',
});

exports.contexts.beta = Object.assign({}, commonContext, {
  anticensorityPacUrls: [
    'https://raw.githubusercontent.com/anticensority/for-testing/master/anticensority.pac',
    'https://anticensority.github.io/for-testing/anticensority.pac',
  ],
  version: '1.14',
  versionSuffix: '',
  nameSuffixEn: ' FOR TESTING',
  nameSuffixRu: ' ДЛЯ ТЕСТОВ',
  extra_permissions,
  persistent: '',
  scripts_0x: '',
  scripts_2x: ', "20-ip-to-host-api.js"',
  scripts_8x: ', "80-error-menu.js", "83-last-errors.js", "85-block-informer.js"',
});

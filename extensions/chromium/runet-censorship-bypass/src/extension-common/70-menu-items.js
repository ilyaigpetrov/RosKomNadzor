'use strict';

{

  window.apis.menus = {

    getItemsAsObject: () => ({

      googleTranslate: {
        title: 'Через Google Translate',
        getUrl: (blockedUrl) => (
          'https://translate.google.com/translate?hl=&sl=en&tl=ru&anno=2&sandbox=1&u=' + blockedUrl),
        order: 0,
      },

      hostTracker: {
        title: 'Из кэша Google',
        getUrl: (blockedUrl) => 'http://webcache.googleusercontent.com/search?q=cache:' + blockedUrl,
        order: 1,
      },

      archiveOrg: {
        title: 'Из архива archive.org',
        getUrl: (blockedUrl) => 'https://web.archive.org/web/*/' + blockedUrl,
        order: 2,
      },

      otherUnblock: {
        title: 'Разблокировать по-другому',
        getUrl: (blockedUrl) => ('https://anticensority.github.io/unblock#' + blockedUrl),
        order: 3,
      },

      antizapretInfo: {
        title: 'Сайт в реестре блокировок?',
        getUrl: (blockedUrl) => 'https://reestr.rublacklist.net/?q=' + new URL(blockedUrl).hostname,
        order: 4,
      },

      support: {
        title: 'Документация / Помощь / Поддержка',
        getUrl: (blockedUrl) => 'https://github.com/anticensority/runet-censorship-bypass/wiki',
        order: 99,
      },

    }),

    getItemsAsArray: function() {

      const itemsObj = this.getItemsAsObject();
      return Object.keys(itemsObj).reduce((acc, key) => {

        acc.push(itemsObj[key]);
        return acc;

      }, [])
        .sort((a, b) => a.order - b.order);

    },

  };

}

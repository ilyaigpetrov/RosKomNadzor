'use strict';

/*
  Task 1. Gets IPs for proxies of antizapret/anticenz via dns over https.
          These IPs are used in block-informer to inform user when proxy is ON.
  Task 2. Downloads PAC proxy script from antizapret/anticenz/
          my Google Drive and sets it in Chromium settings.
  Task 3. Schedules tasks 1 & 2 for every 4 hours.
*/

/*
  In background scripts use window.apis.antiCensorRu public variables.
  In pages window.apis.antiCensorRu is not accessible,
    use chrome.runtime.getBackgroundPage(..),
    extension.getBackgroundPage is deprecated

  If you want to catch errors, then call api from setTimeout!
  See errorHandlers api for more.

*/

/*
  Due to History

  - *Async suffix usually means that function requires a cb.
    It may not be related to async (returning a Promise).
    This naming is confusing and should be reconsidered.
*/

{ // Private namespace starts.

  const ifRu = chrome.i18n.getMessage('@@ui_locale').startsWith('ru');
  console.log('Russian?', ifRu);
  const mandatory = window.utils.mandatory;
  const throwIfError = window.utils.throwIfError;
  const chromified = window.utils.chromified;
  const timeouted = window.utils.timeouted;

  const clarifyThen = window.apis.errorsLib.clarifyThen;
  const clarify = window.apis.errorsLib.clarify;
  const Warning = window.apis.errorsLib.Warning;

  const httpLib = window.apis.httpLib;
  const handlers = window.apis.errorHandlers;

  const asyncLogGroup = function asyncLogGroup(...args) {

    const cb = args.pop();
    if(!(cb && typeof(cb) === 'function')) {
      throw new TypeError('cb must be a function, but got: ' + cb);
    }
    console.group(...args);
    return function(...cbArgs) {

      console.groupEnd();
      console.log('Group finished.');
      cb(...cbArgs);

    };

  };

  const tryPromiseSeveralTimesAsync = (createPromise, timeoutsInSec) =>
    createPromise().then(
      (res) => Promise.resolve(res),
      (err) => {
        console.log('Promise failed, are there any retries?');
        const outSec = timeoutsInSec.shift();
        if (outSec === undefined) {
          console.log('No retries left.');
          return Promise.reject(err);
        }
        console.log('Retrying in', outSec, 'sec');
        /*
        const alarmName = 'try-promise=several-times-async';
        const res = new Promise((resolve) => {
          chrome.alarms.onAlarm.addListener((alarmInfo) => {
            if (alarmInfo.name === alarmName) {
              console.log('Time to retry.');
              resolve(tryPromiseSeveralTimesAsync(createPromise, timeoutsInSec));
            }
          });
        });
        chrome.alarms.create(alarmName, { delayInMinutes: outSec/60 });
        return res;
        */
        return new Promise((resolve) =>
          window.setTimeout(() => resolve(tryPromiseSeveralTimesAsync(createPromise, timeoutsInSec)), outSec*1000),
        );
      },
  );

  const doWithoutProxyAsync = (createPromise) => new Promise((resolve, reject) => {
    console.log('Doing without proxy...');
    chrome.proxy.settings.get({}, chromified((getErr, settings) => {
      if (getErr) {
        reject(getErr);
        return;
      }
      const ifWeAreInControl = window.utils.areSettingsControlledFor(settings);
      if (!ifWeAreInControl) {
        resolve(createPromise());
        return;
      }
      delete settings.levelOfControl;
      const setProxyAsync = () => new Promise((setResolve, setReject) => {

        console.log('Restoring chrome proxy settings...');
        chrome.proxy.settings.set(
          settings,
          chromified((err) => err ? setReject(err) : setResolve()),
        );
      });
      console.log('Clearing chrome proxy settings...');
      chrome.proxy.settings.clear({}, chromified((clearErr) => {
        if (clearErr) {
          reject(clearErr);
          return;
        }
        createPromise().then((actionResult) => setProxyAsync().then(() => resolve(actionResult)), reject);
      }));
    }));
  });

  const setPacAsync = function setPacAsync(
    pacData = mandatory(), cb = throwIfError,
  ) {

    const config = {
      mode: 'pac_script',
      pacScript: {
        mandatory: false,
        data: pacData,
      },
    };
    console.log('Setting chrome proxy settings...');
    chrome.proxy.settings.set( { value: config }, chromified((err) => {

      if (err) {
        if (err.message === 'proxy.settings requires private browsing permission.') {
          clarifyThen(
            chrome.i18n.getMessage('AllowExtensionToRunInPrivateWindows'),
            cb,
          )(err);
          return;
        }
        return cb(err);
      }
      handlers.updateControlState( () => {

        if ( !handlers.ifControlled ) {

          console.warn('Failed, other extension is in control.');
          return cb(
            new Error( window.utils.messages.whichExtensionHtml() ),
          );

        }
        console.log('Successfuly set PAC in proxy settings.');
        cb();

      });

    }));
  };

  const updatePacProxyIps = function updatePacProxyIps(
    cb = throwIfError
  ) {

    cb = asyncLogGroup(
      'Getting IPs for PAC hosts...',
      cb,
    );
    window.utils.fireRequest('ip-to-host-update-all', cb);

  };

  const setPacScriptFromProviderAsync = function setPacScriptFromProviderAsync(
    provider, lastModifiedStr, ifUnattended = mandatory(), cb = throwIfError,
  ) {

    const pacUrl = provider.pacUrls[0];
    cb = asyncLogGroup(
      'Getting PAC script from provider...', pacUrl,
      cb,
    );

    const warnings = [];
    const originalCb = cb;
    cb = (err, res, ...warns) => originalCb(err, res, ...warns, ...warnings);
    const addWarning = (wText) => { warnings.push(new Warning(wText)) };

    if (provider.distinctKey === 'Anticensority') {

      const pacMods = window.apis.pacKitchen.getPacMods();
      if (!pacMods.filteredCustomsString) {
        addWarning(
          ifRu
            ? \`
              Не найдено СВОИХ прокси. Этот PAC-скрипт
              работает только со <a href="https://git.io/ac-own-proxy">СВОИМИ прокси</a>
              (по умолчанию будет использоваться локальный <a href="https://git.io/ac-tor">Tor</a>).
            \`
            : \`
              Couldn't find OWN proxies. This PAC-script
              works only with <a href="https://git.io/ac-own-proxy">OWN proxies</a>
              (by default local <a href="https://git.io/ac-tor">Tor</a> will be used).
            \`,
        );
      }

    }

    doWithoutProxyAsync(
      // Employ all urls, the latter are fallbacks for the former.
      () => {
        const tryAllUrlsAsync = () => provider.pacUrls.reduce(
          (promise, url) => promise.catch(
            () => new Promise(
              (resolve, reject) => httpLib.get(
                url,
                (newErr, pacData) =>
                  newErr ? reject(newErr) : resolve(pacData),
              ),
            ),
          ),
          Promise.reject(),
        );
        return (ifUnattended
            ? tryPromiseSeveralTimesAsync(tryAllUrlsAsync, [20, 40, 60])
            : tryAllUrlsAsync()
        ).catch(
          (err) => Promise.reject(clarify(
              err,
              chrome.i18n.getMessage('FailedToDownloadPacScriptFromAddresses') + ': [ '
              + provider.pacUrls.join(' , ') + ' ].',
          )),
        );
      },
    ).then(
      (pacData) => {
        setPacAsync(
          pacData,
          (err, res) => cb(
            err,
            Object.assign(res || {}, {lastModified: lastModifiedStr}),
          ),
        );
      },
      cb,
    );
  };

  window.apis.antiCensorRu = {

    version: chrome.runtime.getManifest().version,

    pacProviders: {
      Антизапрет: {
        // Distinct keys are needed if you want to check if a given
        // provider is this or that (distinct it from others).
        distinctKey: 'Antizapret',
        label: chrome.i18n.getMessage('Antizapret'),
        desc: ifRu
                ? \`Основной PAC-скрипт от автора проекта «Антизапрет».
                    Охватывет меньше сайтов.
                    Блокировка определяется по доменному имени и при необходимости по IP.
                    <br/> <a href="https://github.com/anticensority/runet-censorship-bypass/wiki/PAC-скрипты:-различия">Сравнение PAC-скриптов</a>.
                  \`
                : \`The main PAC-script from the author of project "Antizapret"\.
                    Covers fewer sites.
                    Block is detected based on a domain name and, if necessary, on an IP.
                    <br/> <a href="https://github.com/anticensority/runet-censorship-bypass/wiki/PAC-скрипты:-различия">Comparison of PAC-scripts (ru)</a>.
                  \`,
        order: 0,
        pacUrls: [
          'https://e.cen.rodeo:8443/proxy.pac',
          'https://antizapret.prostovpn.org:8443/proxy.pac',
          'https://antizapret.prostovpn.org:18443/proxy.pac',
          'https://antizapret.prostovpn.org/proxy.pac',
        ],
      },
      Антицензорити: {
        distinctKey: 'Anticensority',
        label: chrome.i18n.getMessage('Anticensority'),
        desc: ifRu
                ? \`Альтернативный PAC-скрипт от автора расширения.
                    Охватывает больше сайтов.
                    Блокировка определятся по доменному имени или IP адресу.
                    Подходит для провайдеров, блокирующих все сайты на одном IP.
                    <br/> <a href="https://github.com/anticensority/runet-censorship-bypass/wiki/PAC-скрипты:-различия">Сравнение PAC-скриптов</a>.
                  \`
                : \`Alternative PAC-script from the author of this extension.
                    Covers more sites.
                    Block is detected based on a domain name and on an IP address.
                    Better fits providers that block all sites on one IP.
                    <br/> <a href="https://github.com/anticensority/runet-censorship-bypass/wiki/PAC-скрипты:-различия">Comparison of PAC-scripts (ru)</a>.
                  \`,
        order: 1,

        /*
          Don't use in system configs! Because Windows does poor caching.
          Some urls are encoded to counter abuse.
          Version: 0.17
        */
        pacUrls: ${JSON.stringify(anticensorityPacUrls, null, 2)},
      },
      onlyOwnSites: {
        distinctKey: 'onlyOwnSites',
        label: chrome.i18n.getMessage('Only_own_sites_and_only_own_proxies'),
        desc: ifRu
                ? 'Проксируются только добавленные вручную адреса через СВОИ вручную добавленные прокси или через локальный Tor.'
                : 'Only added manually urls are proxied via your OWN manually added proxies or via Tor.',
        order: 99,
        pacUrls: [
          'data:application/x-ns-proxy-autoconfig,' + escape('function FindProxyForURL(){ return "DIRECT"; }'),
        ],
      }
    },

    getSortedEntriesForProviders() {

      return Object.entries(this.pacProviders).sort((entryA, entryB) => entryA[1].order - entryB[1].order).map(([key, prov]) => Object.assign({key: key}, prov));

    },

    _currentPacProviderKey: 'Антизапрет',

    /* Is it the first time extension installed?
       Do something, e.g. initiate PAC sync.
    */
    ifFirstInstall: false,
    /* We have .lastPacUpdateStamp and ._currentPacProviderLastModified.
       LastModified is received from a server, we kind of don't trust it,
       just use it for cache and maybe show to the user.
       UpdateStamp is got from client and we base our timers on it,
       malicious server can't interfere with it.
    */
    lastPacUpdateStamp: 0,

    setTitle() {

      const upDate = new Date(this.lastPacUpdateStamp).toLocaleString('ru-RU')
        .replace(/:\\d+$/, '').replace(/\\.\\d{4}/, '');
      chrome.browserAction.setTitle({
        title: \`\${chrome.i18n.getMessage('Updated')} \${upDate} | \${chrome.i18n.getMessage('Version')} \${window.apis.version.build}\`,
      });

    },

    _currentPacProviderLastModified: 0,

    getLastModifiedForKey(key = mandatory()) {

      if (this._currentPacProviderKey === key) {
        return new Date(this._currentPacProviderLastModified).toUTCString();
      }
      return new Date(0).toUTCString();

    },

    setLastModified(newValue = mandatory()) {

      this._currentPacProviderLastModified = newValue;

    },

    mustBeKey(key = mandatory()) {

      if ( !(key === null || this.pacProviders[key]) ) {
        throw new TypeError('No provider for key:' + key);
      }

    },

    getCurrentPacProviderKey() {

      return this._currentPacProviderKey;

    },

    setCurrentPacProviderKey(
      newKey = mandatory(),
      lastModified = new Date().toUTCString(),
    ) {

      this.mustBeKey(newKey);
      this._currentPacProviderKey = newKey;
      this._currentPacProviderLastModified = lastModified;

    },

    getPacProvider(key) {

      if(key) {
        this.mustBeKey(key);
      } else {
        key = this.getCurrentPacProviderKey();
      }
      return this.pacProviders[key];

    },

    _periodicUpdateAlarmReason: 'Периодичное обновление PAC-скрипта',

    pushToStorageAsync(cb = throwIfError) {

      console.log('Pushing to storage...');

      // Copy only settable properties (except functions).
      const onlySettable = {};
      for(const key of Object.keys(this)) {
        if (
          Object.getOwnPropertyDescriptor(this, key).writable
            && typeof(this[key]) !== 'function'
        ) {
          onlySettable[key] = this[key];
        }
      }

      chrome.storage.local.remove(
        'antiCensorRu',
        () => chrome.storage.local.set(
          { antiCensorRu: onlySettable },
          chromified(cb),
        ),
      );

    },

    syncWithPacProviderAsync(opts = {}, cb = throwIfError) {
      const optsDefaults = Object.freeze({ key: this.getCurrentPacProviderKey(), ifUnattended: false });
      if( typeof(opts) === 'function' ) {
        cb = opts;
        opts = {};
      }
      let { key, ifUnattended } = { ...optsDefaults, ...opts };
      cb = asyncLogGroup('Syncing with PAC provider ' + key + '...', cb);

      if (key === null) {
        // No pac provider set.
        return clarifyThen(chrome.i18n.getMessage('ChoosePacProviderFirstD'), cb);
      }

      const pacProvider = this.getPacProvider(key);

      const pacSetPromise = new Promise(
        (resolve, reject) => setPacScriptFromProviderAsync(
          pacProvider,
          this.getLastModifiedForKey(key),
          ifUnattended,
          (err, res, ...warns) => {

            if (!err) {
              this.setCurrentPacProviderKey(key, res.lastModified);
              this.lastPacUpdateStamp = Date.now();
              this.ifFirstInstall = false;
              this.setAlarms();
              this.setTitle();
            }

            resolve([err, null, ...warns]);

          }
        )
      );

      const updateIpsAsync = () => new Promise(
        (resolve, reject) => updatePacProxyIps(
          (err, res, ...warns) => {
            if (err) {
              reject([err, ...warns]);
              return;
            }
            resolve([err, res, ...warns]);
          },
        ),
      );

      const ipsPromise = !ifUnattended
        ? updateIpsAsync()
        : tryPromiseSeveralTimesAsync(updateIpsAsync, [20, 40, 60]);

      Promise.all([pacSetPromise, ipsPromise]).then(
        ([[pacErr, pacRes, ...pacWarns], [ipsErr, ipsRes, ...ipsWarns]]) => {

          if (pacErr) {
            return cb(pacErr, pacRes);
          }
          const warns = pacWarns;
          if (ipsErr) {
            warns.push(ipsErr);
          }
          if (ipsWarns.length) {
            warns.push(...ipsWarns);
          }
          this.pushToStorageAsync(
            (pushErr) => cb(pacErr || pushErr, null, ...warns),
          );

        },
        cb
      );

    },

    _pacUpdatePeriodInMinutes: 12*60,
    get pacUpdatePeriodInMinutes() {

      return this._pacUpdatePeriodInMinutes;

    },

    setAlarms() {

      let nextUpdateMoment = this.lastPacUpdateStamp
        + this._pacUpdatePeriodInMinutes*60*1000;
      const now = Date.now();
      if (nextUpdateMoment < now) {
        nextUpdateMoment = now;
      }

      console.log(
        'Next PAC update is scheduled on',
        new Date(nextUpdateMoment).toLocaleString('ru-RU'),
      );

      chrome.alarms.create(
        this._periodicUpdateAlarmReason,
        {
          when: nextUpdateMoment,
          periodInMinutes: this._pacUpdatePeriodInMinutes,
        }
      );

      // ifAlarmTriggered. May be changed in the future.
      return nextUpdateMoment === now;

    },

    installPacAsync(key, cb = throwIfError) {

      console.log('Installing PAC...');
      if (!key) {
        throw new Error('Key must be defined.');
      }
      if (this.currentProviderKey !== key) {
        return this.syncWithPacProviderAsync({ key }, cb);
      }
      console.log(key + ' already installed.');
      cb();

    },

    clearPacAsync(cb = throwIfError) {

      cb = asyncLogGroup('Cearing alarms and PAC...', cb);
      chrome.alarms.clearAll(
        () => chrome.proxy.settings.clear(
          {},
          chromified((err) => {

            if (err) {
              return cb(err);
            }
            this.setCurrentPacProviderKey(null);
            this.pushToStorageAsync(
              () => handlers.updateControlState(cb),
            );

          }),
        ),
      );

    },

  };

  // ON EACH LAUNCH, STARTUP, RELOAD, UPDATE, ENABLE
  (async () => {
    let ifConsentGiven = await window.utils.promisedLocalStorage.get('ifConsentGiven');
    if (!ifConsentGiven) {
      window.utils.openAndFocus('/pages/consent/index.html');
      await window.apis.consent.promise;
      ifConsentGiven = true
      await window.utils.promisedLocalStorage.set({ ifConsentGiven });
    }

    let oldAntiCensorRu = await window.utils.promisedLocalStorage.get('antiCensorRu') || {};

    const otherKeys = [
      'pac-kitchen-if-incontinence',
      'pac-kitchen-mods',
      'ip-to-host',
      'handlers-pac-error',
      'handlers-ext-error',
      'handlers-no-control',
    ];
    /*
       Event handlers that ALWAYS work (even if installation is not done
       or failed).
       E.g. install window may fail to open or be closed by user accidentally.
       In such case extension _should_ try to work on default parameters.
    */
    const antiCensorRu = window.apis.antiCensorRu;

    chrome.alarms.onAlarm.addListener(
      timeouted( (alarm) => {

        if (alarm.name === antiCensorRu._periodicUpdateAlarmReason) {
          console.log(
            'Periodic PAC update triggered:',
            new Date().toLocaleString('ru-RU'),
          );
          antiCensorRu.syncWithPacProviderAsync({ ifUnattended: true }, () => { /* Swallow. */ });
        }

      })
    );
    console.log('Alarm listener installed. We won\\'t miss any PAC update.');

    window.addEventListener('online', () => {

      console.log('We are online, checking periodic updates...');
      antiCensorRu.setAlarms();

    });

    console.log('Keep cooked...');
    await new Promise((resolve) => window.apis.pacKitchen.keepCookedNowAsync(resolve));

    //console.log('Storage on init:', oldAntiCensorRu);
    antiCensorRu.ifFirstInstall = Object.keys(oldAntiCensorRu).length === 0;

    if (antiCensorRu.ifFirstInstall) {
      // INSTALL
      console.log('Installing...');
      handlers.switch('on', 'ext-error');
      chrome.runtime.openOptionsPage();
      return;
    }

    // LAUNCH, RELOAD, UPDATE
    // Use old or migrate to default.
    antiCensorRu._currentPacProviderKey =
      oldAntiCensorRu._currentPacProviderKey || null;
    antiCensorRu.lastPacUpdateStamp =
      oldAntiCensorRu.lastPacUpdateStamp || antiCensorRu.lastPacUpdateStamp;
    antiCensorRu._currentPacProviderLastModified =
      oldAntiCensorRu._currentPacProviderLastModified
      || antiCensorRu._currentPacProviderLastModified;
    console.log(
      'Last PAC update was on',
      new Date(antiCensorRu.lastPacUpdateStamp).toLocaleString('ru-RU'),
    );


    /*
      1. There is no way to check that chrome.runtime.onInstalled wasn't fired
         except timeout.
         Otherwise we could put storage migration code only there.
      2. We have to check storage for migration before using it.
         Better on each launch then on each pull.
    */

    await new Promise(async (resolve) => {

      const ifUpdating = antiCensorRu.version !== oldAntiCensorRu.version;
      if (!ifUpdating) {

        // LAUNCH, RELOAD, ENABLE
        antiCensorRu.pacProviders = oldAntiCensorRu.pacProviders;
        console.log('Extension launched, reloaded or enabled.');
        return resolve();

      }

      // UPDATE & MIGRATION

      const ifUpdatedCb = () => antiCensorRu.pushToStorageAsync(() => {

        console.log('Extension updated.');
        resolve();

      });

      console.log('Updating from', oldAntiCensorRu.version, 'to', antiCensorRu.version);
      try {
        if (window.apis.version.isLeq(oldAntiCensorRu.version, '0.0.1.62')) {
          window.apis.antiCensorRu.pacProviders['Антизапрет'].pacUrls = [
            'https://e.cen.rodeo:8443/proxy.pac',
            'https://antizapret.prostovpn.org:8443/proxy.pac',
            'https://antizapret.prostovpn.org:18443/proxy.pac',
            'https://antizapret.prostovpn.org/proxy.pac',
          ];
          console.log('Successfully updated to 0.0.1.63.');
        }
      } catch (e) {
        // Log update error.
        console.log('UPDATE ERROR:');
        console.error(e);
      }
      ifUpdatedCb();

    });

    if (antiCensorRu.getPacProvider()) {
      antiCensorRu.setAlarms();
    }
    antiCensorRu.setTitle();

    /*
      History of Changes to Storage (Migration Guide)
      -----------------------------------------------
      Version 0.0.0.17:
        * Remove "Антиценз".
        * Rename "Оба_и_на_свитчах" to "Антицензорити"
        * Add provider.label and provider.desc.
      Version 0.0.0.10:
        * Add this.version.
        * Change PacProvider.proxyIps from {ip -> Boolean} to {ip -> hostname}.
      Version 0.0.0.8-9:
        * Change storage.ifNotInstalled to storage.ifFirstInstall.
        * Add storage.lastPacUpdateStamp.
    **/

  })();

}

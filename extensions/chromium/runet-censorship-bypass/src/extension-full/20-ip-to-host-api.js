'use strict';

{

  const mandatory = window.utils.mandatory;
  const httpLib = window.apis.httpLib;
  const clarify = window.apis.errorsLib.clarify;

  // IP REGEX starts.

  const portOpt = '(:\\d+)?'; // The only capturing group, sic!
  const ipv4portOpt = '(?:[0-9]{1,3}\\.){3}[0-9]{1,3}' + portOpt;
  const ipv6nake = '(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}';
  const ipv6portOpt = '(?:' + ipv6nake + '|' + '\\[' + ipv6nake + '\\]' + portOpt + ')';

  const ipv4Re = new RegExp('^' + ipv4portOpt + '$');
  const ipv6Re = new RegExp('^' + ipv6portOpt + '$');

  const _match = function _match(ipRe, str) {

    const m = (str.match(ipRe) || []).filter( (c) => c );
    const port = m.length > 1 ? m.pop() : false;
    return {ifMatched: m.length, port: port};

  };

  const _test = {

    ipv4: _match.bind(null, ipv4Re),
    ipv6: _match.bind(null, ipv6Re),
    ipv4v6: function(str) {

      let mr = this.ipv4(str);
      if (mr.ifMatched) {
        mr.ifv4 = true;
        mr.canonical = str.replace(mr.port, '');
        return mr;
      }
      mr = this.ipv6(str);
      if (mr.ifMatched) {
        mr.ifv6 = true;
        mr.canonical = str.replace(mr.port, '').replace(/[\[\]]/g, '');
        return mr;
      }
      return mr;

    },

  };

  // IP REGEX ends.

  const _state = window.utils.createStorage('ip-to-host');
  const ip2host = '';

  const privates = {};

  const _createHostObj = function _addHostObj(hostStr) {

    return (privates._strToHostObj[hostStr] = {host: hostStr});

  };

  const _getHostObj = function _getHostObj(hostStr) {

    return privates._strToHostObj[hostStr] || _createHostObj(hostStr);

  };

  const reinit = function reinit() {

    privates._strToHostObj = [
      /* Please, don't use proxies directly (without PAC-script). */
      'n.thenewone.lol',
      's.thenewone.lol',
      // antizapret.prostovpn.org:
      'proxy.antizapret.prostovpn.org',
      'proxy-ssl.antizapret.prostovpn.org',
      'proxy-nossl.antizapret.prostovpn.org',
      'proxy-fbtw-ssl.antizapret.prostovpn.org',
    ].reduce((acc, hostname) => Object.assign(acc, { [hostname]: { host: hostname }}), {
      // Defaults:
      localhost: { host: 'localhost' },
    });

    privates._ipToHostObj = {
      '127.0.0.1': { host: 'localhost' },
      '0.0.0.0': { host: 'localhost' },
    };

    // Persisted.
    const ipToHost = _state(ip2host);
    if (ipToHost) {
      for( const ip of Object.keys(ipToHost) ) {
        const host = ipToHost[ip];
        privates._ipToHostObj[ip] = _getHostObj(host);
      }
    }

  };

  reinit();

  const generateRandomHexString = function generateRandomHexString(minLen, maxLen) {

    return Array.from(window.crypto.getRandomValues(new Uint8Array(maxLen)))
      .slice(minLen + Math.floor(Math.random()*(maxLen - minLen)))
      .map((i) => i.toString(16)).join('');

  };

  const getIpsFor = function getIpsFor(host, cb = mandatory()) {

    if (host.trim() === 'localhost') {
      return cb(null, ['127.0.0.1', '0.0.0.0', '::1']);
    }
    const types = [1, 28];
    const promises = types.map(
      (type) => new Promise((resolve) =>
        httpLib.get(
          `https://dns.google.com/resolve?type=${type}&name=${host}&random_padding=${generateRandomHexString(30,500)}`,
          (err, res) => {

            if (res) {
              try {
                res = JSON.parse(res);
                console.log('JSON parsed.');
                if (err || res.Status) {
                  const msg = ['Answer', 'Comment', 'Status']
                    .filter( (prop) => res[prop] )
                    .map( (prop) => prop + ': ' + JSON.stringify( res[prop] ) )
                    .join(', \n');
                  err = clarify(err || {}, 'Сервер (json): ' + msg, {data: res});
                } else {
                  res = res.Answer || [];
                  res = res.filter(
                    (record) => types.includes(record.type)
                  ).map( (ans) => ans.data );
                }
              } catch(e) {
                err = clarify(
                  e,
                  'Сервер (текст): ' + res, err ? {data: err} : undefined
                );
              }
            }
            resolve([err, res]);

          }
        )
      )
    );
    Promise.all(promises).then(
      ([[v4err, v4res], [v6err, v6res]]) => {

        if(v4err) {
          return cb(v4err, v4res);
        }
        const ips = v4res;
        let warns = [];
        if (!v6err) {
          ips.push(...v6res);
        } else {
          warns = [v6err];
        }
        cb(null, ips, ...warns);

      }
    );

  };

  const _canonize = function canonize(addrArr) {

    const ipSet = new Set();
    const hostSet = new Set();

    for( const addr of addrArr ) {

      const ipm = _test.ipv4v6(addr);
      if (ipm.ifMatched) {
        ipSet.add( ipm.canonical );
      } else {
        hostSet.add( addr.replace(/:\d+$/, '') );
      }

    }

    console.log('Canonized hosts/ips:', hostSet.size + '/' + ipSet.size);
    return [ipSet, hostSet];

  };

  const self = window.apis.ipToHost = {

    persistData() {

      console.log('Persisting ipToHost...', privates);
      const ipToHost = {};
      for( const ip of Object.keys(privates._ipToHostObj) ) {
        ipToHost[ip] = privates._ipToHostObj[ip].host;
      }
      _state(ip2host, ipToHost);

    },

    resetToDefaults() {

      _state(ip2host, null);
      reinit();

    },

    _purgeOldIpsForSync(hostStr) {

      console.log('Purging old IPs for', hostStr);
      for(const ip of Object.keys(privates._ipToHostObj)) {
        if (hostStr === privates._ipToHostObj[ip].host) {
          delete privates._ipToHostObj[ip];
        }
      }

    },

    _addAsync(hostStr, cb = mandatory()) {

      new Promise((resolveIps, reject) => {

        const ipm = _test.ipv4v6(hostStr);
        if (ipm.ifMatched) {
          return resolveIps([hostStr]);
        }

        getIpsFor(hostStr, (err, ips, ...warns) => {

          console.log('Got IPs + err?:', ips, err);
          if (err) {
            reject([err, null, ...warns]);
            return;
          }
          resolveIps(ips);
        });

      }).then(
        (ips) => {

          this._purgeOldIpsForSync(hostStr);
          // Object may be shared, string can't.
          const hostObj = _getHostObj(hostStr);
          for(const ip of ips) {
            privates._ipToHostObj[ip] = hostObj;
          }
          cb();

        },
        (args) => cb(...args)
      );

    },

    _updateAllAsync(cb = mandatory()) {

      const hostArr = Object.keys(privates._strToHostObj)
        .filter((hostStr) => hostStr !== 'localhost');

      console.log('Update all:', hostArr);

      const promises = hostArr.map(
        (hostStr) => new Promise(
          (resolve) => this._addAsync(
            hostStr,
            (...args) => resolve(args)
          )
        )
      );
      Promise.all( promises ).then( (cbsRes) => {

        let ipErrors = cbsRes.map( ([err]) => err ).filter( (err) => err );
        let warns = [];
        if (ipErrors.length) {
          warns = [clarify(
            ipErrors,
            'Не удалось получить один или несколько IP адресов для' +
            ' прокси-серверов. Иконка для уведомления об обходе' +
            ' блокировок может не отображаться.'
          )];
        } else {}
        cb(null, null, ...warns);
      });
    },

    _replaceAllAsync(hostArr = mandatory(), cb) {

      if (typeof(hostArr) === 'function') {
        cb = hostArr;
        hostArr = Object.keys(privates._strToHostObj);
      }

      this.resetToDefaults();
      for(const hostStr of hostArr) {
        _createHostObj(hostStr);
      }

      this._updateAllAsync(cb);

    },

    // PUBLIC

    updateAllAsync(cb = mandatory()) {

      this._updateAllAsync((err, ...args) => {

        if (!err) {
          this.persistData();
        }
        cb(err, ...args);

      });

    },

    replaceAllAsync(addrArr, cb = mandatory()) {

      console.log('Replacing...', addrArr);
      const [ipSet, hostSet] = _canonize(addrArr);
      for( const ip of ipSet ) {
        const host = _getHostObj(ip);
        privates._ipToHostObj[ip] = host;
      }

      this._replaceAllAsync([...ipSet, ...hostSet], (allErr, ...args) => {

        if (!allErr) {
          this.persistData();
        }
        cb(allErr, ...args);

      });

    },

    get(ip) {

      const tmp = privates._ipToHostObj[ip];
      return tmp && tmp.host;

    },

  };

  window.utils.addRequestResponder(
    'ip-to-host-update-all', (...args) => self.updateAllAsync(...args)
  );
  window.utils.addRequestResponder(
    'ip-to-host-replace-all', (...args) => self.replaceAllAsync(...args)
  );
  window.utils.addRequestResponder(
    'ip-to-host-reset-to-defaults', (cb) => {
      self.resetToDefaults();
      cb();
    }
  );

}

const max = 2**16;
const versionToArray = (v) => [ ...v.split('.'), 0, 0, 0].slice(0,4);
const versionToInt = (v) => versionToArray(v)
  .reverse()
  .reduce((acc, vv, i) => acc + parseInt(vv)*(max**i), 0);

const compareVersions = (a, b) => versionToInt(a) - versionToInt(b);

const current = chrome.runtime.getManifest().version;

export default {
  current,
  isLeq: (a, b) => {
    if (!b) {
      b = a;
      a = current;
    }
    return compareVersions(a, b) <= 0;
  },
};
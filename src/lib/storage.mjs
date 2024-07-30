export default {
  getAsync(what) {
    return new Promise((resolve) => (
      chrome.storage.local.get(
        what ? [what] : null,
        (msg) => resolve(what ? msg[what] : msg),
      )
    ));
  },
  setAsync(what) {
    return new Promise((resolve) => (
      chrome.storage.local.set(what, resolve)
    ));
  },
  removeAsync(keyOrKeys) {
    return new Promise((resolve) =>
      chrome.storage.local.remove(keyOrKeys, resolve)
    );
  },
  clearAsync() {
    return new Promise((resolve) => chrome.storage.local.clear(resolve));
  },
  isEmptyAsync() {
    return new Promise(async (resolve) => {
      const o = await this.getAsync();
      resolve(Object.keys(o).length === 0);
    });
  },
};
import { storage } from '../../lib/common-apis.mjs';

donate.href = await storage.getAsync('donateUrl');
const options = await storage.getAsync('options');

options.forEach(([key, value], i) => {
  const li = document.createElement('li');
  li.innerHTML = `<input type="checkbox"
    id="${key}"> <label for="${key}" data-localize="__MSG_${key}__">${key}</label>`;
  const input = li.querySelector('input');
  input.checked = value;
  listOfOptions.appendChild(li);
  input.onclick = async ({ target }) => {
    options[i] = [ key, target.checked ];
    await storage.setAsync({ options });
    chrome.contextMenus.update(key, { checked: target.checked });
  };
});

const textElements = document.querySelectorAll('[data-localize]');
textElements.forEach((e) => {
  const ref = e.dataset.localize;
  if (ref) {
     const translated= ref.replace(/__MSG_(\w+)__/g, (match, theGroup) => chrome.i18n.getMessage(theGroup));
    if (translated) {
      e.innerText = translated;
    }
  }
});
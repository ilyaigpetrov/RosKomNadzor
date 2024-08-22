console.log('Options page is opening...');

pacChooserForm.addEventListener('change', function (event) {
  console.log('ON CHANGE:', event);
  pacChooserForm.reportValidity();
});

pacChooserForm.addEventListener('formdata', (event) => {
  event.preventDefault();
  console.log('ON FORMDATA', event);
  return false; // Prevent default action.
});

editPacUrlButton.onclick = function (event) {
  event.preventDefault();
  const lockUrl = () => { customPacUrl.disabled = true; };
  const unlockUrl = () => { customPacUrl.disabled = false; };  
  const ifUrlLocked = customPacUrl.disabled;
  if (ifUrlLocked) {
    unlockUrl();
    return false;
  }
  const ifUrlValid = customPacUrl.checkValidity();
  if (ifUrlValid) {
    lockUrl();
    own.disabled = false;
      // TODO: Save to storage.
    return false;
  }
  // Empty or incorrect url.
  own.disabled = true; // `own.checked` doesn't matter here.
  const ifUrlEmpty = !customPacUrl.value;
  if (ifUrlEmpty) {
    lockUrl();
    return false;
  }
  return false;
};
/*
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
*/
await chrome.storage.local.get('options');

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
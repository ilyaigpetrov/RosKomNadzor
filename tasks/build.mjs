#!/usr/bin/env node
import util from 'util';
import cp from 'child_process';

const exec = util.promisify(cp.exec);

await exec('rm -rf ./_generated');

const browsers = ['firefox', 'chromium'];
const editions = ['main', 'test'];

browsers.forEach((browser) => {
  editions.forEach(async (edition) => {
    const outDir = `./_generated/${browser}-${edition}`;
    await exec(`mkdir -p ${outDir}`);
    await exec(
      `./tasks/generate-manifest.mjs --browser ${browser} --edition ${edition} > ${outDir}/manifest.json`,
    );
    ['src', 'icons', '_locales'].forEach(
      async (file) =>
        await exec(`cp -r ./${file} ${outDir}/.`),
    );
    await exec(`
      mkdir -p ${outDir}/node_modules
      cp -r ./node_modules/punycode ${outDir}/node_modules/.`
    );
  });
});
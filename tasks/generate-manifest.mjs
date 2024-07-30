#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { recursive } from 'merge';
import mri from 'mri';

const requiredFlags = ['browser', 'edition'];
const args = mri(
  process.argv.slice(2),
  {
    alias: {
      h: 'help',
    },
    string: requiredFlags,
    boolean: ['help'],
  },
);

const ifAllArgsProvided = requiredFlags.reduce(
  (acc, flag) => acc && args[flag],
  true,
);

(async () => {
  if (args.help || !ifAllArgsProvided) {
    console.log(
      `Usage: ${path.basename(process.argv[1])} [--help or -h] --browser chromium --edition test`,
    );
    if (!ifAllArgsProvided) {
      process.exitCode = 1;
    }
    return;
  }

  const currentDate = new Date().toISOString().split('T')[0].replaceAll('-', '');
  const semver = process.env.npm_package_version;
  const context = {
    version: `${semver}.${currentDate}`,
    edition: args.edition,
  };

  const baseManifest = (
      await import('../manifests/base.json.mjs')
    ).render(context);

  const jsonStr = fs.readFileSync(`./manifests/${args.browser}.json`).toString();
  const customManifest = JSON.parse(jsonStr);

  const ifToClone = true;
  const finalManifest = recursive(ifToClone, baseManifest, customManifest);

  console.log(JSON.stringify(finalManifest, null, 2));
})();
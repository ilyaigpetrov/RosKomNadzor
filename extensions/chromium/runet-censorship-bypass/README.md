# Install

Tested on:

NodeJS: v16.1.0.
NPM: 7.11.2.
OS: Linux Mint 20 Xfce Edition.

```
npm install
cd src/extension-common/pages/options/
npm install
cd -

# For debugging:
npm start
# Use your build/extension-beta

# For production:
npm start
# Use your build/extension-full or build/extension-mini
```

# For Reviewers

See ./src/extension-common/FOR_REVIEWERS.md.

# Release Instructions

1. `npm run release`
2. `vim src/templates-data.js` and bump version.
3. Commit bumped version.
4. Merge development to production (usually after deployment and testing and many patches).

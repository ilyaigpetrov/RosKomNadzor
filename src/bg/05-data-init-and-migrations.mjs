import { versions, storage } from '../lib/index.mjs';

globalThis.migrationPromise = new Promise(async (resolve) => {
  console.log('Checking for migrations...');
  const dflts = {
    // TODO: Define defaults.
    options: {},
  };
  const ifEmpty = await storage.isEmptyAsync();
  if (ifEmpty) {
    // Initialisation. First install.
    await storage.setAsync({
      ...dflts,
      version: versions.current,
    });
    return resolve();
  }
  // Migration (may be already migrated).
  console.log(`Current extension version is ${versions.current}.`);
  const oldVersion = await storage.getAsync('version');
  const ifNoNeedToMigrate = oldVersion === versions.current;
  if (ifNoNeedToMigrate) {
    console.log('No need for migration.');
    return resolve();
  }
  console.log(`Migrating to ${versions.current} from ${oldVersion || 'a very old version'}.`);
  switch(true) {
    case !oldVersion: {
      // Update from version <= 0.0.1.
      const ifSentence = await storage.getAsync('SOME_KEY');
      if (ifSentence !== undefined) {
        console.log('Migrating to 0.0.1.');
        await storage.setAsync({
          ifToEncodeUrlTerminators: ifSentence,
        });
      }
    }; // Fallthrough.
    case versions.isLeq(oldVersion, '0.0.18'): {
      console.log('Migrating to >= 0.0.19.');
      const oldState = await storage.getAsync();
      // `oldState` looks like `{ 'ifToEncodeSentenceTerminators': true, 'ifFoobar': false }`.
      const migratedOpts = dflts.options.reduce((acc, [ dfltKey, dfltValue ]) => {
        const oldValue = oldState[dfltKey];
        acc.push([ dfltKey, typeof(oldValue) === 'boolean' ? oldValue : dfltValue ]);
        return acc;
      }, []);
      await storage.clearAsync();
      await storage.setAsync({ ...dflts, options: migratedOpts });
    }; // Fallthrough.
    default:
      await storage.setAsync({ version: versions.current });
  }
  return resolve();
});

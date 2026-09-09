const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  withDangerousMod,
  withInfoPlist,
  withPodfile,
} = require('expo/config-plugins');

const DAT_TAG = '0.9.0';
const DAT_REPO = 'https://github.com/facebook/meta-wearables-dat-ios.git';

function frameworksDir(projectRoot) {
  return path.join(projectRoot, 'modules/ironmath-wearables/ios/Frameworks');
}

function ensureDatFrameworks(projectRoot) {
  const dest = frameworksDir(projectRoot);
  const core = path.join(dest, 'MWDATCore.xcframework');
  const display = path.join(dest, 'MWDATDisplay.xcframework');
  if (fs.existsSync(core) && fs.existsSync(display)) {
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  const tmp = path.join(projectRoot, '.expo/meta-wearables-dat-ios');
  if (fs.existsSync(tmp)) {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  const clone = spawnSync(
    'git',
    ['clone', '--depth', '1', '--branch', DAT_TAG, '--filter=blob:none', '--sparse', DAT_REPO, tmp],
    { encoding: 'utf8' }
  );
  if (clone.status !== 0) {
    console.warn('[IronMath] Could not clone Meta DAT', clone.stderr || clone.stdout);
    return;
  }
  const sparse = spawnSync('git', ['sparse-checkout', 'set', 'MWDATCore.xcframework', 'MWDATDisplay.xcframework'], {
    cwd: tmp,
    encoding: 'utf8',
  });
  if (sparse.status !== 0) {
    console.warn('[IronMath] Could not sparse-checkout DAT frameworks', sparse.stderr || sparse.stdout);
    return;
  }
  const fromCore = path.join(tmp, 'MWDATCore.xcframework');
  const fromDisplay = path.join(tmp, 'MWDATDisplay.xcframework');
  if (!fs.existsSync(fromCore) || !fs.existsSync(fromDisplay)) {
    console.warn('[IronMath] DAT frameworks missing after clone');
    return;
  }
  fs.cpSync(fromCore, core, { recursive: true });
  fs.cpSync(fromDisplay, display, { recursive: true });
}

function mergeUnique(list, extras) {
  const next = Array.isArray(list) ? [...list] : [];
  for (const item of extras) {
    if (!next.includes(item)) {
      next.push(item);
    }
  }
  return next;
}

function withMetaWearables(config) {
  config = withDangerousMod(config, [
    'ios',
    async (mod) => {
      ensureDatFrameworks(mod.modRequest.projectRoot);
      const propsPath = path.join(mod.modRequest.platformProjectRoot, 'Podfile.properties.json');
      if (fs.existsSync(propsPath)) {
        const props = JSON.parse(fs.readFileSync(propsPath, 'utf8'));
        props['ios.deploymentTarget'] = '17.2';
        fs.writeFileSync(propsPath, JSON.stringify(props, null, 2) + '\n');
      }
      return mod;
    },
  ]);

  config = withPodfile(config, (mod) => {
    if (!mod.modResults.contents.includes("pod 'IronMathWearables'")) {
      mod.modResults.contents = mod.modResults.contents.replace(
        'use_expo_modules!',
        "use_expo_modules!\n  pod 'IronMathWearables', :path => '../modules/ironmath-wearables/ios'"
      );
    }
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    const plist = mod.modResults;
    plist.NSBluetoothAlwaysUsageDescription =
      plist.NSBluetoothAlwaysUsageDescription ||
      'IronMath connects to Meta Ray-Ban Display glasses so Load and Convert stay on the display while your phone is in your pocket.';
    plist.NSLocalNetworkUsageDescription =
      plist.NSLocalNetworkUsageDescription ||
      'IronMath can use Wi-Fi to reach Meta Display glasses when Bluetooth is not enough.';
    plist.NSCameraUsageDescription =
      plist.NSCameraUsageDescription ||
      'Meta AI may ask for glasses permission before IronMath can use the display. IronMath does not record video.';
    plist.NSSupportsLiveActivities = true;
    plist.NSSupportsLiveActivitiesFrequentUpdates = true;
    plist.UISupportedExternalAccessoryProtocols = mergeUnique(plist.UISupportedExternalAccessoryProtocols, [
      'com.meta.ar.wearable',
    ]);
    plist.NSBonjourServices = mergeUnique(plist.NSBonjourServices, ['_bonjour._tcp']);
    plist.LSApplicationQueriesSchemes = mergeUnique(plist.LSApplicationQueriesSchemes, ['fb-viewapp']);
    const modes = plist.UIBackgroundModes;
    plist.UIBackgroundModes = mergeUnique(modes, [
      'bluetooth-central',
      'bluetooth-peripheral',
      'external-accessory',
      'processing',
    ]);
    plist.MWDAT = {
      AppLinkURLScheme: 'ironmath://',
      MetaAppID: '0',
      ClientToken: '',
      TeamID: 'N7LRRN2YGY',
      Analytics: { OptOut: true },
      CrashReporting: { OptOut: true },
    };
    return mod;
  });

  return config;
}

module.exports = withMetaWearables;

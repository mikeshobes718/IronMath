const { withInfoPlist } = require('expo/config-plugins');

const SUFFIX = '.apps.googleusercontent.com';

function reversedClientId(clientId) {
  if (typeof clientId !== 'string' || !clientId.endsWith(SUFFIX)) {
    throw new Error('GIDClientID must be a Google iOS client id');
  }
  return `com.googleusercontent.apps.${clientId.slice(0, -SUFFIX.length)}`;
}

/** Registers the Google Sign-In redirect scheme next to GIDClientID. */
function withGoogleIosClient(config) {
  return withInfoPlist(config, (mod) => {
    const clientId = config.ios?.infoPlist?.GIDClientID;
    if (!clientId) return mod;
    const scheme = reversedClientId(clientId);
    mod.modResults.GIDClientID = clientId;
    const types = Array.isArray(mod.modResults.CFBundleURLTypes) ? mod.modResults.CFBundleURLTypes : [];
    const already = types.some((entry) => (entry.CFBundleURLSchemes || []).includes(scheme));
    if (!already) {
      types.push({ CFBundleURLSchemes: [scheme] });
    }
    mod.modResults.CFBundleURLTypes = types;
    return mod;
  });
}

module.exports = withGoogleIosClient;

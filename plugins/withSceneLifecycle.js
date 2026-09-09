const fs = require('fs');
const path = require('path');
const { withDangerousMod, withInfoPlist } = require('expo/config-plugins');

function withSceneLifecycle(config) {
  config = withDangerousMod(config, [
    'ios',
    async (mod) => {
      const src = path.join(mod.modRequest.projectRoot, 'plugins/templates/AppDelegate.swift');
      const dest = path.join(mod.modRequest.platformProjectRoot, 'IronMath/AppDelegate.swift');
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
      return mod;
    },
  ]);

  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return mod;
  });

  return config;
}

module.exports = withSceneLifecycle;

const { withPodfile, withXcodeProject } = require('expo/config-plugins');

const HOOK = `
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || current.to_f < 17.2
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.2'
        end
      end
    end`;

module.exports = function withPodMinIos(config) {
  config.ios = { ...config.ios, deploymentTarget: '17.2' };
  config = withXcodeProject(config, (mod) => {
    const configs = mod.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configs)) {
      const cfg = configs[key];
      if (!cfg || typeof cfg !== 'object' || !cfg.buildSettings) {
        continue;
      }
      const current = cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET;
      if (current && parseFloat(String(current)) < 17.2) {
        cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '17.2';
      }
    }
    return mod;
  });
  return withPodfile(config, (mod) => {
    if (mod.modResults.contents.includes("IPHONEOS_DEPLOYMENT_TARGET'] = '17.2'")) {
      return mod;
    }
    mod.modResults.contents = mod.modResults.contents.replace(
      /:ccache_enabled => ccache_enabled\?\(podfile_properties\),\n    \)/,
      `:ccache_enabled => ccache_enabled?(podfile_properties),\n    )${HOOK}`
    );
    return mod;
  });
};

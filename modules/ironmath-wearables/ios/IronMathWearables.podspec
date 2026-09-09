require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'IronMathWearables'
  s.version        = package['version']
  s.summary        = 'Meta Ray-Ban Display HUD for IronMath Load and Convert'
  s.description    = s.summary
  s.license        = 'MIT'
  s.author         = 'IronMath'
  s.homepage       = 'https://github.com/mikeshobes718/IronMath'
  s.platforms      = { :ios => '17.2' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/mikeshobes718/IronMath.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '*.{h,m,swift}'

  core = File.join(__dir__, 'Frameworks/MWDATCore.xcframework')
  display = File.join(__dir__, 'Frameworks/MWDATDisplay.xcframework')
  xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  if File.directory?(core) && File.directory?(display)
    s.vendored_frameworks = 'Frameworks/MWDATCore.xcframework', 'Frameworks/MWDATDisplay.xcframework'
    xcconfig['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = '$(inherited) IRONMATH_HAS_DAT'
  end
  s.pod_target_xcconfig = xcconfig
end

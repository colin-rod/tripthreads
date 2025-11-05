/* eslint-disable */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.release': {
      type: 'ios.app',
      build:
        'xcodebuild -workspace ios/mobile.xcworkspace -scheme mobile -configuration Release -sdk iphonesimulator -arch x86_64 -derivedDataPath ios/build',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/mobile.app',
    },
    'android.release': {
      type: 'android.apk',
      build:
        'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release && cd ..',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
  },
  configurations: {
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
}

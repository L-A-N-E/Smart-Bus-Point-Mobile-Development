module.exports = {
  expo: {
    name: 'S.B.P. – Smart Bus Point',
    slug: 'smart-bus-point',
    scheme: 'sbp',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/logo-sbp.png',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.sbp.smartbuspoint',
      config: {
        usesNonExemptEncryption: false,
      },
      infoPlist: {
        NSCameraUsageDescription: 'A câmera é usada para ler o QR Code de uma parada de ônibus.',
        NSLocationWhenInUseUsageDescription:
          'Sua localização é usada para mostrar paradas próximas e acompanhar sua viagem. Ela nunca é enviada para fora do seu aparelho.',
      },
    },
    android: {
      package: 'com.sbp.smartbuspoint',
      adaptiveIcon: {
        backgroundColor: '#F6FAFA',
        foregroundImage: './assets/logo-sbp-adaptive.png',
      },
      predictiveBackGestureEnabled: false,
      permissions: ['CAMERA', 'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
      // Lido do .env (nunca commitado) — exigido pelo react-native-maps no Android.
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      favicon: './assets/logo-sbp.png',
    },
    plugins: [
      ['expo-router', { root: './src/app' }],
      'expo-sqlite',
      'expo-font',
      [
        'expo-splash-screen',
        {
          image: './assets/logo-sbp.png',
          imageWidth: 160,
          resizeMode: 'contain',
          backgroundColor: '#F6FAFA',
          dark: {
            backgroundColor: '#1C2626',
          },
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'A câmera é usada para ler o QR Code de uma parada de ônibus.',
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission: 'Sua localização é usada para mostrar paradas próximas e acompanhar sua viagem.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/logo-sbp.png',
          color: '#2AB2B8',
        },
      ],
    ],
  },
};

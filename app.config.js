export default {
  name: "Minhas Leituras",
  slug: "minhas-leituras",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
  },
  android: {
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.arthurfrc.minhasleituras",
  },
  plugins: [
    "@react-native-google-signin/google-signin",
    "@react-native-community/datetimepicker",
    "expo-font",
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#ffffff",
      },
    ],
    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-7065910212630758~6660657596",
        iosAppId: "ca-app-pub-3940256099942544~1458002511",
        config: {
          googleServicesFile: "./google-services.json",
        },
      },
    ],
  ],
  extra: {
    eas: {
      projectId: "0816fbd0-47e3-423d-b0bf-f6f30d9e118f",
    },
  },
};
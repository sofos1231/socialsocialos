export default {
  expo: {
    name: 'SocialGym',
    slug: 'socialsocial',
    scheme: 'socialgym',
    extra: {
      apiUrl: process.env.API_URL ?? 'http://127.0.0.1:3000',
    },
    ios: {
      bundleIdentifier: 'com.shalio.socialgym', // <-- set this
      infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } },
    },
    android: {
      package: "com.shalev.socialgym",
      usesCleartextTraffic: true,
    },    
  },
};

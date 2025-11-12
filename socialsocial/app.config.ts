import 'dotenv/config';

export default {
  expo: {
    name: 'SocialGym',
    slug: 'socialsocial',
    scheme: 'socialgym',
    extra: {
      apiUrl: process.env.API_URL ?? 'http://127.0.0.1:3000',
    },
    ios: {
      infoPlist: { NSAppTransportSecurity: { NSAllowsArbitraryLoads: true } },
    },
    android: {
      usesCleartextTraffic: true,
    },
  },
};



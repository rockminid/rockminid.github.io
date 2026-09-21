export interface CapacitorConfig {
  appId?: string;
  appName?: string;
  webDir?: string;
  server?: {
    androidScheme?: string;
    cleartext?: boolean;
    [key: string]: any;
  };
  plugins?: Record<string, any>;
  android?: Record<string, any>;
  ios?: Record<string, any>;
}

const config: CapacitorConfig = {
  appId: 'com.kishantiwari.rockminid',
  appName: 'RockMin ID',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      backgroundColor: '#0c0a09',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1c1917',
    },
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;

export interface NativeVpnTlsConfig {
  sni?: string;
  alpn?: string[];
}

export interface NativeVpnAuthConfig {
  username: string;
  jwt: string;
  basicAuth?: {
    username: string;
    password: string;
  };
}

export interface NativeVpnConnectConfig {
  endpointAddress: string;
  endpointHostname: string;
  protocol: string;
  dns: string;
  tls?: NativeVpnTlsConfig;
  auth: NativeVpnAuthConfig;
  transport?: {
    http2?: boolean;
  };
}

export interface NativeVpnBridge {
  connect(config: NativeVpnConnectConfig): Promise<void>;
  disconnect(): Promise<void>;
}

export interface ReactNativeVpnModule {
  connect(config: NativeVpnConnectConfig): Promise<void>;
  disconnect(): Promise<void>;
}

export const createReactNativeVpnBridge = (module: ReactNativeVpnModule): NativeVpnBridge => ({
  connect: async (config) => {
    await module.connect(config);
  },
  disconnect: async () => {
    await module.disconnect();
  },
});

export class TestNativeVpnBridge implements NativeVpnBridge {
  public connected = false;
  public connectCalls = 0;
  public lastConfig: NativeVpnConnectConfig | null = null;

  async connect(config: NativeVpnConnectConfig): Promise<void> {
    this.connected = true;
    this.connectCalls += 1;
    this.lastConfig = config;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }
}

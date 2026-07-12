import { HypercoreManager } from './index';

let HyperswarmClass: any = null;

async function initHyperswarm(): Promise<boolean> {
  if (typeof window !== 'undefined' && !(window as any).Pear) {
    // Avoid loading hyperswarm on standard browsers to prevent bundle issues
    return false;
  }
  if (HyperswarmClass) return true;
  try {
    const hsMod = await import(/* webpackIgnore: true */ 'hyperswarm');
    HyperswarmClass = hsMod.default || hsMod;
    return true;
  } catch (err) {
    console.warn('[P2PClient] Hyperswarm module not available in this environment. Falling back to WebSocket relay.');
    return false;
  }
}

export class P2PClient {
  private ws: WebSocket | null = null;
  private url: string;
  private did: string;
  private topic: string;
  private core: HypercoreManager;
  private isConnected = false;
  private isConnecting = false;
  private onConnectionChange: ((connected: boolean) => void) | null = null;
  private unsubscribeCore: (() => void) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private swarm: any = null;

  private base: any = null;

  constructor(url: string, did: string, topic: string, core: HypercoreManager, base?: any) {
    this.url = url;
    this.did = did;
    this.topic = topic;
    this.core = core;
    this.base = base;

    this.unsubscribeCore = this.core.subscribe((entry) => {
      this.broadcastAppend(entry);
    });
  }

  connect(onConnectionChange?: (connected: boolean) => void) {
    if (onConnectionChange) {
      this.onConnectionChange = onConnectionChange;
    }

    if (this.isConnecting || this.isConnected) {
      return;
    }
    this.isConnecting = true;

    // Check if running inside Pear CLI / runtime environment
    const isPear = (globalThis as any).Pear !== undefined;
    if (isPear) {
      initHyperswarm().then(async (success) => {
        if (success && HyperswarmClass) {
          try {
            console.log('[P2PClient] Initializing real Hyperswarm DHT discovery...');
            this.swarm = new HyperswarmClass();
            
            // Derive a 32-byte topic hash using Node.js crypto
            const crypto = await import('crypto');
            const topicBuffer = crypto.createHash('sha256').update(this.topic).digest();

            this.swarm.join(topicBuffer, {
              lookup: true,
              announce: true
            });

            this.swarm.on('connection', (conn: any, info: any) => {
              console.log('[P2PClient] Direct peer connected via Hyperswarm!');
              // Replicate the entire corestore if autobase is present, else just the single core
              if (this.base && this.base.realStore) {
                conn.pipe(this.base.realStore.replicate(info.client)).pipe(conn);
              } else {
                const realCore = (this.core as any).realCore;
                if (realCore) {
                  conn.pipe(realCore.replicate(info.client)).pipe(conn);
                }
              }
            });

            this.isConnected = true;
            this.isConnecting = false;
            this.onConnectionChange?.(true);
          } catch (err) {
            console.error('[P2PClient] Hyperswarm setup failed, falling back to WebSocket Relay:', err);
            this.connectWebSocket(onConnectionChange);
          }
        } else {
          this.connectWebSocket(onConnectionChange);
        }
      });
    } else {
      this.connectWebSocket(onConnectionChange);
    }
  }

  private connectWebSocket(onConnectionChange?: (connected: boolean) => void) {
    try {
      this.ws = new WebSocket(this.url);
    } catch (e) {
      console.error('[P2PClient] WebSocket connection error', e);
      this.isConnecting = false;
      return;
    }

    this.ws.onopen = () => {
      console.log(`[P2PClient] WebSocket connected, registering did=${this.did}`);
      this.isConnected = true;
      this.isConnecting = false;
      this.onConnectionChange?.(true);

      this.ws?.send(JSON.stringify({
        type: 'register',
        did: this.did,
        topic: this.topic
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case 'registered':
            console.log('[P2PClient] Registration successful, session ID:', data.sessionId);
            this.sendSyncPayload();
            break;

          case 'signal': {
            const { payload } = data;
            if (payload && payload.type === 'sync_append') {
              const entry = payload.entry;
              console.log('[P2PClient] Received remote sync entry:', entry);
              this.applySyncEntry(entry);
            }
            break;
          }

          case 'error':
            console.error('[P2PClient] Server error:', data.message);
            break;
        }
      } catch (err) {
        console.error('[P2PClient] Message parsing failed', err);
      }
    };

    this.ws.onclose = () => {
      console.log('[P2PClient] WebSocket closed, retrying in 5s...');
      this.isConnected = false;
      this.isConnecting = false;
      this.onConnectionChange?.(false);
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 5000);
    };

    this.ws.onerror = () => {
      this.isConnecting = false;
    };
  }

  private sendSyncPayload() {
    this.core.length().then(async len => {
      for (let i = 0; i < len; i++) {
        const entry = await this.core.get(i);
        if (entry) {
          this.broadcastAppend(entry);
        }
      }
    });
  }

  private broadcastAppend(entry: any) {
    if (!this.isConnected) {
      console.log('[P2PClient] broadcastAppend ignored: not connected to WebSocket relay');
      return;
    }

    if (this.swarm) {
      // Hyperswarm broadcasts automatically through core log replication events
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'signal',
        targetDid: 'broadcast_topic_peers',
        payload: {
          type: 'sync_append',
          entry
        }
      }));
    }
  }

  private async applySyncEntry(entry: any) {
    console.log('[P2PClient] applySyncEntry received entry:', entry);
    const len = await this.core.length();
    let exists = false;
    for (let i = 0; i < len; i++) {
      const e = await this.core.get(i);
      if (e && (e.signature === entry.signature && e.timestamp === entry.timestamp && e.author === entry.author)) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      console.log('[P2PClient] Appending new remote entry to local core:', entry.payload);
      await this.core.append(entry.author, entry.payload, entry.signature);
    } else {
      console.log('[P2PClient] Remote entry already exists in local core, ignoring');
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.unsubscribeCore) {
      this.unsubscribeCore();
      this.unsubscribeCore = null;
    }
    this.isConnected = false;
    this.isConnecting = false;

    if (this.swarm) {
      try {
        this.swarm.destroy();
      } catch {}
      this.swarm = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

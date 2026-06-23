import { OfflineProtocol, type DiagnosticEvent } from '@offline-protocol/mesh-sdk';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { getOrCreateUserId } from '../identity/getOrCreateUserId';
import { requestBlePermissions } from '../permissions/requestBlePermissions';

export type MeshStatus = 'idle' | 'starting' | 'running' | 'error';

export interface MeshContextValue {
  protocol: OfflineProtocol | null;
  status: MeshStatus;
  peerCount: number;
  errorMessage: string | null;
}

export const MeshContext = createContext<MeshContextValue | null>(null);

export function MeshProvider({ children }: { children: ReactNode }) {
  const [protocol, setProtocol] = useState<OfflineProtocol | null>(null);
  const [status, setStatus] = useState<MeshStatus>('idle');
  const [peerCount, setPeerCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let activeProtocol: OfflineProtocol | null = null;
    let cancelled = false;

    const onNeighborDiscovered = () => {
      setPeerCount(prev => prev + 1);
    };

    const onNeighborLost = () => {
      setPeerCount(prev => Math.max(0, prev - 1));
    };

    const onDiagnostic = (event: DiagnosticEvent) => {
      if (__DEV__) {
        console.log('[mesh diagnostic]', event);
      }
    };

    async function startMesh() {
      try {
        const userId = await getOrCreateUserId();
        const granted = await requestBlePermissions();

        if (cancelled) {
          return;
        }

        if (!granted) {
          setStatus('error');
          setErrorMessage('Bluetooth permissions denied');
          return;
        }

        activeProtocol = new OfflineProtocol({
          appId: 'olns',
          userId,
          newArchEnabled: false,
          transports: {
            ble: { enabled: true },
          },
          relay: {
            allowRelay: true,
            minBatteryForRelay: 20,
            relayPriority: 'auto',
          },
        } as ConstructorParameters<typeof OfflineProtocol>[0]);

        activeProtocol.on('neighbor_discovered', onNeighborDiscovered);
        activeProtocol.on('neighbor_lost', onNeighborLost);
        activeProtocol.on('diagnostic', onDiagnostic);

        setProtocol(activeProtocol);
        setStatus('starting');

        await activeProtocol.start();

        if (cancelled) {
          return;
        }

        setStatus('running');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'Failed to start mesh',
        );
      }
    }

    startMesh();

    return () => {
      cancelled = true;

      if (activeProtocol) {
        activeProtocol.removeAllListeners();
        void activeProtocol
          .stop()
          .then(() => activeProtocol?.destroy())
          .finally(() => {
            setProtocol(null);
            setPeerCount(0);
            setStatus('idle');
          });
      }
    };
  }, []);

  return (
    <MeshContext.Provider
      value={{ protocol, status, peerCount, errorMessage }}>
      {children}
    </MeshContext.Provider>
  );
}

export function useMesh(): MeshContextValue {
  const value = useContext(MeshContext);

  if (!value) {
    throw new Error('useMesh must be used within MeshProvider');
  }

  return value;
}

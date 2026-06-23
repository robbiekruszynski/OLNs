import {
  MeshServices,
  OfflineProtocol,
  type DiagnosticEvent,
  type ServiceRequestReceivedEvent,
} from '@offline-protocol/mesh-sdk';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getOrCreateUserId } from '../identity/getOrCreateUserId';
import { requestBlePermissions } from '../permissions/requestBlePermissions';
import { getNotes, saveNote } from '../storage/noteStorage';
import type { Note } from '../types/Note';

const NOTE_SERVICE_ID = 'offline-notes.v1';
const NOTE_SERVICE_VERSION = '1.0';

export type MeshStatus = 'idle' | 'starting' | 'running' | 'error';

export interface MeshContextValue {
  protocol: OfflineProtocol | null;
  services: MeshServices | null;
  status: MeshStatus;
  peerCount: number;
  errorMessage: string | null;
  myNotes: Note[];
  loadMyNotes: () => Promise<void>;
  broadcastNote: (note: Note) => Promise<void>;
}

export const MeshContext = createContext<MeshContextValue | null>(null);

export function MeshProvider({ children }: { children: ReactNode }) {
  const [protocol, setProtocol] = useState<OfflineProtocol | null>(null);
  const [services, setServices] = useState<MeshServices | null>(null);
  const [status, setStatus] = useState<MeshStatus>('idle');
  const [peerCount, setPeerCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [myNotes, setMyNotes] = useState<Note[]>([]);

  const serviceListenerRegistered = useRef(false);

  const loadMyNotes = useCallback(async () => {
    const notes = await getNotes();
    setMyNotes(notes);
  }, []);

  const registerServiceRequestListener = useCallback(
    (activeProtocol: OfflineProtocol, meshServices: MeshServices) => {
      if (serviceListenerRegistered.current) {
        return;
      }

      serviceListenerRegistered.current = true;

      activeProtocol.on(
        'service_request_received',
        async (event: ServiceRequestReceivedEvent) => {
          if (event.service_id !== NOTE_SERVICE_ID) {
            return;
          }

          const notes = await getNotes();
          let note: Note | undefined;

          try {
            const requestBody = JSON.parse(event.body || '{}') as {
              noteId?: string;
            };
            if (requestBody.noteId) {
              note = notes.find(item => item.noteId === requestBody.noteId);
            }
          } catch {
            // Request body is not JSON — fall through to single-note lookup.
          }

          if (!note && notes.length === 1) {
            note = notes[0];
          }

          if (!note) {
            return;
          }

          await meshServices.respondToServiceRequest(
            event.request_id,
            event.sender,
            event.service_id,
            'ok',
            JSON.stringify({ body: note.body }),
          );
        },
      );
    },
    [],
  );

  const broadcastNote = useCallback(
    async (note: Note) => {
      if (!protocol || !services) {
        throw new Error('Mesh not ready');
      }

      await services.registerService(NOTE_SERVICE_ID, NOTE_SERVICE_VERSION, {
        noteId: note.noteId,
        type: note.type,
        title: note.title,
        preview: note.preview,
        authorId: note.authorId,
        timestamp: note.timestamp,
        hopOrigin: String(note.hopOrigin),
      });

      await saveNote(note);
      setMyNotes(prev => [
        note,
        ...prev.filter(existing => existing.noteId !== note.noteId),
      ]);
      registerServiceRequestListener(protocol, services);
    },
    [protocol, services, registerServiceRequestListener],
  );

  useEffect(() => {
    let activeProtocol: OfflineProtocol | null = null;
    let activeServices: MeshServices | null = null;
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

        activeServices = new MeshServices();

        activeProtocol.on('neighbor_discovered', onNeighborDiscovered);
        activeProtocol.on('neighbor_lost', onNeighborLost);
        activeProtocol.on('diagnostic', onDiagnostic);

        setProtocol(activeProtocol);
        setServices(activeServices);
        setStatus('starting');

        await activeProtocol.start();

        if (cancelled) {
          return;
        }

        setStatus('running');
        await loadMyNotes();
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
      serviceListenerRegistered.current = false;

      if (activeProtocol) {
        activeProtocol.removeAllListeners();
        void activeProtocol
          .stop()
          .then(() => activeProtocol?.destroy())
          .finally(() => {
            setProtocol(null);
            setServices(null);
            setPeerCount(0);
            setMyNotes([]);
            setStatus('idle');
          });
      }
    };
  }, [loadMyNotes]);

  return (
    <MeshContext.Provider
      value={{
        protocol,
        services,
        status,
        peerCount,
        errorMessage,
        myNotes,
        loadMyNotes,
        broadcastNote,
      }}>
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

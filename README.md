# OLNs - Offline Notes

A mobile app that broadcasts short notes across nearby
devices over a BLE mesh when no network is available.

## Overview

OLNs is a peer-to-peer note relay built for environments
where cellular and Wi-Fi are absent or unreliable. Users
compose typed messages on their phone and publish them to
a local mesh. Other devices in range pick up those notes,
store them, and re-broadcast them to extend reach.

The problem is infrastructure-free communication. Radios,
power grids, and internet backbones can fail or never
exist in the first place. OLNs does not depend on a server,
a carrier, or a fixed access point. Each phone is both a
sender and a relay.

At a high level, the app uses BLE through the Offline
Protocol mesh SDK. A broadcast registers a note as a
discoverable BLE service. Peers scan for those services,
request the full body, increment the hop count, and relay
the note onward. Notes remain on the mesh as long as at
least one device in range continues to carry them.

The app targets field use: disaster response, remote
expeditions, large outdoor gatherings, and any setting
where people need to share short, typed updates without
central infrastructure.

## How It Works

A user writes a note in the Compose screen and broadcasts
it. The app registers the note under the service ID
`offline-notes.v1` with metadata in the service
capabilities and the full body available on request.

Nearby devices run a discovery loop. When they find a
matching service, they send a service request for the
note body. The receiving device saves the note locally,
maps the provider's BLE peer ID to the note's authorId,
and schedules a relay. Relay registration increments
hopOrigin by one and re-advertises the note on the mesh.

Each hop extends the note's range without requiring the
original author to stay in range. After broadcast, a note
is independent of its author. The author can leave the
area and the note continues to propagate through relays.

Notes persist on the mesh as long as at least one device
in range is carrying them. Local storage keeps a copy on
each device that receives or originates a note.

The hop limit is `MAX_HOPS = 6`. A device will not relay
a note once hopOrigin reaches that value. The limit bounds
how far a single note can spread and reduces unbounded
relay chains on dense meshes.

6 was chosen as a reasonable balance between range and network
load. Each hop represents one relay device, so at 6 hops a note
has theoretically passed through 6 intermediate devices beyond
the original author. In a real-world deployment that could
represent a significant physical distance depending on device
density — potentially hundreds of meters in a crowded space.

The number itself is somewhat arbitrary. There is no hard
technical reason it is 6 versus 5 or 8. The thinking was:

- Too low (2-3) and notes do not travel far enough to be useful.
- Too high (10+) and you risk flooding the mesh with redundant
  re-broadcasts in dense environments.
- 6 hits a middle ground that allows meaningful propagation
  without excessive chatter.

Ghost state marks notes whose author is no longer visible
on the mesh. The SDK reports BLE peer IDs. Notes store
authorId, a stable device identity. The app maps peer IDs
to authorIds when notes are discovered. If a note is not
owned by the current user and its authorId is not among
currently active peers, the feed renders it as a ghost
note with muted styling and a SIGNAL LOST indicator. The
note content remains; only the author's live presence is
unknown.

## Architecture

### Core Concepts

MeshContext is the central state layer for mesh
operations. It owns protocol lifecycle (start, stop,
error handling), peer tracking, note broadcast,
discovery, relay, and ghost state detection. Screens
consume it through `useMesh()` and do not talk to the
SDK directly.

The note model is defined in `src/types/Note.ts`:

- `noteId`: unique identifier (UUID)
- `type`: emergency, resource, information, or waypoint
- `title`: short headline
- `body`: full message text
- `preview`: truncated body for service capabilities
- `authorId`: stable device identity from AsyncStorage
- `timestamp`: ISO 8601 broadcast time
- `hopOrigin`: relay count from origin (0 at broadcast)
- `relayedBy`: optional list of device IDs that relayed

The service layer registers each note as a BLE mesh
service. Service ID is `offline-notes.v1`, version
`1.0`. Capabilities carry metadata (noteId, type, title,
preview, authorId, timestamp, hopOrigin). Peers discover
services through the SDK, then request the full body via
`service_request_received` / `service_response_received`.

### Event System

The mesh SDK is event-driven, not synchronous. MeshContext
subscribes to protocol events and reacts in handlers.

Key events:

- `neighbor_discovered`: a BLE peer came in range
- `neighbor_lost`: a BLE peer left range
- `service_discovered`: a matching note service was found
- `service_request_received`: a peer requested note body
- `service_response_received`: a note body response arrived

Discovery runs on a 12-second interval while the mesh is
running. It also triggers immediately after
`neighbor_discovered`, debounced by 1.5 seconds, so new
peers are scanned without waiting for the next interval.

### Relay System

When a device receives a note it has not seen before, it
calls `relayNote`. The relay path checks several guards:
mesh must be running, the note must not be the user's own,
the note must not already appear in `relayedNoteIdsRef`,
and hopOrigin must be below `MAX_HOPS`.

Before registering the relay, the app waits a random delay
between 200 ms and 800 ms (`200 + Math.random() * 600`).
Multiple devices often receive the same note at once; the
delay spreads relay advertisements and reduces BLE
collisions.

After relay, the noteId is added to `relayedNoteIdsRef`
so this device does not relay the same note twice.

### Ghost State

BLE peer IDs come from the SDK and change with sessions.
Notes store `authorId`, a persistent ID from
`getOrCreateUserId()`. On discovery, MeshContext writes
`peerIdToAuthorIdRef.set(provider_peer_id, authorId)`.
When a neighbor is discovered or lost, the app updates
`activeAuthorIdsRef` and exposes the list as
`activePeerIds` (author IDs currently on the mesh).

FeedScreen sets `isGhost` when a note is not owned by the
current user and its authorId is not in that active list.
Ghost notes stay in the feed but display as disconnected
from their origin device.

## Tech Stack

| Technology | Role |
| --- | --- |
| react-native (Expo) | Cross-platform mobile framework |
| @offline-protocol/mesh-sdk | BLE mesh networking layer |
| expo-dev-client | Native development builds |
| react-native-svg | Home screen node network animation |
| AsyncStorage | Local note persistence |
| expo-crypto | UUID generation for note and user IDs |
| react-navigation | Screen routing and tab navigation |
| IBM Plex Mono | Typography throughout |

## Note Types

Four note types exist. Each has a fixed color in the UI.

| Type | Color | Purpose |
| --- | --- | --- |
| EMERGENCY | #E5433D | Urgent information requiring immediate attention |
| RESOURCE | #3DAE6E | Available supplies, services, or assistance |
| INFORMATION | #4FACDE | General announcements or updates |
| WAYPOINT | #E5A030 | Location or directional information |

Type is visual-first. Color coding on cards, compose
labels, and feed filters allows identification before
reading the title or body.

## Project Structure

```
src/
  components/     Note card rendering
  identity/       Stable device identity via AsyncStorage
  mesh/           Protocol lifecycle, context, relay logic
  navigation/     Stack and tab navigators
  permissions/    BLE permission handling per platform
  screens/        Home, Feed, Compose screens
  storage/        Note persistence layer
  theme/          Colors, typography, spacing tokens
  types/          TypeScript interfaces
```

## Getting Started

### Prerequisites

- Node.js 18+
- Java 17 (Android builds)
- Xcode 26+ with Swift 6.2+ (iOS builds)
- Android Studio with SDK 36 (Android builds)
- Expo CLI

### Installation

```bash
git clone https://github.com/robbiekruszynski/OLNs
cd OLNs
npm install
npx expo prebuild
```

### Running on Android

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
npx expo run:android --device
```

### Running on iOS

```bash
npx expo run:ios --device
```

This app requires a development build. It will not run
in Expo Go due to native BLE modules.

## Key Implementation Notes

`newArchEnabled` is `false` in `app.json`. The mesh SDK
requires the legacy React Native architecture.

Gradle 8.8, Kotlin 2.1.20, compileSdk 36, and Java 17
are pinned and tested. Do not upgrade without verifying
mesh SDK compatibility.

iOS requires Xcode 26 and macOS 26 (Tahoe) due to the
Swift 6.2 dependency in ExpoModulesJSI.

The mesh SDK native libraries are device-only. Simulator
builds fail at link time.

Set `ANDROID_HOME` in each terminal session or add it
permanently to `~/.zshrc`.

## Future Plans

### Encrypted Group Channels

The current mesh is public. Notes are readable by any device
that receives them. A planned extension adds optional
group-based encryption using shared passphrases.

A group is a passphrase known to a set of users. Notes tagged
to a group are encrypted before broadcast using that passphrase
as the key. The note travels the mesh identically to a public
note, relayed by any device in range, but the body is unreadable
to devices that do not hold the passphrase.

This preserves the anonymous carrier model. Devices relay
encrypted notes they cannot read, extending range without
exposing content.

Group membership is local only. No server coordinates group
access. The passphrase must be exchanged out of band: verbally,
via text, or written down. This is intentional. The system has
no central authority and no account system.

From a user perspective: create a group by entering a name and
passphrase, share the passphrase with intended recipients through
any channel, and notes sent to that group are only visible to
those who joined with the correct passphrase.

Technical implementation will use symmetric encryption via
expo-crypto, group identity stored in AsyncStorage, and a
group identifier included in the note service capabilities
so non-members can skip fetching the full body.

### Platform Expansion

OLNs currently targets iOS and Android via React Native.
A desktop client for macOS and Linux would extend mesh range
in fixed locations. A laptop left running in a space acts
as a persistent relay node, keeping notes alive longer than
mobile devices which move in and out of range.

### Language Support

The language selector on the home screen currently stubs
eight languages. Full internationalization using i18next
is planned, prioritizing Spanish, French, Portuguese,
Arabic, Chinese, and Japanese based on likely deployment
contexts for offline mesh communication tools.

### Note Expiry

Notes currently persist on the mesh indefinitely as long as
a carrier device is present. A planned expiry system would
let authors set a time-to-live on a note. After that point,
devices stop relaying it and remove it from their local
storage. This prevents stale notes from persisting long
after they are relevant.

## Built With

Offline Protocol mesh SDK.
React Native via Expo.

Built on [Offline Protocol](https://offlineprotocol.com).

import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { fonts } from '../theme/typography';

const NODE_COUNT = 12;
const NODE_DIAMETER = 6;
const NODE_RADIUS = 3;
const ORIGIN_DIAMETER = 10;
const ORIGIN_RADIUS = 5;
const PULSE_START_RADIUS = 4;
const PULSE_END_RADIUS = 60;
const CONNECTION_LINE_MIN_OPACITY = 0.08;
const CONNECTION_LINE_MAX_OPACITY = 0.16;

const NODE_POSITIONS = [
  { x: 0.15, y: 0.08 },
  { x: 0.75, y: 0.12 },
  { x: 0.88, y: 0.28 },
  { x: 0.08, y: 0.35 },
  { x: 0.55, y: 0.18 },
  { x: 0.92, y: 0.52 },
  { x: 0.05, y: 0.62 },
  { x: 0.35, y: 0.72 },
  { x: 0.78, y: 0.68 },
  { x: 0.22, y: 0.88 },
  { x: 0.65, y: 0.85 },
  { x: 0.48, y: 0.42, isOrigin: true },
] as const;

const MESH_EDGES: ReadonlyArray<readonly [number, number]> = [
  [11, 4],
  [11, 3],
  [11, 7],
  [11, 8],
  [0, 3],
  [1, 4],
  [3, 7],
  [6, 7],
  [8, 10],
];

interface NodeData {
  id: number;
  x: number;
  y: number;
  baseOpacity: number;
  pulseDuration: number;
  isOrigin: boolean;
}

interface ConnectionData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
}

function createNodes(width: number, height: number): NodeData[] {
  return NODE_POSITIONS.map((position, id) => ({
    id,
    x: position.x * width,
    y: position.y * height,
    baseOpacity: 'isOrigin' in position ? 1 : 0.4 + (id % 6) * 0.1,
    pulseDuration: 2000 + (id * 173) % 2000,
    isOrigin: 'isOrigin' in position && position.isOrigin === true,
  }));
}

function createConnections(nodes: NodeData[]): ConnectionData[] {
  const maxDistance = Math.max(
    ...MESH_EDGES.map(([from, to]) =>
      Math.hypot(nodes[from].x - nodes[to].x, nodes[from].y - nodes[to].y),
    ),
    1,
  );

  return MESH_EDGES.map(([from, to]) => {
    const distance = Math.hypot(
      nodes[from].x - nodes[to].x,
      nodes[from].y - nodes[to].y,
    );
    const proximity = 1 - distance / maxDistance;

    const isHubEdge = nodes[from].isOrigin || nodes[to].isOrigin;
    const baseOpacity =
      CONNECTION_LINE_MIN_OPACITY +
      proximity * (CONNECTION_LINE_MAX_OPACITY - CONNECTION_LINE_MIN_OPACITY);

    return {
      x1: nodes[from].x,
      y1: nodes[from].y,
      x2: nodes[to].x,
      y2: nodes[to].y,
      opacity: isHubEdge ? Math.min(baseOpacity + 0.03, 0.19) : baseOpacity,
    };
  });
}

function MeshConnection({ connection }: { connection: ConnectionData }) {
  const length = Math.hypot(
    connection.x2 - connection.x1,
    connection.y2 - connection.y1,
  );
  const angle = Math.atan2(
    connection.y2 - connection.y1,
    connection.x2 - connection.x1,
  );
  const midX = (connection.x1 + connection.x2) / 2;
  const midY = (connection.y1 + connection.y2) / 2;

  return (
    <View
      style={[
        styles.connectionLine,
        {
          left: midX - length / 2,
          top: midY - 0.75,
          width: length,
          opacity: connection.opacity,
          transform: [{ rotate: `${angle}rad` }],
        },
      ]}
    />
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [isJoining, setIsJoining] = useState(false);

  const nodes = useMemo(() => createNodes(width, height), [width, height]);
  const connections = useMemo(() => createConnections(nodes), [nodes]);

  const originNode = nodes.find(node => node.isOrigin) ?? nodes[0];

  const fadeAnims = useRef(
    Array.from({ length: NODE_COUNT }, () => new Animated.Value(0)),
  ).current;
  const pulseAnims = useRef(
    Array.from({ length: NODE_COUNT }, () => new Animated.Value(0.65)),
  ).current;
  const baseOpacityAnims = useRef(
    Array.from({ length: NODE_COUNT }, () => new Animated.Value(1)),
  ).current;
  const linesOpacity = useRef(new Animated.Value(0)).current;
  const pulseProgress = useRef(new Animated.Value(0)).current;
  const pulseRingOpacity = useRef(new Animated.Value(0)).current;
  const buttonOpacity = useRef(new Animated.Value(1)).current;

  const pulseLoops = useRef<Animated.CompositeAnimation[]>([]);
  const pulseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    nodes.forEach((node, index) => {
      baseOpacityAnims[index].setValue(node.baseOpacity);
    });

    const fadeAnimation = Animated.parallel(
      fadeAnims.map((anim, index) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          delay: index * 100,
          useNativeDriver: true,
        }),
      ),
    );

    fadeAnimation.start();

    const linesTimer = setTimeout(() => {
      Animated.timing(linesOpacity, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }).start();
    }, 800);

    pulseLoops.current = pulseAnims
      .map((anim, index) => {
        if (nodes[index].isOrigin) {
          anim.setValue(1);
          return null;
        }

        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: nodes[index].pulseDuration / 2,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.65,
              duration: nodes[index].pulseDuration / 2,
              useNativeDriver: true,
            }),
          ]),
        );

        loop.start();
        return loop;
      })
      .filter((loop): loop is Animated.CompositeAnimation => loop !== null);

    function runOriginPulse() {
      pulseProgress.setValue(0);
      pulseRingOpacity.setValue(0.6);

      Animated.parallel([
        Animated.timing(pulseProgress, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseRingOpacity, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start();
    }

    const pulseStartTimer = setTimeout(() => {
      runOriginPulse();
      pulseIntervalRef.current = setInterval(runOriginPulse, 3000);
    }, 1500);

    return () => {
      fadeAnimation.stop();
      clearTimeout(linesTimer);
      clearTimeout(pulseStartTimer);
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
      pulseLoops.current.forEach(loop => loop.stop());
      linesOpacity.stopAnimation();
      pulseProgress.stopAnimation();
      pulseRingOpacity.stopAnimation();
    };
  }, [
    fadeAnims,
    linesOpacity,
    nodes,
    pulseAnims,
    pulseProgress,
    pulseRingOpacity,
    baseOpacityAnims,
  ]);

  const pulseScale = pulseProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [PULSE_START_RADIUS / PULSE_END_RADIUS, 1],
  });

  function handleJoinMesh() {
    if (isJoining) {
      return;
    }

    setIsJoining(true);

    Animated.timing(buttonOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    Animated.parallel(
      pulseAnims.map(anim =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ),
    ).start();

    setTimeout(() => {
      navigation.replace('Main');
    }, 400);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.meshCanvas, { width, height }]}>
        <Animated.View style={[styles.connectionsLayer, { opacity: linesOpacity }]}>
          {connections.map((connection, index) => (
            <MeshConnection key={`line-${index}`} connection={connection} />
          ))}
        </Animated.View>

        <Animated.View
          style={[
            styles.pulseRing,
            {
              left: originNode.x - PULSE_END_RADIUS,
              top: originNode.y - PULSE_END_RADIUS,
              opacity: pulseRingOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />

        {nodes.map((node, index) => {
          const nodeRadius = node.isOrigin ? ORIGIN_RADIUS : NODE_RADIUS;
          const nodeDiameter = node.isOrigin ? ORIGIN_DIAMETER : NODE_DIAMETER;
          const nodeOpacity = node.isOrigin
            ? fadeAnims[index]
            : Animated.multiply(
                Animated.multiply(fadeAnims[index], pulseAnims[index]),
                baseOpacityAnims[index],
              );

          return (
            <Animated.View
              key={node.id}
              style={[
                styles.node,
                {
                  left: node.x - nodeRadius,
                  top: node.y - nodeRadius,
                  width: nodeDiameter,
                  height: nodeDiameter,
                  borderRadius: nodeRadius,
                  opacity: nodeOpacity,
                },
              ]}
            />
          );
        })}
      </View>

      <View
        style={[
          styles.identityOverlay,
          { top: height * 0.35, bottom: height * 0.35 },
        ]}
        pointerEvents="none">
        <Text style={styles.title}>OLNs</Text>
        <Text style={styles.subtitle}>OFFLINE NOTE NETWORK</Text>
        <Text style={styles.tagline}>
          peer-to-peer · mesh relay · no infrastructure
        </Text>
      </View>

      <View
        style={[
          styles.bottomSection,
          { bottom: 80 + insets.bottom },
        ]}>
        <Text style={styles.hint}>BLE · MESH · OFFLINE</Text>
        <Animated.View style={{ opacity: buttonOpacity }}>
          <Pressable
            onPress={handleJoinMesh}
            disabled={isJoining}
            style={({ pressed }) => [
              styles.joinButton,
              pressed && styles.joinButtonPressed,
            ]}>
            {({ pressed }) => (
              <Text
                style={[
                  styles.joinLabel,
                  pressed && styles.joinLabelPressed,
                ]}>
                JOIN MESH
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  meshCanvas: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  connectionsLayer: {
    ...StyleSheet.absoluteFill,
  },
  connectionLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: colors.accent,
  },
  pulseRing: {
    position: 'absolute',
    width: PULSE_END_RADIUS * 2,
    height: PULSE_END_RADIUS * 2,
    borderRadius: PULSE_END_RADIUS,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: 'transparent',
  },
  node: {
    position: 'absolute',
    backgroundColor: colors.accent,
  },
  identityOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 32,
    color: colors.accent,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 12,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 4,
  },
  tagline: {
    marginTop: 8,
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.textMeta,
    letterSpacing: 2,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  bottomSection: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 9,
    color: colors.textMeta,
    letterSpacing: 3,
    marginBottom: 12,
  },
  joinButton: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 4,
    paddingVertical: 14,
    paddingHorizontal: 48,
    backgroundColor: colors.accentDim,
  },
  joinButtonPressed: {
    backgroundColor: colors.accent,
  },
  joinLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 4,
  },
  joinLabelPressed: {
    color: colors.background,
  },
});

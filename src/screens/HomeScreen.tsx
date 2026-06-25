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
const PULSE_START_RADIUS = 4;
const PULSE_END_RADIUS = 60;
const CONNECTION_MAX_PER_NODE = 3;

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
  const centerX = width / 2;
  const centerY = height / 2;
  const spread = Math.min(width, height) * 0.38;
  const nodes: NodeData[] = [
    {
      id: 0,
      x: centerX,
      y: centerY,
      baseOpacity: 0.9,
      pulseDuration: 2800,
      isOrigin: true,
    },
  ];

  for (let index = 1; index < NODE_COUNT; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.pow(Math.random(), 0.65) * spread;

    nodes.push({
      id: index,
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      baseOpacity: 0.4 + Math.random() * 0.6,
      pulseDuration: 2000 + Math.random() * 2000,
      isOrigin: false,
    });
  }

  return nodes;
}

function createConnections(
  nodes: NodeData[],
  maxDistance: number,
): ConnectionData[] {
  const degrees = nodes.map(() => 0);
  const pairs: { i: number; j: number; dist: number }[] = [];

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (dist <= maxDistance) {
        pairs.push({ i, j, dist });
      }
    }
  }

  pairs.sort((a, b) => a.dist - b.dist);

  const connections: ConnectionData[] = [];

  for (const pair of pairs) {
    if (
      degrees[pair.i] >= CONNECTION_MAX_PER_NODE ||
      degrees[pair.j] >= CONNECTION_MAX_PER_NODE
    ) {
      continue;
    }

    degrees[pair.i] += 1;
    degrees[pair.j] += 1;

    connections.push({
      x1: nodes[pair.i].x,
      y1: nodes[pair.i].y,
      x2: nodes[pair.j].x,
      y2: nodes[pair.j].y,
      opacity: 0.3 * (1 - pair.dist / maxDistance),
    });
  }

  return connections;
}

function MeshConnection({
  connection,
  linesOpacity,
}: {
  connection: ConnectionData;
  linesOpacity: Animated.Value;
}) {
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
    <Animated.View
      style={[
        styles.connectionLine,
        {
          left: midX - length / 2,
          top: midY,
          width: length,
          opacity: Animated.multiply(linesOpacity, connection.opacity),
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
  const connections = useMemo(
    () => createConnections(nodes, Math.min(width, height) * 0.28),
    [nodes, width, height],
  );

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

    pulseLoops.current = pulseAnims.map((anim, index) => {
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
    });

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
        {connections.map((connection, index) => (
          <MeshConnection
            key={`line-${index}`}
            connection={connection}
            linesOpacity={linesOpacity}
          />
        ))}

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

        {nodes.map((node, index) => (
          <Animated.View
            key={node.id}
            style={[
              styles.node,
              {
                left: node.x - NODE_RADIUS,
                top: node.y - NODE_RADIUS,
                opacity: Animated.multiply(
                  Animated.multiply(fadeAnims[index], pulseAnims[index]),
                  baseOpacityAnims[index],
                ),
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.identityOverlay} pointerEvents="none">
        <Text style={styles.title}>// OLNs</Text>
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
        <Text style={styles.hint}>BLUETOOTH REQUIRED</Text>
        <Animated.View style={{ opacity: buttonOpacity }}>
          <Pressable
            onPress={handleJoinMesh}
            disabled={isJoining}
            style={({ pressed }) => [
              styles.joinButton,
              pressed && styles.joinButtonPressed,
            ]}>
            <Text style={styles.joinLabel}>JOIN MESH</Text>
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
    width: NODE_DIAMETER,
    height: NODE_DIAMETER,
    borderRadius: NODE_RADIUS,
    backgroundColor: colors.accent,
  },
  identityOverlay: {
    ...StyleSheet.absoluteFill,
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
    backgroundColor: 'transparent',
  },
  joinButtonPressed: {
    backgroundColor: colors.accentDim,
  },
  joinLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 4,
  },
});

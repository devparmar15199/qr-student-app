import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import {
  Text,
  Card,
  List,
  useTheme,
  ActivityIndicator,
  Button,
  FAB,
} from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';
import {
  TabParamList,
  RootStackParamList,
  ScheduleInstance,
  MissedClass,
} from '../types';
import ScreenContainer from '../components/common/ScreenContainer';
import { schedule, attendance, qr, classes } from '../services/api';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

// --- Donut Chart Component ---
const DonutChart = ({
  percentage,
  radius = 60,
  strokeWidth = 12,
  color,
}: {
  percentage: number;
  radius?: number;
  strokeWidth?: number;
  color: string;
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const circumference = 2 * Math.PI * radius;
  const halfCircle = radius + strokeWidth;

  const animation = (toValue: number) => {
    return Animated.timing(animatedValue, {
      toValue,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    animation(percentage);
  }, [percentage]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={{ width: radius * 2, height: radius * 2 }}>
      <Svg
        height={radius * 2}
        width={radius * 2}
        viewBox={`0 0 ${halfCircle * 2} ${halfCircle * 2}`}
      >
        <G rotation="-90" origin={`${halfCircle}, ${halfCircle}`}>
          <Circle
            cx="50%"
            cy="50%"
            stroke="#e6e7e8"
            strokeWidth={strokeWidth}
            r={radius}
            fill="transparent"
          />
          <AnimatedCircle
            cx="50%"
            cy="50%"
            stroke={color}
            strokeWidth={strokeWidth}
            r={radius}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      <View style={styles.chartTextContainer}>
        <Text style={styles.chartPercent} variant="headlineSmall">
          {`${Math.round(percentage)}%`}
        </Text>
      </View>
    </View>
  );
};
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// --- ScheduleItem Component ---
const ScheduleItem = ({
  item,
  onPress,
}: {
  item: ScheduleInstance;
  onPress: () => void;
}) => {
  const { colors } = useTheme();

  const icon = useMemo(() => {
    switch (item.sessionType) {
      case 'lab':
        return 'laptop-outline';
      case 'lecture':
        return 'book-outline';
      case 'project':
        return 'bulb-outline';
      case 'tutorial':
        return 'school-outline';
      default:
        return 'calendar-outline';
    }
  }, [item.sessionType]);

  const isCancelled = item.status === 'cancelled';

  return (
    <List.Item
      title={item.classId.subjectName}
      titleStyle={
        isCancelled
          ? {
            textDecorationLine: 'line-through',
            color: colors.onSurfaceDisabled,
          }
          : { color: colors.onSurface }
      }
      description={`${item.startTime} - ${item.endTime} @ ${item.roomNumber}`}
      descriptionStyle={
        isCancelled ? { textDecorationLine: 'line-through' } : null
      }
      left={(props) => (
        <List.Icon
          {...props}
          color={isCancelled ? colors.onSurfaceDisabled : colors.primary}
          icon={({ color, size }) => (
            <Ionicons name={icon as any} size={size} color={color} />
          )}
        />
      )}
      right={(props) =>
        !isCancelled && <List.Icon {...props} icon="chevron-right" />
      }
      onPress={onPress}
      disabled={isCancelled}
      style={styles.listItem}
    />
  );
};

// --- Main Home Screen Component ---
const HomeScreen = ({ navigation }: Props) => {
  const user = useAuthStore((state) => state.user);
  const { colors } = useTheme();

  // --- Data Fetching ---
  const {
    data: enrolledClasses,
    refetch: refetchEnrolledClasses,
    isRefetching: isRefetchingEnrolledClasses,
  } = useQuery({
    queryKey: ['enrolledClasses', user?._id],
    queryFn: () => classes.getEnrolled,
    enabled: !!user,
  });

  const {
    data: todaySchedule,
    isLoading: isLoadingSchedule,
    refetch: refetchSchedule,
    isRefetching: isRefetchingSchedule,
  } = useQuery({
    queryKey: ['todaySchedule'],
    queryFn: schedule.getToday,
  });

  const {
    data: attendanceSummary,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
    isRefetching: isRefetchingSummary,
  } = useQuery({
    queryKey: ['attendanceSummary'],
    queryFn: attendance.getOverallSummary,
  });

  const {
    data: activeSessions,
    refetch: refetchActiveSessions,
    isRefetching: isRefetchingActiveSessions,
  } = useQuery({
    queryKey: ['activeSessions'],
    queryFn: qr.getActiveSessions,
    refetchInterval: 60000,
  });

  const {
    data: missedClassesData,
    refetch: refetchMissedClasses,
    isRefetching: isRefetchingMissedClasses,
  } = useQuery({
    queryKey: ['missedClasses'],
    queryFn: attendance.getMissedClasses,
  });
  const missedClasses = missedClassesData?.data ?? [];

  // --- Pull-to-Refresh Handler ---
  const onRefresh = useCallback(async () => {
    await Promise.all([
      refetchSchedule(),
      refetchSummary(),
      refetchActiveSessions(),
      refetchMissedClasses(),
      refetchEnrolledClasses(),
    ]);
  }, [
    refetchSchedule,
    refetchSummary,
    refetchActiveSessions,
    refetchMissedClasses,
    refetchEnrolledClasses,
  ]);

  const isRefreshing =
    (isRefetchingSchedule && !isLoadingSchedule) ||
    (isRefetchingSummary && !isLoadingSummary) ||
    isRefetchingActiveSessions ||
    isRefetchingMissedClasses ||
    isRefetchingEnrolledClasses;

  const enrolledCount = enrolledClasses?.length ?? 0;
  const missedCount = missedClassesData?.count ?? 0;

  const renderHeader = () => (
    <View style={styles.header}>
      <Text
        style={[styles.welcomeTitle, { color: colors.onSurfaceVariant }]}
        variant="headlineSmall"
      >
        Welcome back,
      </Text>
      <Text
        style={[styles.welcomeName, { color: colors.onSurface }]}
        variant="headlineLarge"
      >
        {user?.fullName.split(' ')[0] || 'Student'}!
      </Text>
    </View>
  );

  const renderActiveSessionCard = () => {
    if (!activeSessions || activeSessions.length === 0) {
      return null;
    }
    const session = activeSessions[0];
    return (
      <Card
        style={[
          styles.card,
          styles.activeSessionCard,
          { backgroundColor: colors.primaryContainer },
        ]}
        onPress={() => navigation.navigate('Scan')}
        elevation={1}
      >
        <List.Item
          title="Class is Live!"
          titleStyle={{ color: colors.onPrimaryContainer, fontWeight: 'bold' }}
          description={`Tap to join ${session.classId.subjectName}`}
          descriptionStyle={{ color: colors.onPrimaryContainer }}
          left={(props) => (
            <List.Icon
              {...props}
              icon={({ size }) => (
                <Ionicons
                  name="play-circle-outline"
                  size={size * 1.5}
                  color={colors.onPrimaryContainer}
                />
              )}
            />
          )}
          right={(props) => (
            <List.Icon
              {...props}
              icon="chevron-right"
              color={colors.onPrimaryContainer}
            />
          )}
        />
      </Card>
    );
  };

  const renderQuickStats = () => (
    <View>
      <List.Subheader>At a Glance</List.Subheader>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.quickStatsScroll}
      >
        <Card
          style={[styles.quickStatCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Classes')}
          elevation={1}
        >
          <Card.Content>
            {isLoadingSummary ? (
              <ActivityIndicator />
            ) : (
              <Text variant="headlineMedium" style={{ color: colors.primary }}>
                {attendanceSummary?.percentage.toFixed(0) ?? 0}%
              </Text>
            )}
            <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
              Overall
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={[styles.quickStatCard, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Classes')}
          elevation={1}
        >
          <Card.Content>
            {isLoadingEnrolled ? (
              <ActivityIndicator />
            ) : (
              <Text
                variant="headlineMedium"
                style={{ color: colors.onSurface }}
              >
                {enrolledCount}
              </Text>
            )}
            <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
              Enrolled
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={[
            styles.quickStatCard,
            {
              backgroundColor:
                missedCount > 0 ? colors.errorContainer : colors.surface,
            },
          ]}
          onPress={() => navigation.navigate('MissedClasses')}
          elevation={1}
        >
          <Card.Content>
            {isLoadingMissed ? (
              <ActivityIndicator />
            ) : (
              <Text
                variant="headlineMedium"
                style={{
                  color: missedCount > 0 ? colors.onErrorContainer : colors.onSurface,
                }}
              >
                {missedCount}
              </Text>
            )}
            <Text
              variant="labelLarge"
              style={{
                color:
                  missedCount > 0
                    ? colors.onErrorContainer
                    : colors.onSurfaceVariant,
              }}
            >
              Missed
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );

  const renderTodaySchedule = () => (
    <Card
      style={[styles.card, { backgroundColor: colors.surface }]}
      elevation={1}
    >
      {/* --- UPDATED: Card.Title removed, Subheader is used outside --- */}
      <Card.Content>
        {isLoadingSchedule && !isRefetchingSchedule ? (
          <ActivityIndicator
            animating={true}
            color={colors.primary}
            style={styles.loader}
          />
        ) : !todaySchedule || todaySchedule.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="today-outline"
              size={32}
              color={colors.onSurfaceVariant}
            />
            <Text style={[styles.emptyText, { color: colors.onSurfaceVariant }]}>
              No classes scheduled for today.
            </Text>
          </View>
        ) : (
          todaySchedule.map((item) => (
            <ScheduleItem
              key={item._id}
              item={item}
              onPress={() =>
                navigation.navigate('ScheduleDetails', { instanceId: item._id })
              }
            />
          ))
        )}
      </Card.Content>
    </Card>
  );

  const renderAttendanceOverview = () => (
    <Card
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => navigation.navigate('Classes')}
      elevation={1}
    >
      {/* --- UPDATED: Card.Title removed, Subheader is used outside --- */}
      <Card.Content>
        {isLoadingSummary ? (
          <ActivityIndicator
            animating={true}
            color={colors.primary}
            style={styles.loader}
          />
        ) : attendanceSummary ? (
          <View style={styles.overviewContent}>
            <DonutChart
              percentage={attendanceSummary.percentage}
              color={
                attendanceSummary.percentage > 75
                  ? colors.primary
                  : colors.error
              }
            />
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text
                  variant="labelLarge"
                  style={{ color: colors.onSurfaceVariant }}
                >
                  Present
                </Text>
                <Text variant="headlineSmall" style={{ color: colors.primary }}>
                  {attendanceSummary.totalAttendedSessions}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  variant="labelLarge"
                  style={{ color: colors.onSurfaceVariant }}
                >
                  Absent
                </Text>
                <Text variant="headlineSmall" style={{ color: colors.error }}>
                  {attendanceSummary.totalMissedSessions}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  variant="labelLarge"
                  style={{ color: colors.onSurfaceVariant }}
                >
                  Total
                </Text>
                <Text
                  variant="headlineSmall"
                  style={{ color: colors.onSurface }}
                >
                  {attendanceSummary.totalHeldSessions}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={{ color: colors.onSurfaceVariant }}>
            No attendance data yet.
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const renderMissedClasses = () => {
    if (missedClasses.length === 0) {
      return null;
    }
    return (
      <Card
        style={[styles.card, { backgroundColor: colors.surface }]}
        elevation={1}
      >
        {/* --- UPDATED: Card.Title removed, Subheader is used outside --- */}
        <Card.Content>
          {missedClasses.slice(0, 3).map((item: MissedClass) => (
            <List.Item
              key={item._id}
              title={item.classId.subjectName}
              description={`On: ${new Date(
                item.scheduledDate,
              ).toLocaleDateString()}`}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon="calendar-remove"
                  color={colors.error}
                />
              )}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() =>
                navigation.navigate('ScheduleDetails', { instanceId: item._id })
              }
              style={styles.listItem}
            />
          ))}
        </Card.Content>
      </Card>
    );
  };

  const isLoadingEnrolled = enrolledClasses === undefined;
  const isLoadingMissed = missedClassesData === undefined;

  return (
    // --- UPDATED: Set background color here to create contrast ---
    <View
      style={[styles.container, { backgroundColor: colors.elevation.level1 }]}
    >
      <ScreenContainer
        onRefresh={onRefresh}
        refreshing={isRefreshing}
      >
        {renderHeader()}
        {renderActiveSessionCard()}

        {renderQuickStats()}

        {missedClasses.length > 0 && (
          <List.Subheader style={{ color: colors.error }}>
            Action Required
          </List.Subheader>
        )}
        {renderMissedClasses()}

        <View style={styles.subheaderContainer}>
          <List.Subheader style={styles.subheader}>
            Today's Schedule
          </List.Subheader>
          <Button
            mode="text"
            compact
            onPress={() => navigation.navigate('WeekSchedule')}
          >
            View Week
          </Button>
        </View>
        {renderTodaySchedule()}
        <List.Subheader>Attendance Overview</List.Subheader>
        {renderAttendanceOverview()}
      </ScreenContainer>

      <FAB
        icon="qrcode-scan"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        color={colors.onPrimary}
        onPress={() => navigation.navigate('Scan')}
        label="Scan QR"
        animated
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 24,
  },
  welcomeTitle: {
    fontWeight: '300',
  },
  welcomeName: {
    fontWeight: '700',
  },
  card: {
    marginBottom: 20,
  },
  activeSessionCard: {
    marginBottom: 20,
  },
  listItem: {
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  loader: {
    marginVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
  },
  overviewContent: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  chartTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartPercent: {
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  subheaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subheader: {
    paddingLeft: 0,
  },
  quickStatsScroll: {
    flexDirection: 'row',
    paddingBottom: 20,
  },
  quickStatCard: {
    width: 130,
    marginRight: 12,
  },
});

export default HomeScreen;
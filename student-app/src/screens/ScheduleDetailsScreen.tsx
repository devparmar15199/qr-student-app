import React, { useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  Text,
  Card,
  List,
  useTheme,
  ActivityIndicator,
  Snackbar,
  Button,
  Chip,
  Portal, // --- ADDED: Portal for Snackbar
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { schedule, qr } from '../services/api';
import { RootStackParamList, ScheduleInstance } from '../types';
import ScreenContainer from '../components/common/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'ScheduleDetails'>;

const ScheduleDetailsScreen = ({ route, navigation }: Props) => {
  const { instanceId } = route.params;
  const { colors } = useTheme();

  // 1. Fetch the schedule instance details
  const {
    data: details,
    isLoading: isLoadingDetails,
    isError: isErrorDetails,
    error: errorDetails,
    refetch: refetchDetails,
  } = useQuery({
    queryKey: ['scheduleInstance', instanceId],
    queryFn: () => schedule.getInstanceDetails(instanceId),
    // --- BUG FIX: Select the 'details' object, not 'sessionType' ---
    select: (data) => data.details,
  });

  // 2. Fetch the live session status
  const classId = details?.classId?._id;
  const {
    data: sessionStatus,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['sessionStatus', classId],
    queryFn: () => qr.getSessionStatus(classId!),
    enabled: !!classId, // Only run if classId exists
    refetchInterval: 15000,
  });

  // Set the header title
  useEffect(() => {
    if (details?.classId?.subjectName) {
      navigation.setOptions({ title: details.classId.subjectName });
    }
  }, [details, navigation]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    await Promise.all([refetchDetails(), refetchStatus()]);
  }, [refetchDetails, refetchStatus]);

  // Memoized icon for the list
  const sessionIcon = useMemo(() => {
    switch (details?.sessionType) {
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
  }, [details?.sessionType]);

  // Memoized chip color and icon based on status
  const statusInfo = useMemo(() => {
    switch (details?.status) {
      case 'cancelled':
        return {
          icon: 'close-circle',
          color: colors.error,
          text: 'Cancelled',
        };
      case 'completed':
        return {
          icon: 'check-circle',
          color: colors.primary,
          text: 'Completed',
        };
      case 'ongoing':
        return {
          icon: 'play-circle',
          color: colors.tertiary,
          text: 'Ongoing',
        };
      case 'scheduled':
      default:
        return {
          icon: 'clock-outline',
          color: colors.onSurfaceVariant,
          text: 'Scheduled',
        };
    }
  }, [details?.status, colors]);

  // --- Render Logic ---

  if (isLoadingDetails) {
    return (
      <View style={[styles.fullScreenCenter, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isErrorDetails || !details) {
    return (
      <View style={[styles.fullScreenCenter, { backgroundColor: colors.background }]}>
        <Text variant="headlineSmall" style={styles.errorText}>
          Failed to load schedule.
        </Text>
        <Text style={styles.errorSubText}>
          {errorDetails?.message || 'The class could not be found.'}
        </Text>
        <Button
          mode="contained"
          onPress={() => onRefresh()}
          style={styles.retryButton}
        >
          Try Again
        </Button>
      </View>
    );
  }

  return (
    // --- UPDATED: Use themed background color ---
    <View style={[styles.container, { backgroundColor: colors.elevation.level1 }]}>
      <ScreenContainer
        onRefresh={onRefresh}
        refreshing={isLoadingDetails || isLoadingStatus}
      >
        {/* 1. Live Session Card (if active) */}
        {sessionStatus?.isActive && (
          <Card
            style={[
              styles.card,
              { backgroundColor: colors.primaryContainer },
            ]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Scan' })}
            elevation={1}
          >
            <List.Item
              title="Class is Live!"
              titleStyle={{
                color: colors.onPrimaryContainer,
                fontWeight: 'bold',
              }}
              description="Tap here to scan the QR code and join"
              descriptionStyle={{ color: colors.onPrimaryContainer }}
              left={() => (
                <Ionicons
                  name="play-circle-outline"
                  size={40}
                  color={colors.onPrimaryContainer}
                  style={styles.liveIcon}
                />
              )}
            />
          </Card>
        )}

        {/* --- UPDATED: New Hero Block --- */}
        <View
          style={[
            styles.heroContainer,
            { backgroundColor: colors.secondaryContainer },
          ]}
        >
          <View style={styles.heroIconWrapper}>
            <Ionicons
              name={sessionIcon as any}
              size={32}
              color={colors.onSecondaryContainer}
            />
          </View>
          <Text
            variant="headlineLarge"
            style={[styles.heroTitle, { color: colors.onSecondaryContainer }]}
          >
            {details.classId.subjectName}
          </Text>
          <Text
            variant="titleMedium"
            style={[styles.heroSubtitle, { color: colors.onSecondaryContainer }]}
          >
            {details.teacherId.fullName}
          </Text>
          <Chip
            icon={statusInfo.icon}
            style={[
              styles.heroChip,
              { backgroundColor: colors.elevation.level2 },
            ]}
            textStyle={{ color: statusInfo.color, fontWeight: 'bold' }}
            mode="flat"
          >
            {statusInfo.text}
          </Chip>
        </View>

        {/* --- UPDATED: Details Card --- */}
        <Card style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
          <Card.Title
            title="Session Details"
            titleVariant="titleLarge"
          />
          <Card.Content>
            <List.Item
              title={new Date(details.scheduledDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
              description="Date"
              left={() => <List.Icon icon="calendar" />}
            />
            <List.Item
              title={`${details.startTime} - ${details.endTime}`}
              description="Time"
              left={() => <List.Icon icon="clock-outline" />}
            />
            <List.Item
              title={details.roomNumber}
              description="Room"
              left={() => <List.Icon icon="map-marker" />}
            />
          </Card.Content>
        </Card>

        {/* 4. Actions Card */}
        <Card style={[styles.card, { backgroundColor: colors.surface }]} elevation={1}>
          <List.Item
            title="View Full Class Details"
            description="See attendance history for this class"
            left={() => <List.Icon icon="history" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() =>
              navigation.navigate('ClassDetails', {
                classId: details.classId._id,
              })
            }
          />
        </Card>
      </ScreenContainer>

      {/* --- UPDATED: Snackbar in a Portal --- */}
      <Portal>
        <Snackbar
          visible={isErrorDetails}
          onDismiss={() => {}}
          action={{ label: 'Dismiss' }}
        >
          {errorDetails || 'An error occurred.'}
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    width: '60%',
  },
  card: {
    marginBottom: 20,
  },
  liveIcon: {
    marginLeft: 8,
    marginRight: 8,
    alignSelf: 'center',
  },
  // --- REMOVED: chipContainer ---
  // --- ADDED: New Hero Styles ---
  heroContainer: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  heroIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 16,
  },
  heroTitle: {
    fontWeight: 'bold',
  },
  heroSubtitle: {
    opacity: 0.8,
    marginBottom: 16,
  },
  heroChip: {
    alignSelf: 'flex-start', // Don't stretch the chip
  },
});

export default ScheduleDetailsScreen;
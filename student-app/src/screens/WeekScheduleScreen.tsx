import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, SectionList, Pressable } from 'react-native';
import {
  Text,
  ActivityIndicator,
  useTheme,
  Button,
  List,
  Card,
  Avatar,
  Chip,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { schedule } from '../services/api';
import { RootStackParamList, ScheduleInstance } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'WeekSchedule'>;

// Helper to format date
const formatSectionTitle = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
};

// --- UPDATED: Redesigned ScheduleItem to be a Card ---
const ScheduleItemCard = ({
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
        return 'laptop';
      case 'lecture':
        return 'book-outline';
      case 'project':
        return 'lightbulb-on-outline';
      case 'tutorial':
        return 'school-outline';
      default:
        return 'calendar-outline';
    }
  }, [item.sessionType]);

  const isCancelled = item.status === 'cancelled';

  return (
    <View style={styles.itemContainer}>
      <Pressable onPress={onPress} disabled={isCancelled}>
        <Card
          style={[
            styles.card,
            { backgroundColor: colors.surface },
            isCancelled && { opacity: 0.6 },
          ]}
          elevation={1}
        >
          <Card.Title
            title={item.classId.subjectName}
            titleVariant="titleLarge"
            titleStyle={[
              styles.cardTitle,
              isCancelled && { textDecorationLine: 'line-through' },
            ]}
            subtitle={item.teacherId.fullName}
            subtitleStyle={
              isCancelled ? { textDecorationLine: 'line-through' } : null
            }
            left={(props) => (
              <Avatar.Icon
                {...props}
                icon={icon}
                style={{ backgroundColor: colors.primaryContainer }}
                color={colors.onPrimaryContainer}
              />
            )}
            right={(props) =>
              !isCancelled && (
                <List.Icon {...props} icon="chevron-right" style={styles.cardChevron} />
              )
            }
          />
          <Card.Content style={styles.cardContent}>
            <Chip icon="clock-outline" mode="outlined" style={styles.chip}>
              {item.startTime} - {item.endTime}
            </Chip>
            <Chip icon="map-marker-outline" mode="outlined" style={styles.chip}>
              {item.roomNumber}
            </Chip>
          </Card.Content>
        </Card>
      </Pressable>
    </View>
  );
};

const WeekScheduleScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets(); // --- ADDED

  const {
    data: weekSchedule,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['weekSchedule'],
    queryFn: schedule.getWeek,
  });

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Transform data for SectionList (No changes)
  const scheduleSections = useMemo(() => {
    if (!weekSchedule) return [];
    const grouped = weekSchedule.reduce((acc, item) => {
      const date = item.scheduledDate.split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(item);
      return acc;
    }, {} as Record<string, ScheduleInstance[]>);
    return Object.keys(grouped).map((date) => ({
      title: formatSectionTitle(date),
      data: grouped[date],
    }));
  }, [weekSchedule]);

  // --- Render Logic ---

  if (isLoading) {
    return (
      <View style={styles.fullScreenCenter}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.fullScreenCenter}>
        <Text variant="headlineSmall" style={styles.errorText}>
          Failed to load schedule
        </Text>
        <Text style={styles.errorSubText}>
          {error?.message || 'An error occurred.'}
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
    <SectionList
      sections={scheduleSections}
      keyExtractor={(item) => item._id}
      renderItem={({ item }) => (
        <ScheduleItemCard // --- UPDATED: Use new card
          item={item}
          onPress={() =>
            navigation.navigate('ScheduleDetails', { instanceId: item._id })
          }
        />
      )}
      renderSectionHeader={({ section: { title } }) => (
        // --- UPDATED: Use List.Subheader for consistent styling ---
        <List.Subheader
          style={[
            styles.sectionHeader,
            { backgroundColor: colors.elevation.level1, color: colors.primary },
          ]}
        >
          {title}
        </List.Subheader>
      )}
      ListEmptyComponent={
        // --- UPDATED: Removed ScreenContainer ---
        <View style={styles.emptyContainer}>
          <List.Icon icon="calendar-check" color={colors.primary} />
          <Text variant="headlineSmall" style={styles.errorText}>
            All Clear!
          </Text>
          <Text style={styles.errorSubText}>
            You have no classes scheduled for the rest of the week.
          </Text>
        </View>
      }
      onRefresh={onRefresh}
      refreshing={isRefetching}
      stickySectionHeadersEnabled // --- ADDED: Sticky Headers
      style={[styles.container, { backgroundColor: colors.elevation.level1 }]} // --- UPDATED: Background
      contentContainerStyle={{
        paddingBottom: insets.bottom + 40, // --- UPDATED: Use insets
      }}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // --- REMOVED: listContent
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: '30%',
  },
  // --- ADDED: Empty container style ---
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: '30%',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  errorSubText: {
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    width: '60%',
  },
  sectionHeader: {
    fontWeight: 'bold',
    paddingVertical: 8,
    paddingHorizontal: 16,
    // --- REMOVED: marginTop (let SectionList handle it)
  },
  // --- REMOVED: listItem
  // --- ADDED: New Card Styles ---
  itemContainer: {
    paddingHorizontal: 16,
    marginVertical: 8,
  },
  card: {
    borderRadius: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  cardChevron: {
    marginRight: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  chip: {
    // Let chip size naturally
  },
});

export default WeekScheduleScreen;
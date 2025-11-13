import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, Pressable, RefreshControl } from 'react-native';
import {
  Text,
  Card,
  ActivityIndicator,
  Snackbar,
  useTheme,
  Button,
  SegmentedButtons,
  Portal,
  List,
  Avatar,
  Chip,
} from 'react-native-paper';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '../store/useAuthStore';
import { classes } from '../services/api';
import {
  EnrolledClass,
  AvailableClass,
  TabParamList,
  RootStackParamList,
} from '../types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Classes'>,
  NativeStackScreenProps<RootStackParamList>
>;

// --- Helper to get initials for Avatar ---
const getInitials = (name: string = '') => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

const StudentClassCard = ({
  classItem,
  onNavigate,
}: {
  classItem: EnrolledClass;
  onNavigate: () => void;
}) => {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onNavigate}>
      <Card
        style={[styles.card, { backgroundColor: colors.surface }]}
        elevation={1}
      >
        <Card.Title
          title={classItem.subjectName}
          titleVariant="titleLarge"
          titleStyle={styles.cardTitle}
          subtitle={classItem.teacherName || 'N/A'}
          subtitleStyle={styles.cardSubtitle}
          left={(props) => (
            <Avatar.Text
              {...props}
              label={getInitials(classItem.teacherName)}
              style={{ backgroundColor: colors.primaryContainer }}
              color={colors.onPrimaryContainer}
            />
          )}
          right={(props) => (
            <List.Icon {...props} icon="chevron-right" style={[styles.cardChevron, { paddingRight: 6 }]} />
          )}
        />
        <Card.Content style={styles.cardContent}>
          <Chip icon="barcode" mode="outlined" style={styles.chip}>
            {classItem.subjectCode}
          </Chip>
          <Chip icon="calendar-text" mode="outlined" style={styles.chip}>
            Sem: {classItem.semester}
          </Chip>
        </Card.Content>
      </Card>
    </Pressable>
  );
};

const AvailableClassCard = ({
  classItem,
  onEnroll,
  isEnrolling,
}: {
  classItem: AvailableClass;
  onEnroll: (classId: string) => void;
  isEnrolling: boolean;
}) => {
  const { colors } = useTheme();
  return (
    <Card
      style={[styles.card, { backgroundColor: colors.surfaceVariant }]}
      elevation={1}
    >
      <Card.Title
        title={classItem.subjectName}
        titleVariant="titleLarge"
        titleStyle={styles.cardTitle}
        subtitle={classItem.teacher.name}
        subtitleStyle={styles.cardSubtitle}
        left={(props) => (
          <Avatar.Text
            {...props}
            label={getInitials(classItem.teacher.name)}
            style={{ backgroundColor: colors.secondaryContainer }}
            color={colors.onSecondaryContainer}
          />
        )}
      />
      <Card.Content style={styles.cardContent}>
        <Chip icon="barcode" mode="outlined" style={styles.chip}>
          {classItem.subjectCode}
        </Chip>
        <Chip icon="calendar-text" mode="outlined" style={styles.chip}>
          Sem: {classItem.semester}
        </Chip>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button
          mode="contained"
          onPress={() => onEnroll(classItem._id)}
          loading={isEnrolling}
          disabled={isEnrolling}
          icon="plus-circle-outline"
        >
          Enroll
        </Button>
      </Card.Actions>
    </Card>
  );
};

// --- Helper Component for Enrolled List ---
const EnrolledList = ({
  navigation,
  classes,
  isLoading,
  onRefresh,
}: {
  navigation: Props['navigation'];
  classes: EnrolledClass[] | undefined;
  isLoading: boolean;
  onRefresh: () => void;
}) => {
  const { colors } = useTheme();

  if (isLoading && !classes) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      data={classes}
      renderItem={({ item }) => (
        <StudentClassCard
          classItem={item}
          onNavigate={() =>
            navigation.navigate('ClassDetails', { classId: item._id })
          }
        />
      )}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.listContainer}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          {/* --- ADDED: Empty state icon and message --- */}
          <MaterialCommunityIcons
            name="book-open-blank-variant"
            size={80}
            color={colors.onSurfaceVariant}
            style={styles.emptyStateIcon}
          />
          <Text
            style={[styles.noData, { color: colors.onSurfaceVariant }]}
            variant="titleMedium"
          >
            You aren't enrolled in any classes yet.
          </Text>
          <Button onPress={onRefresh} mode="outlined">
            Refresh
          </Button>
        </View>
      }
    />
  );
};

const ClassesScreen = ({ navigation }: Props) => {
  const user = useAuthStore((state) => state.user);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets(); // --- ADDED: For safe area padding

  const [tab, setTab] = useState('enrolled');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const [enrolledResult, availableResult] = useQueries({
    queries: [
      {
        queryKey: ['enrolledClasses', user?._id],
        queryFn: classes.getEnrolled,
        enabled: !!user,
      },
      {
        queryKey: ['availableClasses', user?._id],
        queryFn: classes.getAvailable,
        enabled: !!user,
      },
    ],
  });

  const enrollMutation = useMutation({
    mutationFn: classes.enrollInClass,
    onSuccess: () => {
      setSnackbar({ visible: true, message: 'Enrolled successfully!' });
      queryClient.invalidateQueries({ queryKey: ['enrolledClasses'] });
      queryClient.invalidateQueries({ queryKey: ['availableClasses'] });
      setTab('enrolled');
    },
    onError: (err: any) => {
      setSnackbar({
        visible: true,
        message: err.message || 'Enrollment failed.',
      });
    },
  });

  const onRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['enrolledClasses'] });
    await queryClient.invalidateQueries({ queryKey: ['availableClasses'] });
  }, [queryClient]);

  const isRefreshing =
    enrolledResult.isRefetching || availableResult.isRefetching;

  // --- UPDATED: Combine data based on tab
  const listData =
    tab === 'enrolled' ? enrolledResult.data : availableResult.data;
  const isLoading =
    tab === 'enrolled' ? enrolledResult.isLoading : availableResult.isLoading;

  // --- UPDATED: Main renderItem function
  const renderItem = ({ item }: { item: EnrolledClass | AvailableClass }) => {
    // We add horizontal padding here so it's not on the header/footer
    return (
      <View style={styles.itemContainer}>
        {tab === 'enrolled' ? (
          <StudentClassCard
            classItem={item as EnrolledClass}
            onNavigate={() =>
              navigation.navigate('ClassDetails', { classId: item._id })
            }
          />
        ) : (
          <AvailableClassCard
            classItem={item as AvailableClass}
            onEnroll={enrollMutation.mutate}
            isEnrolling={enrollMutation.isPending}
          />
        )}
      </View>
    );
  };

  // --- UPDATED: Header component
  const ListHeader = () => (
    <View style={styles.headerContainer}>
      <Text
        style={[styles.title, { color: colors.onSurface }]}
        variant="displaySmall"
      >
        Classes
      </Text>
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'enrolled', label: 'My Classes', icon: 'school' },
          { value: 'available', label: 'Find Classes', icon: 'magnify' },
        ]}
        style={styles.segmentedButtons}
      />
      {isLoading && <ActivityIndicator animating={true} style={styles.loader} />}
    </View>
  );

  // --- UPDATED: Empty state component
  const EmptyState = () => {
    if (isLoading) {
      return null; // Loader is in the header
    }

    const { icon, message }: { icon: keyof typeof MaterialCommunityIcons.glyphMap, message: string } = tab === 'enrolled'
        ? {
          icon: 'book-open-blank-variant',
          message: "You aren't enrolled in any classes yet.",
        }
        : {
          icon: 'magnify',
          message: 'No classes available to join right now.',
        };

    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={icon}
          size={80}
          color={colors.onSurfaceVariant}
          style={styles.emptyStateIcon}
        />
        <Text
          style={[styles.noData, { color: colors.onSurfaceVariant }]}
          variant="titleMedium"
        >
          {message}
        </Text>
        <Button onPress={onRefresh} mode="outlined">
          Refresh
        </Button>
      </View>
    );
  };

  return (
    <View
      style={[styles.container, { backgroundColor: colors.elevation.level1 }]}
    >
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 80, // Extra padding for FAB
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      <Portal>
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
          duration={3000}
        >
          {snackbar.message}
        </Snackbar>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontWeight: '700',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  segmentedButtons: {
    marginBottom: 24,
  },
  loader: {
    marginVertical: 20,
  },
  itemContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  listContainer: {},
  card: {
    borderRadius: 12,
  },
  cardTitle: {
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 15,
  },
  cardChevron: {
    marginRight: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 16,
    gap: 12,
  },
  chip: {
  },
  cardActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    justifyContent: 'flex-start',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: '20%',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  noData: {
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
});

export default ClassesScreen;
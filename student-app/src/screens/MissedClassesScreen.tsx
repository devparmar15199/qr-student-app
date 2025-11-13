import React, { useCallback } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import {
  Text,
  ActivityIndicator,
  useTheme,
  Button,
  List,
  Card,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { attendance } from '../services/api';
import { RootStackParamList, MissedClass } from '../types';
import ScreenContainer from '../components/common/ScreenContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'MissedClasses'>;

const MissedClassItem = ({
  item,
  onPress,
}: {
  item: MissedClass;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <List.Item
      title={item.classId.subjectName}
      description={`Missed on: ${new Date(
        item.scheduledDate,
      ).toLocaleDateString()}`}
      titleStyle={{ color: colors.error }}
      descriptionStyle={{ color: colors.onSurfaceVariant }}
      left={(props) => (
        <List.Icon {...props} icon="calendar-remove" color={colors.error} />
      )}
      right={(props) => <List.Icon {...props} icon="chevron-right" />}
      onPress={onPress}
      style={styles.listItem}
    />
  );
};

const MissedClassesScreen = ({ navigation }: Props) => {
  const { colors } = useTheme();

  const {
    data: missedClassesData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['missedClasses'],
    queryFn: attendance.getMissedClasses,
  });

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const renderContent = () => {
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
            Failed to load data
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

    if (!missedClassesData || missedClassesData.count === 0) {
      return (
        <View style={styles.fullScreenCenter}>
          <List.Icon icon="check-circle-outline" color={colors.primary} />
          <Text variant="headlineSmall" style={styles.errorText}>
            No Missed Classes!
          </Text>
          <Text style={styles.errorSubText}>
            Great job! You haven't missed any sessions.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={missedClassesData.data}
        renderItem={({ item }) => (
          <MissedClassItem
            item={item}
            onPress={() =>
              navigation.navigate('ScheduleDetails', { instanceId: item._id })
            }
          />
        )}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <Text variant="bodyLarge" style={styles.listHeader}>
            You have missed {missedClassesData.count} class
            {missedClassesData.count > 1 ? 'es' : ''}.
          </Text>
        }
      />
    );
  };

  return (
    <ScreenContainer onRefresh={onRefresh} refreshing={isRefetching}>
      <Card style={[styles.card, { backgroundColor: colors.surface }]}>
        {renderContent()}
      </Card>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
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
  card: {
    flex: 1,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  listItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
});

export default MissedClassesScreen;
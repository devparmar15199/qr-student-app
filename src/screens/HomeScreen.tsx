import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, ActivityIndicator, Snackbar, Card, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../contexts/AuthContext';
import { classes, schedule } from '../services/api';
import { TabParamList, Class, Schedule } from '../types';
import { StudentHomeContent, TeacherHomeContent, AdminHomeContent } from '../components/home/RoleSpecificContent';

type Props = NativeStackScreenProps<TabParamList, 'Home'>;

// A small component to display an upcoming class item
const UpcomingClassCard = ({ item }: { item: Schedule & { className?: string } }) => {
  return (
    <Card style={styles.card}>
      <Card.Title
        title={item.className || 'Class'}
        subtitle={`${item.dayOfWeek} ${item.startTime} - ${item.endTime} (Room: ${item.roomNumber})`}
      />
    </Card>
  );
}

const HomeScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [upcomingClasses, setUpcomingClasses] = useState<(Schedule & { className?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only fetch classes for students and teachers
    if (user?.role === 'student' || user?.role === 'teacher') {
      const fetchUpcomingClasses = async () => {
        setLoading(true);
        setError('');
        try {
          // Determine which API call to make based on role
          const classApiCall = user.role === 'student' ? classes.getEnrolled : classes.getTeacherClasses;
          const classResponse = await classApiCall();
          const classData: Class[] = classResponse.data;

          // Fetch schedules for all classes in parallel
          const schedulesPromises = classData.map(cls => 
            schedule.getByClass(cls._id).then(res => 
              res.data.map(s => ({ ...s, className: cls.subjectName }))
            )
          );

          const allSchedules = (await Promise.all(schedulesPromises)).flat();
          // TODO: This logic should ideally be on the backend to fetch only upcoming classes
          setUpcomingClasses(allSchedules.slice(0, 3));
        } catch (err: any) {
          setError(err.message || 'Failed to load upcoming classes');          
        } finally {
          setLoading(false);
        }
      };
      fetchUpcomingClasses();
    }
  }, [user]);

  // Use useMemo to prevent re-rendering the role content unnecessarily
  const RoleContent = useMemo(() => {
    switch (user?.role) {
      case 'student': return <StudentHomeContent />;
      case 'teacher': return <TeacherHomeContent />;
      case 'admin': return <AdminHomeContent />;
      default: return null;
    }
  }, [user?.role]); 

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={styles.welcome}>Welcome, {user?.fullName || 'User'}!</Text>

      {loading && <ActivityIndicator animating={true} size="large" style={styles.loader} />}

      {!loading && (
        <>
          {upcomingClasses.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Your Upcoming Classes</Text>
              {upcomingClasses.map((item) => <UpcomingClassCard key={item._id} item={item} />)}
            </View>
          )}
          {RoleContent}
        </>
      )}

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={{ backgroundColor: colors.error }}
      >
        {error}
      </Snackbar>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  card: {
    marginBottom: 12,
  },
  loader: {
    marginTop: 20,
  },
});

export default HomeScreen;
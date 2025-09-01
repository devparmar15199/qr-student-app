import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { classes, Class, schedule, Schedule } from '../services/api';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
};

type TabParamList = {
  Home: undefined;
  Scan: undefined;
  Classes: undefined;
  Profile: undefined;
  AttendanceManagement: { classId: string };
  AuditLogs: undefined;
};

type Props = NativeStackScreenProps<TabParamList, 'Home'>;

const HomeScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [upcomingClasses, setUpcomingClasses] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'student' || user?.role === 'teacher') {
      fetchUpcomingClasses();
    }
  }, [user]);

  const fetchUpcomingClasses = async () => {
    setLoading(true);
    setError('');
    try {
      let classData: Class[] = [];
      if (user?.role === 'student') {
        classData = (await classes.getEnrolled()).data;
      } else if (user?.role === 'teacher') {
        classData = (await classes.getTeacherClasses()).data;
      }

      if (classData.length > 0) {
        const schedules = await Promise.all(
          classData.map(async (cls) => {
            const response = await schedule.getByClass(cls._id);
            return response.data.map((schedule) => ({ ...schedule, className: cls.subjectName }));
          })
        );
        const allSchedules = schedules.flat().slice(0, 3);
        setUpcomingClasses(allSchedules);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load upcoming classes');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!user) {
      return <Text style={styles.noData}>Loading user data...</Text>;
    }

    switch (user.role) {
      case 'student':
        return (
          <>
            <Text style={styles.instructions}>To mark your attendance:</Text>
            <Text style={styles.step}>1. Go to the Scan tab</Text>
            <Text style={styles.step}>2. Allow camera access</Text>
            <Text style={styles.step}>3. Scan the QR code shown by your teacher</Text>
            <Text style={styles.step}>4. Your attendance will be marked automatically</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Scan')}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Go to Scan
            </Button>
          </>
        );
      case 'teacher':
        return (
          <>
            <Text style={styles.instructions}>To manage attendance:</Text>
            <Text style={styles.step}>1. Go to Classes to select a class</Text>
            <Text style={styles.step}>2. Generate a QR code for the session</Text>
            <Text style={styles.step}>3. Students will scan to mark attendance</Text>
            <Text style={styles.step}>4. Review attendance in Attendance Management</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Classes')}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Go to Classes
            </Button>
          </>
        );
      case 'admin':
        return (
          <>
            <Text style={styles.instructions}>Admin Dashboard:</Text>
            <Text style={styles.step}>- View and manage all attendance records</Text>
            <Text style={styles.step}>- Monitor system activity via Audit Logs</Text>
            <Text style={styles.step}>- Manage classes, schedules, and users</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('AuditLogs')}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              View Audit Logs
            </Button>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Classes')}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Manage Classes
            </Button>
          </>
        );
      default:
        return <Text style={styles.noData}>Unknown role</Text>;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, {user?.fullName || 'User'}!</Text>
      {loading ? (
        <ActivityIndicator animating={true} size="large" style={styles.loader} />
      ) : (
        <>
          {user?.role !== 'admin' && upcomingClasses.length > 0 && (
            <>
              <Text style={styles.instructions}>Upcoming Classes:</Text>
              {upcomingClasses.map((classItem) => (
                <View key={classItem._id} style={styles.classItem}>
                  <Text style={styles.classText}>
                    {classItem.classId} ({classItem.sessionType})
                  </Text>
                  <Text style={styles.classText}>
                    {classItem.dayOfWeek} {classItem.startTime} - {classItem.endTime}
                  </Text>
                  <Text style={styles.classText}>Room: {classItem.roomNumber}</Text>
                </View>
              ))}
              <Button
                mode="contained"
                onPress={() => navigation.navigate('Classes')}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                View All Classes
              </Button>
            </>
          )}
          {renderContent()}
        </>
      )}
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={styles.snackbar}
        action={{
          label: 'Dismiss',
          onPress: () => setError(''),
        }}
      >
        {error}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  welcome: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1a1a1a',
  },
  instructions: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#1a1a1a',
  },
  step: {
    fontSize: 16,
    marginBottom: 8,
    paddingLeft: 12,
    color: '#1a1a1a',
  },
  classItem: {
    marginBottom: 16,
    paddingLeft: 12,
  },
  classText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 4,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#6200ea',
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginTop: 20,
  },
  noData: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#1a1a1a',
  },
  snackbar: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
  },
});

export default HomeScreen;
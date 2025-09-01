import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl, View } from 'react-native';
import { Text, Card, ActivityIndicator, Snackbar, Button } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { classes, Class } from '../services/api';

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

type Props = NativeStackScreenProps<TabParamList, 'Classes'>;

const ClassesScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [classList, setClassList] = useState<Class[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClasses = async () => {
    setError('');
    try {
      let response;
      if (user?.role === 'student') {
        response = await classes.getEnrolled();
      } else if (user?.role === 'teacher') {
        response = await classes.getTeacherClasses();
      } else if (user?.role === 'admin') {
        response = await classes.getAll();
      } else {
        throw new Error('Invalid user role');
      }
      setClassList(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch classes');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClasses();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchClasses().finally(() => setLoading(false));
  }, [user]);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} enabled={!loading} />
        }
      >
        <Text style={styles.title}>My Classes</Text>
        {loading ? (
          <ActivityIndicator animating={true} size="large" style={styles.loader} />
        ) : classList.length === 0 ? (
          <Text style={styles.noData}>No classes found</Text>
        ) : (
          classList.map((classItem) => (
            <Card key={classItem._id} style={styles.card}>
              <Card.Content>
                <Text style={styles.className}>{classItem.subjectName}</Text>
                <Text style={styles.classText}>Subject Code: {classItem.subjectCode}</Text>
                <Text style={styles.classText}>Class: {classItem.classNumber}</Text>
                <Text style={styles.classText}>
                  Year: {classItem.classYear}, Semester: {classItem.semester}
                </Text>
                <Text style={styles.classText}>Division: {classItem.division}</Text>
              </Card.Content>
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <Card.Actions>
                  <Button
                    mode="contained"
                    onPress={() =>
                      navigation.navigate('AttendanceManagement', { classId: classItem._id })
                    }
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    labelStyle={styles.buttonLabel}
                  >
                    View Attendance
                  </Button>
                </Card.Actions>
              )}
            </Card>
          ))
        )}
      </ScrollView>
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
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  classText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 4,
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
  button: {
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
  snackbar: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
  },
});

export default ClassesScreen;
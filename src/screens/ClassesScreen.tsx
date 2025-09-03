import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, Snackbar, Button, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { classes } from '../services/api';
import { TabParamList, Class } from '../types';
import ScreenContainer from '../components/common/ScreenContainer';

type Props = NativeStackScreenProps<TabParamList, 'Classes'>;

// A dedicated component for rendering a class card
const ClassCard = ({ classItem, userRole, onNavigate }: { classItem: Class; userRole?: string; onNavigate: () => void; }) => {
  return (
    <Card style={styles.card}>
      <Card.Title
        title={classItem.subjectName}
        subtitle={`Code: ${classItem.subjectCode}`}
        titleStyle={styles.className}
      />
      <Card.Content>
        <Text style={styles.classText}>Class: {classItem.classNumber} (Div: {classItem.division})</Text>
        <Text style={styles.classText}>Year: {classItem.classYear}, Semester: {classItem.semester})</Text>
      </Card.Content>
      {(userRole === 'teacher' || userRole === 'admin') && (
        <Card.Actions>
          <Button mode="contained" onPress={onNavigate}>
            View Attendance
          </Button>
        </Card.Actions>
      )}
    </Card>
  );
};

const ClassesScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [classList, setClassList] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchClasses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const apiCall = {
        student: classes.getEnrolled,
        teacher: classes.getTeacherClasses,
        admin: classes.getAll,
      }[user.role];

      if (apiCall) {
        const response = await apiCall();
        setClassList(response.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  return (
    <ScreenContainer onRefresh={fetchClasses} refreshing={loading}>
      <Text style={styles.title}>My Classes</Text>
      {loading && classList.length === 0 ? (
        <ActivityIndicator animating={true} size="large" style={styles.loader} />
      ) : classList.length === 0 ? (
        <Text style={styles.noData}>No classes found</Text>
      ) : (
        classList.map((classItem) => (
          <ClassCard 
            key={classItem._id}
            classItem={classItem}
            userRole={user?.role}
            onNavigate={() => navigation.navigate('AttendanceManagement', { classId: classItem._id })} 
          />
        ))
      )}
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={{ backgroundColor: colors.error }}
      >
        {error}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
  },
  classText: {
    fontSize: 14,
    marginBottom: 4,
  },
  loader: {
    marginTop: 20,
  },
  noData: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ClassesScreen;
import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, TextInput, Button, RadioButton, ActivityIndicator, Snackbar, Menu } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { attendance, Attendance, AttendanceResponse, classes, Class } from '../services/api';
import { users } from '../services/api';
import { qr } from '../services/api';
import * as Location from 'expo-location';

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

type Props = NativeStackScreenProps<TabParamList, 'AttendanceManagement'>;

const AttendanceManagementScreen = ({ navigation, route }: Props) => {
  const { user } = useAuth();
  const [classId, setClassId] = useState(route.params?.classId || '');
  const [classData, setClassData] = useState<Class[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [stats, setStats] = useState({ total: 0, present: 0, late: 0, absent: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'present' | 'late' | 'absent' | ''>('');
  const [studentId, setStudentId] = useState('');
  const [manualStatus, setManualStatus] = useState<'present' | 'late' | 'absent'>('present');
  const [scheduleId, setScheduleId] = useState('');
  const [students, setStudents] = useState<{ _id: string; fullName: string }[]>([]);

  useEffect(() => {
    const fetchStudentsAndClasses = async () => {
      try {
        const [studentResponse, classesResponse] = await Promise.all([
          users.getStudents(),
          classes.getAll(),
        ]);
        setStudents(studentResponse.data);
        setClassData(classesResponse.data);
        if (!classId && classesResponse.data.length > 0) {
          setClassId(classesResponse.data[0]._id);
        }
      } catch (err) {
        setError('Failed to load students or classes');
      }
    };
    if (user?.role === 'teacher' || user?.role === 'admin') {
      fetchStudentsAndClasses();
    }
  }, []);

  useEffect(() => {
    if (!classId) {
      setError('No class selected');
      setLoading(false);
      return;
    }
    fetchAttendance();
  }, [classId, startDate, endDate, statusFilter]);

  const fetchAttendance = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await attendance.getByClass(classId, {
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter || undefined,
      });
      setAttendances(response.data.attendance);
      setStats(response.data.stats);
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (!classId || !scheduleId) {
      setError('Class ID and Schedule ID are required');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }
      const location = await Location.getCurrentPositionAsync({});
      const response = await qr.generate({
        classId,
        scheduleId,
        teacherId: user!._id,
        coordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      });
      setSuccess(`QR Code generated: ${response.data.token}`);
    } catch (err: any) {
      setError(err.message || 'Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleManualAttendance = async () => {
    if (!studentId || !scheduleId || !classId) {
      setError('Student ID, Schedule ID, and Class ID are required');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await attendance.manual({
        studentId,
        classId,
        scheduleId,
        status: manualStatus,
        attendedAt: new Date().toISOString(),
      });
      setSuccess('Manual attendance submitted successfully');
      setStudentId('');
      setScheduleId('');
      await fetchAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to submit manual attendance');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>This screen is for teachers and admins only</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Home')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Back to Home
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Attendance Management</Text>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setMenuVisible(true)}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {classData.find((c) => c._id === classId)?.classNumber || 'Select Class'}
          </Button>
        }
      >
        {classData.map((cls) => (
          <Menu.Item
            key={cls._id}
            onPress={() => {
              setClassId(cls._id);
              setMenuVisible(false);
            }}
            title={cls.classNumber}
          />
        ))}
      </Menu>
      <View style={styles.filterContainer}>
        <Text style={styles.sectionTitle}>Filters</Text>
        <TextInput
          label="Start Date (YYYY-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
          mode="outlined"
          style={styles.input}
          disabled={loading}
          theme={{ roundness: 8 }}
        />
        <TextInput
          label="End Date (YYYY-MM-DD)"
          value={endDate}
          onChangeText={setEndDate}
          mode="outlined"
          style={styles.input}
          disabled={loading}
          theme={{ roundness: 8 }}
        />
        <Text style={styles.subTitle}>Status</Text>
        <RadioButton.Group
          onValueChange={(value) => setStatusFilter(value as 'present' | 'late' | 'absent' | '')}
          value={statusFilter}
        >
          <View style={styles.radioOption}>
            <RadioButton value="" disabled={loading} />
            <Text style={styles.radioText}>All</Text>
          </View>
          <View style={styles.radioOption}>
            <RadioButton value="present" disabled={loading} />
            <Text style={styles.radioText}>Present</Text>
          </View>
          <View style={styles.radioOption}>
            <RadioButton value="late" disabled={loading} />
            <Text style={styles.radioText}>Late</Text>
          </View>
          <View style={styles.radioOption}>
            <RadioButton value="absent" disabled={loading} />
            <Text style={styles.radioText}>Absent</Text>
          </View>
        </RadioButton.Group>
      </View>
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Statistics</Text>
        <Text>Total: {stats.total}</Text>
        <Text>Present: {stats.present}</Text>
        <Text>Late: {stats.late}</Text>
        <Text>Absent: {stats.absent}</Text>
      </View>
      <View style={styles.manualContainer}>
        <Text style={styles.sectionTitle}>Manual Attendance</Text>
        <Menu
          visible={false} // Controlled by state if needed
          onDismiss={() => {}}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setMenuVisible(true)}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              {students.find((s) => s._id === studentId)?.fullName || 'Select Student'}
            </Button>
          }
        >
          {students.map((student) => (
            <Menu.Item
              key={student._id}
              onPress={() => {
                setStudentId(student._id);
                setMenuVisible(false);
              }}
              title={student.fullName}
            />
          ))}
        </Menu>
        <TextInput
          label="Schedule ID"
          value={scheduleId}
          onChangeText={setScheduleId}
          mode="outlined"
          style={styles.input}
          disabled={loading}
          theme={{ roundness: 8 }}
        />
        <Text style={styles.subTitle}>Status</Text>
        <RadioButton.Group
          onValueChange={(value) => setManualStatus(value as 'present' | 'late' | 'absent')}
          value={manualStatus}
        >
          <View style={styles.radioOption}>
            <RadioButton value="present" disabled={loading} />
            <Text style={styles.radioText}>Present</Text>
          </View>
          <View style={styles.radioOption}>
            <RadioButton value="late" disabled={loading} />
            <Text style={styles.radioText}>Late</Text>
          </View>
          <View style={styles.radioOption}>
            <RadioButton value="absent" disabled={loading} />
            <Text style={styles.radioText}>Absent</Text>
          </View>
        </RadioButton.Group>
        <Button
          mode="contained"
          onPress={handleManualAttendance}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Submit Manual Attendance
        </Button>
        <Button
          mode="contained"
          onPress={handleGenerateQR}
          loading={loading}
          disabled={loading || !classId || !scheduleId}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Generate QR Code
        </Button>
      </View>
      <Text style={styles.sectionTitle}>Attendance Records</Text>
      {loading ? (
        <ActivityIndicator animating={true} size="large" style={styles.loader} />
      ) : attendances.length === 0 ? (
        <Text style={styles.noData}>No attendance records found</Text>
      ) : (
        attendances.map((record) => (
          <Card key={record._id} style={styles.card}>
            <Card.Content>
              <Text style={styles.recordTitle}>Student: {record.studentId.fullName}</Text>
              <Text>Status: {record.status}</Text>
              <Text>Date: {new Date(record.attendedAt).toLocaleDateString()}</Text>
              <Text>Manual: {record.manualEntry ? 'Yes' : 'No'}</Text>
            </Card.Content>
          </Card>
        ))
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
      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={4000}
        style={styles.successSnackbar}
        action={{
          label: 'Dismiss',
          onPress: () => setSuccess(''),
        }}
      >
        {success}
      </Snackbar>
    </ScrollView>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  filterContainer: {
    marginBottom: 20,
  },
  statsContainer: {
    marginBottom: 20,
  },
  manualContainer: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
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
  message: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  snackbar: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
  },
  successSnackbar: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
  },
});

export default AttendanceManagementScreen;
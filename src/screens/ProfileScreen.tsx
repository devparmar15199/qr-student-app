import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

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

type Props = NativeStackScreenProps<TabParamList, 'Profile'>;

const ProfileScreen = ({ navigation }: Props) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    setLoading(true);
    setError('');
    try {
      await logout();
    } catch (err: any) {
      setError(err.message || 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{user?.fullName || 'N/A'}</Text>
        <Text style={styles.label}>Enrollment Number:</Text>
        <Text style={styles.value}>{user?.enrollmentNo || 'Not provided'}</Text>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email || 'N/A'}</Text>
        <Text style={styles.label}>Role:</Text>
        <Text style={styles.value}>{user?.role || 'N/A'}</Text>
      </View>
      {user?.role === 'teacher' && (
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Classes')}
          style={styles.actionButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          disabled={loading}
        >
          Manage Attendance
        </Button>
      )}
      {user?.role === 'admin' && (
        <>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('AuditLogs')}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            disabled={loading}
          >
            View Audit Logs
          </Button>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Classes')}
            style={styles.actionButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
            disabled={loading}
          >
            Manage Classes
          </Button>
        </>
      )}
      <Button
        mode="contained"
        onPress={handleLogout}
        loading={loading}
        disabled={loading}
        style={styles.logoutButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Logout
      </Button>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
    color: '#1a1a1a',
  },
  infoContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  actionButton: {
    marginBottom: 12,
    backgroundColor: '#6200ea',
    borderRadius: 8,
  },
  logoutButton: {
    marginTop: 'auto',
    backgroundColor: '#d32f2f',
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

export default ProfileScreen;
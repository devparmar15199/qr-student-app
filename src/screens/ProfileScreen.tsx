import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Snackbar, useTheme, Avatar } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { TabParamList } from '../types';
import ScreenContainer from '../components/common/ScreenContainer';

type Props = NativeStackScreenProps<TabParamList, 'Profile'>;

const ProfileInfoRow = ({ label, value }: { label: string; value?: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || 'N/A'}</Text>
  </View>
);

const ProfileScreen = ({ navigation }: Props) => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = async () => {
    setLoading(true);
    setError('');
    try {
      await logout();
    } catch (err: any) {
      setError(err.message || 'Failed to log out');
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Avatar.Text size={80} label={user?.fullName.charAt(0) || 'U'} />
        <Text style={styles.title}>{user?.fullName}</Text>
        <Text style={styles.role}>{user?.role}</Text>
      </View>

      <View style={styles.infoContainer}>
        <ProfileInfoRow label="Email" value={user?.email} />
        {user?.role === 'student' && <ProfileInfoRow label="Enrollment No." value={user?.enrollmentNo} />}
      </View>

      <View style={styles.actionsContainer}>
        {/* Role specific action buttons can go here */}
      </View>

      <Button
        mode="contained"
        onPress={handleLogout}
        loading={loading}
        disabled={loading}
        style={[styles.logoutButton, { backgroundColor: colors.error }]}
        icon="logout"
      >
        Logout
      </Button>

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
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
  },
  role: {
    fontSize: 16,
    textTransform: 'capitalize',
    color: '#757575',
  },
  infoContainer: {
    marginBottom: 24,
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
  actionsContainer: {
    flex: 1,
  },
  logoutButton: {
    marginTop: 'auto',
  },
});

export default ProfileScreen;
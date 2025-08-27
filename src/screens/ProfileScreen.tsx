import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

const ProfileScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      if (error instanceof Error) {
        alert('Error logging out: ' + error.message);
      } else {
        alert('Error logging out');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{user?.fullName}</Text>
        
        <Text style={styles.label}>Enrollment Number:</Text>
        <Text style={styles.value}>{user?.enrollmentNo}</Text>
        
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email}</Text>
        
        <Text style={styles.label}>Role:</Text>
        <Text style={styles.value}>{user?.role}</Text>
      </View>
      
      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
      >
        Logout
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  infoContainer: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 'auto',
  },
});

export default ProfileScreen;

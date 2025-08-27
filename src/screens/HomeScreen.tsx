import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.welcome}>Welcome, {user?.fullName}!</Text>
      <Text style={styles.instructions}>
        To mark your attendance:
      </Text>
      <Text style={styles.step}>1. Go to the Scan tab</Text>
      <Text style={styles.step}>2. Allow camera access</Text>
      <Text style={styles.step}>3. Scan the QR code shown by your teacher</Text>
      <Text style={styles.step}>4. Your attendance will be marked automatically</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'flex-start',
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  instructions: {
    fontSize: 18,
    marginBottom: 20,
  },
  step: {
    fontSize: 16,
    marginBottom: 10,
    paddingLeft: 10,
  },
});

export default HomeScreen;

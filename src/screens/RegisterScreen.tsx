import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const RegisterScreen = ({ navigation }: any) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    // Validate required fields
    if (!fullName || !email || !enrollmentNo || !password) {
      alert('Please fill in all fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }

    // Validate enrollment number (assuming it should be alphanumeric)
    const enrollmentRegex = /^[A-Za-z0-9]+$/;
    if (!enrollmentRegex.test(enrollmentNo)) {
      alert('Enrollment number should only contain letters and numbers');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting registration with:', {
        enrollmentNo,
        email,
        password: '***',
        fullName,
        role: 'student'
      });

      await register({
        enrollmentNo,
        email,
        password,
        fullName,
      });
    } catch (error) {
      console.error('Registration error details:', error);
      if (axios.isAxiosError(error) && error.response?.data) {
        // Handle API error response
        const errorMessage = typeof error.response.data === 'object' && 'error' in error.response.data
          ? error.response.data.error
          : 'Server error';
        alert('Registration failed: ' + errorMessage);
      } else if (error instanceof Error) {
        alert('Registration failed: ' + error.message);
      } else {
        alert('Registration failed: Unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Enrollment Number"
        value={enrollmentNo}
        onChangeText={setEnrollmentNo}
        mode="outlined"
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        style={styles.input}
        secureTextEntry
      />
      <Button
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        style={styles.button}
      >
        Register
      </Button>
      <Button
        mode="text"
        onPress={() => navigation.navigate('Login')}
        style={styles.button}
      >
        Already have an account? Login
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
  },
});

export default RegisterScreen;

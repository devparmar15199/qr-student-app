import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Text, Snackbar, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async () => {
    setError('');
    if (!enrollmentNo && !email) {
      setError('Enrollment number or email is required');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (enrollmentNo) {
      const enrollmentRegex = /^[A-Z]{2}\d{2}[A-Z]{4}\d{3}$/;
      if (!enrollmentRegex.test(enrollmentNo)) {
        setError('Enrollment number must be in the format ETXXBTXX000');
        return;
      }
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await login({ enrollmentNo: enrollmentNo || undefined, email: email || undefined, password });
      navigation.replace('MainTabs');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Student Attendance App</Text>
      <TextInput
        label="Enrollment Number (optional)"
        value={enrollmentNo}
        onChangeText={setEnrollmentNo}
        mode="outlined"
        style={styles.input}
        autoCapitalize="characters"
        disabled={loading}
        theme={{ roundness: 8 }}
      />
      <TextInput
        label="Email (optional)"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        disabled={loading}
        theme={{ roundness: 8 }}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        style={styles.input}
        secureTextEntry
        disabled={loading}
        theme={{ roundness: 8 }}
      />
      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        disabled={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Login
      </Button>
      <Button
        mode="text"
        onPress={() => navigation.navigate('Register')}
        disabled={loading}
        style={styles.textButton}
        labelStyle={styles.textButtonLabel}
      >
        Don't have an account? Register
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
      {loading && <ActivityIndicator animating={true} size="large" style={styles.loader} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 30,
    color: '#1a1a1a',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 16,
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
  textButton: {
    marginTop: 12,
  },
  textButtonLabel: {
    fontSize: 14,
    color: '#6200ea',
  },
  snackbar: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
  },
  loader: {
    marginTop: 20,
  },
});

export default LoginScreen;
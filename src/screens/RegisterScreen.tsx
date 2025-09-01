import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { TextInput, Button, Text, Snackbar, RadioButton, ActivityIndicator } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Camera, useCameraDevice, useCameraPermission, useFrameProcessor, Frame } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { getFaceEmbedding, useFaceDetection } from '../utils/tflite';
import { useAuth } from '../contexts/AuthContext';
import * as FileSystem from 'expo-file-system';

type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const detectFaces = useFaceDetection();
  
  // JS function to handle face detection and photo capture
  const handleFaceDetected = useCallback(
    async (faces: any[]) => {
      if (loading || faceEmbedding) return;
      setLoading(true);
      try {
        if (!cameraRef.current) throw new Error('Camera not ready');
        if (faces.length === 0) {
          setLoading(false);
          return;
        }
        // Take photo from camera ref
        const photo = await cameraRef.current.takePhoto();
        if (!photo) throw new Error('Failed to take photo');
        const photoPath = `${FileSystem.cacheDirectory}face_${Date.now()}.jpg`;
        await FileSystem.moveAsync({
          from: photo.path,
          to: photoPath,
        });
        // Get embedding from photo and first face
        const embedding = await getFaceEmbedding(photoPath, faces[0]);
        setFaceEmbedding(embedding);
        setSuccess('Face detected successfully');
        await FileSystem.deleteAsync(photoPath);
      } catch (err: any) {
        setError(err.message || 'Failed to process face');
      } finally {
        setLoading(false);
      }
    },
    [loading, faceEmbedding]
  );

  const frameProcessor = useFrameProcessor((frame: Frame) => {
    'worklet';
    if (loading || faceEmbedding) return;
    const faces = detectFaces(frame);
    if (faces.length > 0) {
      runOnJS(handleFaceDetected)(faces);
    }
  }, [loading, faceEmbedding, detectFaces, handleFaceDetected]);

  const handleRegister = async () => {
    setError('');
    setSuccess('');

    if (!fullName || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (enrollmentNo) {
      const enrollmentRegex = /^[A-Z]{2}\d{2}[A-Z]{4}\d{3}$/;
      if (!enrollmentRegex.test(enrollmentNo)) {
        setError('Enrollment number must be in the format ETXXBTXX000');
        return;
      }
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/;
    if (!passwordRegex.test(password)) {
      setError('Password must be at least 6 characters with at least one uppercase letter, one lowercase letter, and one number');
      return;
    }
    if (role === 'student' && !faceEmbedding) {
      setError('Face capture is required for students');
      return;
    }

    setLoading(true);
    try {
      await register({
        enrollmentNo: enrollmentNo || undefined,
        email,
        password,
        fullName,
        role,
        faceEmbedding: faceEmbedding || undefined,
      });
      setSuccess('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigation.replace('Login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return <ActivityIndicator animating={true} size="large" style={styles.loader} />;
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Camera permission is required</Text>
        <Button
          mode="contained"
          onPress={requestPermission}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Grant Permission
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.textButton}
          labelStyle={styles.textButtonLabel}
        >
          Back to Login
        </Button>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>No Front Camera Available</Text>
        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.textButton}
          labelStyle={styles.textButtonLabel}
        >
          Back to Login
        </Button>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Image
        source={require('../../assets/icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        style={styles.input}
        disabled={loading}
        theme={{ roundness: 8 }}
      />
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
        label="Email"
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
      <View style={styles.roleContainer}>
        <Text style={styles.roleLabel}>Role</Text>
        <RadioButton.Group onValueChange={(value) => setRole(value as 'student' | 'teacher' | 'admin')} value={role}>
          <View style={styles.radioOption}>
            <RadioButton value="student" disabled={loading} />
            <Text style={styles.radioText}>Student</Text>
          </View>
          <View style={styles.radioOption}>
            <RadioButton value="teacher" disabled={loading} />
            <Text style={styles.radioText}>Teacher</Text>
          </View>
          <View style={styles.radioOption}>
            <RadioButton value="admin" disabled={loading} />
            <Text style={styles.radioText}>Admin</Text>
          </View>
        </RadioButton.Group>
      </View>
      {role === 'student' && (
        <View style={styles.cameraContainer}>
          <Text style={styles.sectionTitle}>Capture Face (Required for Students)</Text>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            device={device}
            isActive={!loading && !faceEmbedding}
            frameProcessor={frameProcessor}
            fps={5}
            photo={true}
          />
          {faceEmbedding && (
            <Text style={styles.successText}>Face captured successfully</Text>
          )}
        </View>
      )}
      <Button
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        disabled={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Register
      </Button>
      <Button
        mode="text"
        onPress={() => navigation.navigate('Login')}
        disabled={loading}
        style={styles.textButton}
        labelStyle={styles.textButtonLabel}
      >
        Already have an account? Login
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
  roleContainer: {
    marginBottom: 20,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1a1a1a',
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
  cameraContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  camera: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#4caf50',
    textAlign: 'center',
    marginBottom: 12,
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
  textButton: {
    marginTop: 12,
  },
  textButtonLabel: {
    fontSize: 14,
    color: '#6200ea',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  snackbar: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
  },
  successSnackbar: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
  },
  loader: {
    marginTop: 20,
  },
});

export default RegisterScreen;
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, Snackbar, RadioButton, ActivityIndicator, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../contexts/AuthContext';
import { RootStackParamList } from '../types';
import AuthContainer from '../components/Auth/AuthContainer';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
  const { register } = useAuth();
  const { colors } = useTheme();

  // State for form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);

  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for Camera Permissions
  const [permission, requestPermission] = useCameraPermissions();

  const handleCaptureFace = () => {
    // --- Placeholder for Face Capture Logic ---
    // In a real app, you would:
    // 1. Take a picture using the cameraRef.
    // 2. Process the picture with your TFLite model to get the embedding.
    // 3. Set the embedding to state.
    console.log('Simulating face capture...');
    // For demonstration, we'll set a mock embedding.
    const mockEmbedding = Array.from({ length: 128 }, () => Math.random());
    setFaceEmbedding(mockEmbedding);
    setSuccess('Face captured successfully!');
  };

  const handleRegister = async () => {
    // (Validation logic remains similar but can be further simplified)
    if (role === 'student' && !faceEmbedding) {
      setError('Face capture is required for student registration.');
      return;
    }
    setLoading(true);
    try {
      await register({
        fullName,
        email,
        password,
        role,
        enrollmentNo,
        faceEmbedding: faceEmbedding || undefined,
      });
      setSuccess('Registration successful! Redirecting...');
      setTimeout(() => navigation.replace('Login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // 1. Show a loader while checking for permissions
  if (!permission) {
    return <ActivityIndicator style={styles.centered} />;
  }

  // 2. Show a permission request screen if not granted
  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={styles.permissionText}>We need camera access to register students.</Text>
        <Button mode="contained" onPress={requestPermission}>Grant Permission</Button>
        <Button mode="text" onPress={() => navigation.goBack()}>Back to Login</Button>
      </View>
    );
  }

  // 3. Show the registration form once permission is granted
  return (
    <AuthContainer title="Create Account">
      {/* Form Inputs  */}
      <TextInput 
        label="Full Name" 
        value={fullName} 
        onChangeText={setFullName}
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        mode="outlined"
        style={styles.input}
      />
      <TextInput
        label="Enrollment No. (Students)"
        value={enrollmentNo}
        onChangeText={setEnrollmentNo}
        autoCapitalize="characters"
        mode="outlined"
        style={styles.input}
      />

      {/* Role Selection  */}
      <Text style={styles.roleLabel}>Select your role:</Text>
      <RadioButton.Group onValueChange={(v) => setRole(v as any)} value={role}>
        <View style={styles.radioOption}>
          <RadioButton value="student" />
          <Text>Student</Text>
        </View>
        <View style={styles.radioOption}>
          <RadioButton value="teacher" />
          <Text>Teacher</Text>
        </View>
      </RadioButton.Group>

      {/* Camera View for Students  */}
      {role === 'student' && (
        <View style={styles.cameraSection}>
          <Text style={styles.roleLabel}>Face Registration</Text>
          <CameraView style={styles.camera} facing="front" />
          <Button icon="camera" mode="outlined" onPress={handleCaptureFace} disabled={!!faceEmbedding}>
            {faceEmbedding ? 'Face Captured' : 'Capture Face'}
          </Button>
        </View>
      )}

      {/* Action Buttons  */}
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
        disabled={loading}
      >
        Already have an account? Login
      </Button>

      {/* Snackbars  */}
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={{ backgroundColor: colors.error }}
      >
        {error}
      </Snackbar>
      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={4000}
        style={{ backgroundColor: 'green' }}
      >
        {success}
      </Snackbar>
    </AuthContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    paddingVertical: 4,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraSection: {
    marginVertical: 20,
  },
  camera: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
});

export default RegisterScreen;
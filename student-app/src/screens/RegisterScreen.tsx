import React, { useState, useRef } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Text, Snackbar, ActivityIndicator, ProgressBar, useTheme, Menu, TouchableRipple, SegmentedButtons } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from '../store/useAuthStore';
import { RootStackParamList, RegistrationData } from '../types';
import AuthContainer from '../components/auth/AuthContainer';

// Dropdown Options
const YEAR_OPTIONS = [
  { label: '1st Year', value: '1' },
  { label: '2nd Year', value: '2' },
  { label: '3rd Year', value: '3' },
  { label: '4th Year', value: '4' },
];
const SEMESTER_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8'];

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const RegisterScreen = ({ navigation }: Props) => {
  const register = useAuthStore((state) => state.register);
  const { colors } = useTheme();

  // Form Field State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [enrollmentNo, setEnrollmentNo] = useState('');
  const [password, setPassword] = useState('');
  const [faceImageUri, setFaceImageUri] = useState<string | null>(null);

  // Selector State
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);

  // UI State
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1); // 1. Info, 2. Face Capture
  const cameraRef = useRef<CameraView>(null);

  // Menu State
  const [semesterMenuVisible, setSemesterMenuVisible] = useState(false);

  // State for Camera Permissions
  const [permission, requestPermission] = useCameraPermissions();

  const handleCaptureFace = async () => {
    if (!cameraRef.current) {
      setError('Camera not ready.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        exif: false,
      });

      if (photo && photo.uri) {
        setFaceImageUri(photo.uri);
        setSuccess('Face captured successfully!');
      } else {
        throw new Error('Failed to capture photo');
      }
    } catch (err: any) {
      setError('Failed to capture face. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    // Validation
    if (!fullName || !email || !password || !enrollmentNo || !selectedYear || !selectedSemester) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!faceImageUri) {
      setError('Face capture is required for student registration.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();

      // 2. Append all the text fields
    formData.append('fullName', fullName);
    formData.append('email', email.trim());
    formData.append('password', password);
    formData.append('role', 'student');
    formData.append('enrollmentNo', enrollmentNo.trim());
    formData.append('classYear', selectedYear);
    formData.append('semester', selectedSemester);


    formData.append('faceImage', {
      uri: faceImageUri,
      name: 'face.jpg',
      type: 'image/jpeg',
    } as any);
      // const base64 = await FileSystem.readAsStringAsync(faceImageUri, {
      //   encoding: 'base64',
      // });
      // const faceImageBase64 = `data:image/jpeg;base64,${base64}`;

      // const registrationData: RegistrationData = {
      //   fullName,
      //   email: email.trim(),
      //   password,
      //   role: 'student',
      //   enrollmentNo: enrollmentNo.trim(),
      //   classYear: selectedYear,
      //   semester: selectedSemester,
      //   faceImage: faceImageBase64,
      // };
      await register(formData);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  // --- Permission Handlers ---
  if (!permission) {
    return <ActivityIndicator style={styles.centered} />;
  }

  if (!permission.granted) {
    return (
      <AuthContainer
        title="Camera Access Required"
        subtitle="We need camera access for face registration to verify your identity."
      >
        <Button
          mode="contained"
          onPress={requestPermission}
          style={styles.button}
        >
          Grant Permission
        </Button>
        <Button mode="text" onPress={() => navigation.goBack()}>
          Back to Login
        </Button>
      </AuthContainer>
    );
  }

  // Custom Selector Component (for semester)
  const renderSelector = (
    label: string,
    value: string | null,
    options: string[],
    visible: boolean,
    onOpen: () => void,
    onClose: () => void,
    onSelect: (item: string) => void
  ) => (
    <Menu
      visible={visible}
      onDismiss={onClose}
      anchor={
        <TouchableRipple onPress={onOpen}>
          <TextInput
            label={label}
            value={value || ''}
            mode="outlined"
            style={styles.input}
            editable={false}
            pointerEvents="none"
            right={<TextInput.Icon icon="menu-down" />}
          />
        </TouchableRipple>
      }
    >
      {options.map((item) => (
        <Menu.Item
          key={item}
          onPress={() => onSelect(item)}
          title={`Semester ${item}`}
        />
      ))}
    </Menu>
  );

  // --- Step 1: Details Form ---
  const renderStepOne = () => (
    <>
      <Text
        variant="titleMedium"
        style={[styles.stepTitle, { color: colors.onSurface }]}
      >
        Step 1 of 2: Your Details
      </Text>
      <TextInput
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon icon="account" />}
      />
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon icon="email" />}
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!passwordVisible}
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon icon="lock" />}
        right={
          <TextInput.Icon
            icon={passwordVisible ? 'eye-off' : 'eye'}
            onPress={() => setPasswordVisible(!passwordVisible)}
          />
        }
      />
      <TextInput
        label="Enrollment No."
        value={enrollmentNo}
        onChangeText={setEnrollmentNo}
        autoCapitalize="characters"
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon icon="card-account-details" />}
      />

      <Text
        variant="labelLarge"
        style={[styles.selectorLabel, { color: colors.onSurfaceVariant }]}
      >
        Class Year
      </Text>
      <SegmentedButtons
        value={selectedYear || ''}
        onValueChange={setSelectedYear}
        buttons={YEAR_OPTIONS}
        style={styles.segmentedButtons}
      />

      {renderSelector(
        'Semester',
        selectedSemester,
        SEMESTER_OPTIONS,
        semesterMenuVisible,
        () => setSemesterMenuVisible(true),
        () => setSemesterMenuVisible(false),
        (item) => {
          setSelectedSemester(item);
          setSemesterMenuVisible(false);
        }
      )}

      <Button
        mode="contained"
        onPress={() => setStep(2)}
        disabled={loading || !fullName || !email || !password || !enrollmentNo || !selectedYear || !selectedSemester}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Continue to Face Capture
      </Button>
    </>
  );

  // Step 2: Face Capture
  const renderStepTwo = () => (
    <>
      <Text
        variant="titleMedium"
        style={[styles.stepTitle, { color: colors.onSurface }]}>
        Step 2 of 2: Face Recognition
      </Text>
      <Text style={[styles.guidanceText, { color: colors.onSurfaceVariant }]}>
        Align your face in the center of the frame and tap 'Capture'.
      </Text>
      <View
        style={[
          styles.cameraContainer,
          {
            borderColor: faceImageUri ? colors.primary : colors.outline,
            backgroundColor: colors.surfaceVariant,
          },
        ]}
      >
        {faceImageUri ? (
          <Image source={{ uri: faceImageUri }} style={styles.cameraPreview} />
        ) : (
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="front"
            onCameraReady={() => console.log('Camera ready')}
            onMountError={(e) => console.error('Camera mount error', e)}
          />
        )}
      </View>

      {faceImageUri ? (
        <Button
          icon="camera-retake"
          mode="outlined"
          onPress={() => {
            setFaceImageUri(null);
            setSuccess('');
          }}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Retake Photo
        </Button>
      ) : (
        <Button
          icon="camera"
          mode="contained-tonal"
          onPress={handleCaptureFace}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Capture Face
        </Button>
      )}

      <Button
        mode="contained"
        onPress={handleRegister}
        loading={loading}
        disabled={loading || !faceImageUri}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Register
      </Button>
    </>
  );

  return (
    <View style={[styles.flexContainer, { backgroundColor: colors.background }]}>
      <AuthContainer title="Create Account">
        <ProgressBar
          progress={step / 2}
          color={colors.primary}
          style={styles.progressBar}
        />

        {step === 1 ? renderStepOne() : renderStepTwo()}

        <Button
          mode="text"
          onPress={() => (step > 1 ? setStep(1) : navigation.navigate('Login'))}
          disabled={loading}
          style={styles.textButton}
        >
          {step > 1 ? 'Back to Details' : 'Already have an account? Login'}
        </Button>
      </AuthContainer>

      {/* Snackbars */}
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={{ backgroundColor: colors.errorContainer }}
        action={{
          label: 'Dismiss',
          onPress: () => setError(''),
          textColor: colors.onErrorContainer,
        }}
      >
        <Text style={{ color: colors.onErrorContainer }}>{error}</Text>
      </Snackbar>
      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={3000}
        style={{ backgroundColor: colors.primaryContainer }}
        action={{
          label: 'Dismiss',
          onPress: () => setSuccess(''),
          textColor: colors.onPrimaryContainer,
        }}
      >
        <Text style={{ color: colors.onPrimaryContainer }}>{success}</Text>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
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
    marginBottom: 12,
  },
  selectorLabel: {
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 12,
  },
  segmentedButtons: {
    marginBottom: 12,
  },
  button: {
    marginTop: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  textButton: {
    marginTop: 12,
  },
  stepTitle: {
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  guidanceText: {
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 14,
    lineHeight: 20,
  },
  progressBar: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 4,
    height: 8,
  },
  cameraContainer: {
    width: 280,
    height: 280,
    marginBottom: 16,
    borderRadius: 140,
    overflow: 'hidden',
    borderWidth: 2,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  cameraPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});

export default RegisterScreen;
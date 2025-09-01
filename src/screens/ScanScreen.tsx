import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Snackbar } from 'react-native-paper';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { scanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { attendance, qr, QRValidateResponse } from '../services/api';
import { getFaceEmbedding } from '../utils/tflite';
import { runOnJS } from 'react-native-reanimated';

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

type Props = NativeStackScreenProps<TabParamList, 'Scan'>;

const ScanScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const device = useCameraDevice(facing);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    setError('');
    const cameraStatus = await Camera.requestCameraPermission();
    setHasCameraPermission(cameraStatus === 'granted');
    const locationStatus = await Location.requestForegroundPermissionsAsync();
    setHasLocationPermission(locationStatus.status === 'granted');
  };

  const requestPermissions = async () => {
    setError('');
    await checkPermissions();
    if (!hasCameraPermission || !hasLocationPermission) {
      setError('Please grant camera and location permissions to proceed');
    }
  };

  const changeFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const handleBarCodeScanned = useCallback(
    async (barcodes: any[]) => {
      if (loading || scanned || barcodes.length === 0) return;
      const qrCode = barcodes[0]?.value;
      if (!qrCode) return;

      setScanned(true);
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        // Validate QR code
        const validateResponse = await qr.validate({ token: qrCode });
        if (!validateResponse.data.valid) {
          throw new Error('Invalid or expired QR code');
        }
        const { sessionId, classId, scheduleId } = validateResponse.data as QRValidateResponse;

        // Get current location
        if (!hasLocationPermission) {
          throw new Error('Location permission denied');
        }
        const location = await Location.getCurrentPositionAsync({});

        // Assume face embedding is processed server-side or pre-registered
        // For liveness, we can use a simple check (e.g., face detected in frame)
        // Replace with actual face recognition logic if needed
        let faceEmbedding: number[] = [];
        let livenessPassed = true; // Server-side validation recommended

        await attendance.submit({
          sessionId,
          classId,
          scheduleId,
          studentCoordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          livenessPassed,
          faceEmbedding,
        });

        setSuccess('Attendance marked successfully!');
      } catch (err: any) {
        setError(err.message || 'Failed to mark attendance');
      } finally {
        setLoading(false);
      }
    },
    [loading, scanned, hasLocationPermission]
  );

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    if (scanned || loading) return;
    const barcodes = scanBarcodes(frame, [BarcodeFormat.QR_CODE]);
    if (barcodes.length > 0) {
      runOnJS(handleBarCodeScanned)(barcodes);
    }
  }, [handleBarCodeScanned, scanned, loading]);

  if (hasCameraPermission === null || hasLocationPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting permissions...</Text>
        <Button
          mode="contained"
          onPress={requestPermissions}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          disabled={loading}
        >
          Request Permissions
        </Button>
      </View>
    );
  }

  if (!hasCameraPermission || !hasLocationPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          {!hasCameraPermission && 'Camera permission denied'}
          {!hasCameraPermission && !hasLocationPermission && ' and '}
          {!hasLocationPermission && 'Location permission denied'}
        </Text>
        <Button
          mode="contained"
          onPress={requestPermissions}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          disabled={loading}
        >
          Request Permissions
        </Button>
      </View>
    );
  }

  if (user?.role !== 'student') {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>This screen is for students only</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Home')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          disabled={loading}
        >
          Back to Home
        </Button>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>No camera device available</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Home')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          disabled={loading}
        >
          Back to Home
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFillObject}
        device={device}
        isActive={!scanned && !loading}
        frameProcessor={frameProcessor}
        fps={5}
      />
      <View style={styles.overlay}>
        <View style={styles.qrFrame} />
      </View>
      {scanned && (
        <Button
          mode="contained"
          onPress={() => setScanned(false)}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Scan Again
        </Button>
      )}
      <Button
        mode="outlined"
        onPress={changeFacing}
        disabled={loading}
        style={styles.flipButton}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Flip Camera
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  message: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  button: {
    margin: 16,
    backgroundColor: '#6200ea',
    borderRadius: 8,
  },
  flipButton: {
    margin: 16,
    backgroundColor: 'transparent',
    borderColor: '#6200ea',
    borderWidth: 1,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#6200ea',
    borderRadius: 8,
    backgroundColor: 'transparent',
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

export default ScanScreen;
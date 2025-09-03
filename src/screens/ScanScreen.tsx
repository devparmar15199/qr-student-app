import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, Snackbar, overlay } from 'react-native-paper';
import { CameraView, BarcodeScanningResult, Camera, BarcodeType } from 'expo-camera';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { attendance, qr } from '../services/api';
import { RootStackParamList, TabParamList } from '../types';

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

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    setError('');
    const cameraStatus = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(cameraStatus.status === 'granted');
    const locationStatus = await Location.requestForegroundPermissionsAsync();
    setHasLocationPermission(locationStatus.status === 'granted');
  };

  const requestPermissions = async () => {
    await checkPermissions();
    if (!hasCameraPermission || !hasLocationPermission) {
      setError('Please grant camera and location permissions to proceed.');
    }
  };

  const changeFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const handleBarCodeScanned = useCallback(
    async (scanningResult: BarcodeScanningResult) => {
      if (loading || scanned) return;
      const data = scanningResult.data;

      if (!data) return;

      setScanned(true);
      setLoading(true);
      setError('');
      setSuccess('');

      try {
        // Validate QR code on the server
        const validateResponse = await qr.validate({ token: data });

        if (!validateResponse.data.valid) {
          throw new Error('Invalid or expired QR code');
        }
        
        const { sessionId, classId, scheduleId } = validateResponse.data;

        // Get current location
        if (!hasLocationPermission) {
          throw new Error('Location permission denied.');
        }
        const location = await Location.getCurrentPositionAsync({});

        // Submit attendane with QR data, location, and face recognition placeholder
        // Note: livenessPassed and faceEmbedding are placeholders.
        // Implement actual logic for these features.
        await attendance.submit({
          sessionId,
          classId,
          scheduleId,
          studentCoordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          },
          livenessPassed: true,
          faceEmbedding: [],
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

  // Conditional Rendering based on permissions and user role
  if (user?.role !== 'student') {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>This screen is for students only.</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Home')}
          style={styles.button}
        >
          Back to Home
        </Button>
      </View>
    );
  }

  if (hasCameraPermission === null || hasLocationPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting permissions...</Text>
      </View>
    );
  }

  if (!hasCameraPermission || !hasLocationPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Permission not granted. Please enable both camera and location access.
        </Text>
        <Button
          mode="contained"
          onPress={requestPermissions}
          style={styles.button}
        >
          Grant Permissions
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing={facing}
        // barcodeScanning
        onBarcodeScanned={handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'] as BarcodeType[],
        }}
      />
      <View style={styles.overlay}>
        <View style={styles.qrFrame} />
      </View>
      <View style={styles.bottomButtons}>
        {scanned && (
          <Button
            mode="contained"
            onPress={() => {
              setScanned(false);
              setError('');
              setSuccess('');
            }}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Scan Again
          </Button>
        )}
        <Button
          mode="outlined"
          onPress={changeFacing}
          disabled={loading}
          style={styles.flipButton}
          labelStyle={styles.flipButtonLabel}
        >
          Flip Camera
        </Button>
      </View>
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={styles.snackbar}
      >
        {error}
      </Snackbar>
      <Snackbar
        visible={!!success}
        onDismiss={() => setSuccess('')}
        duration={4000}
        style={styles.successSnackbar}
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
    marginHorizontal: 20,
    marginTop: 50,
    color: '#1a1a1a',
  },
  button: {
    margin: 16,
    backgroundColor: '#6200ea',
    borderRadius: 8,
  },
  flipButton: {
    margin: 16,
    borderColor: '#6200ea',
    borderWidth: 1,
    borderRadius: 8,
  },
  flipButtonLabel: {
    color: '#6200ea',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
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
  bottomButtons: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  snackbar: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
    bottom: 0,
  },
  successSnackbar: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    bottom: 0,
  },
});

export default ScanScreen;
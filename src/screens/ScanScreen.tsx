import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { CameraView, BarcodeScanningResult, Camera, BarcodeType } from 'expo-camera';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { attendance, qr } from '../services/api';
import { TabParamList } from '../types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Props = NativeStackScreenProps<TabParamList, 'Scan'>;
type PermissionStatus = 'checking' | 'granted' | 'denied';
type ScanStatus = 'scanning' | 'loading' | 'success' | 'error';

const ScanScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('checking');
  const [scanStatus, setScanStatus] = useState<ScanStatus>('scanning');
  const [statusMessage, setStatusMessage] = useState('');

  // Animation for the scanning line
  const scanAnimation = new Animated.Value(0);

  const startAnimation = () => {
    scanAnimation.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnimation, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnimation, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkPermissions = useCallback(async () => {
    const cameraStatus = await Camera.getCameraPermissionsAsync();
    const locationStatus = await Location.getForegroundPermissionsAsync();
    
    if (cameraStatus.granted && locationStatus.granted) {
      setPermissionStatus('granted');
      startAnimation();
    } else {
      setPermissionStatus('denied');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Reset state when screen comes into focus
      setScanStatus('scanning');
      setStatusMessage('');
      checkPermissions();
    }, [checkPermissions])
  );

  const requestPermissions = async () => {
    await Camera.requestCameraPermissionsAsync();
    await Location.requestForegroundPermissionsAsync();
    checkPermissions();
  };

  const handleBarCodeScanned = useCallback(async ({ data }: BarcodeScanningResult) => {
    if (scanStatus !== 'scanning') return;

    setScanStatus('loading');
    setStatusMessage('Verifying QR Code...');
    
    try {
      // 1. Validate QR Code
      const validateResponse = await qr.validate({ token: data });
      if (!validateResponse.valid) {
        throw new Error('Invalid or expired QR code.');
      }

      const { sessionId } = validateResponse;
      // Note: Assuming  'classId' and 'scheduleId' are returned from your backend validate endpoint.
      // If not, you'll need to adjust where this data comes from.
      const { classId, scheduleId } = validateResponse as any;

      // 2. Get accurate location
      setStatusMessage('Getting your location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      // 3. Submit attendance
      setStatusMessage('Marking your attendance...');
      await attendance.submit({
        scheduleId,
        sessionId,
        classId,
        studentCoordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        livenessPassed: true, // Placeholder
        faceEmbedding: [], // Placeholder
      });

      setScanStatus('success');
      setStatusMessage('Attendance Marked Successfully!');
    } catch (err: any) {
      setScanStatus('error');
      setStatusMessage(err.message || 'An unknown error occurred.');
    }
  }, [scanStatus]);

  const animatedStyle = {
    transform: [
      {
        translateY: scanAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 240], // Move up and down within the frame
        }),
      },
    ],
  };

  // Render content based on permission status
  const renderContent = () => {
    if (permissionStatus === 'checking') {
      return <ActivityIndicator size="large" color={colors.primary} />;
    }

    if (permissionStatus === 'denied') {
      return (
        <View style={styles.permissionContainer}>
          <MaterialCommunityIcons name="shield-alert-outline" size={60} color={colors.error} />
          <Text style={styles.permissionTitle}>Permissions Required</Text>
          <Text style={styles.permissionText}>
            This app needs access to your camera to scan QR codes and location to verify attendance.
          </Text>
          <Button
            mode="contained"
            onPress={requestPermissions}
          >
            Grant Permissions
          </Button>
        </View>
      );
    }

    return (
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanStatus === 'scanning' ? handleBarCodeScanned : undefined}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'] as BarcodeType[],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.qrFrame}>
              {scanStatus === 'scanning' && <Animated.View style={[styles.scanLine, animatedStyle]} />}
              {scanStatus !== 'scanning' && (
                <View style={styles.statusContainer}>
                  {scanStatus === 'loading' && <ActivityIndicator size="large" color="#fff" />}
                  {scanStatus === 'success' && <MaterialCommunityIcons name="check-circle-outline" size={80} color="#4caf50" />}
                  {scanStatus === 'error' && <MaterialCommunityIcons name="close-circle-outline" size={80} color={colors.error} />}
                  <Text style={styles.statusText}>{statusMessage}</Text>
                </View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
        </View>
        <View style={styles.overlayBottom}>
          {scanStatus !== 'scanning' && (
            <Button
              icon="camera-retake-outline"
              mode="contained"
              onPress={() => setScanStatus('scanning')}
            >
              Scan Again
            </Button>
          )}
        </View>
      </CameraView>
    );
  };

  return <View style={styles.container}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  permissionContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlayTop: { 
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
  },
  overlayMiddle: { 
    flexDirection: 'row',
    height: 250, 
  },
  overlaySide: { 
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
  },
  qrFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#6200ea',
    elevation: 2,
  },
  statusContainer: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default ScanScreen;
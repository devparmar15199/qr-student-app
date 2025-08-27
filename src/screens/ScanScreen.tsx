import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { BarCodeScannerResult } from 'expo-barcode-scanner';
import { CameraView, CameraType, Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { attendance, qr } from '../services/api';

const ScanScreen = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const changeFacing = () => {
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  }

  const handleBarCodeScanned = async ({ data }: BarCodeScannerResult) => {
    try {
      setScanned(true);
      setLoading(true);

      // First validate the QR code
      const validateResponse = await qr.validate({ token: data });
      const qrData = validateResponse.data.qrPayload;

      // Get current location
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      
      // Submit attendance
      await attendance.submit({
        sessionId: qrData.sessionId,
        classId: qrData.classId,
        scheduleId: qrData.scheduleId,
        studentCoordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        livenessPassed: true, // We'll assume true for now
        faceEmbedding: [], // Optional, can be added later if needed
      });

      alert('Attendance marked successfully!');
    } catch (error) {
      console.error('Scan error:', error);
      if (error instanceof Error) {
        alert('Failed to mark attendance: ' + error.message);
      } else {
        alert('Failed to mark attendance');
      }
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting for camera permission</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject}>
        <CameraView
            facing={facing}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
        />
      </View>
      {scanned && (
        <Button
          mode="contained"
          onPress={() => setScanned(false)}
          loading={loading}
          style={styles.button}
        >
          Scan Again
        </Button>
      )}
        <Button
          onPress={() => changeFacing()}
          style={styles.button}
        >
            Change Camera
        </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  button: {
    margin: 20,
  },
});

export default ScanScreen;

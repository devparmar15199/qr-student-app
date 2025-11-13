import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  // Alert, // --- REMOVED
} from 'react-native';
// --- ADDED: Import Paper Text ---
import { Text, useTheme, Button } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import * as Location from 'expo-location';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { attendance } from '../services/api';
import { RootStackParamList } from '../types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { getBase64SizeKB, isImageSizeAcceptable } from '../utils/imageUtils';
import * as ImageManipulator from 'expo-image-manipulator';

type Props = NativeStackScreenProps<RootStackParamList, 'FaceLiveness'>;

const { width: screenWidth } = Dimensions.get('window');
const OVAL_WIDTH = screenWidth * 0.7;
const OVAL_HEIGHT = screenWidth * 0.9;

const FaceLivenessScreen = ({ route, navigation }: Props) => {
  const { sessionId, classId } = route.params;
  const { colors } = useTheme();
  const cameraRef = useRef<CameraView>(null);
  const isFocused = useIsFocused();

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(
    'Position your face in the frame and tap Capture',
  );
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<
    Location.PermissionStatus | undefined
  >();
  const [isSuccess, setIsSuccess] = useState(false);

  // --- UPDATED: Simplified permission request effect ---
  useEffect(() => {
    const requestPermissions = async () => {
      if (!permission) {
        const cameraResult = await requestPermission();
        if (!cameraResult.granted) {
          // Render logic will handle denied state
          return;
        }
      }
      const locationResult = await Location.getForegroundPermissionsAsync();
      setLocationPermission(locationResult.status);
      if (locationResult.status !== 'granted') {
        const locationRequest =
          await Location.requestForegroundPermissionsAsync();
        setLocationPermission(locationRequest.status);
      }
    };

    requestPermissions();
  }, [permission, requestPermission]);

  const captureAndSubmit = async () => {
    if (!cameraRef.current || isLoading) return;

    setIsLoading(true);
    setMessage('Capturing photo...');

    try {
      // Wait a moment for camera to be ready
      await new Promise((resolve) => setTimeout(resolve, 300));

      let photo = await cameraRef.current.takePictureAsync({
        quality: 0.1, // Start with very low quality
        base64: true,
        skipProcessing: true,
      });

      if (!photo?.base64) {
        throw new Error('Failed to capture photo');
      }

      setMessage('Optimizing image...');
      let manipulatedImage = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 800 } }],
        {
          compress: 0.3,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );

      let currentSizeKB = getBase64SizeKB(manipulatedImage.base64!);
      console.log(`Image size after initial resize (800px): ${currentSizeKB}KB`);

      if (currentSizeKB > 400) {
        setMessage('Further compressing...');
        manipulatedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 600 } }],
          {
            compress: 0.2,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          },
        );
        currentSizeKB = getBase64SizeKB(manipulatedImage.base64!);
        console.log(`Image size after 600px resize: ${currentSizeKB}KB`);
      }

      if (currentSizeKB > 400) {
        setMessage('Final compression...');
        manipulatedImage = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 400 } }],
          {
            compress: 0.1,
            format: ImageManipulator.SaveFormat.JPEG,
            base64: true,
          },
        );
        currentSizeKB = getBase64SizeKB(manipulatedImage.base64!);
        console.log(`Image size after 400px resize: ${currentSizeKB}KB`);
      }

      if (!manipulatedImage.base64) {
        throw new Error('Failed to process image');
      }

      photo.base64 = manipulatedImage.base64;

      setMessage('Getting location...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setMessage('Verifying your identity...');

      console.log(`Final image size: ${currentSizeKB}KB`);
      if (!isImageSizeAcceptable(photo.base64, 500)) {
        throw new Error(
          `Image still too large (${currentSizeKB}KB). Please try again.`,
        );
      }

      const base64Image = `data:image/jpeg;base64,${photo.base64}`;

      await attendance.submit({
        sessionId,
        classId,
        studentCoordinates: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        livenessPassed: true,
        faceImage: base64Image,
      });

      setIsSuccess(true);
      setMessage('Face verified successfully! Attendance marked.');

      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error('Face verification error:', error);

      let errorMessage = 'Verification failed. Please try again.';

      if (
        error.response?.status === 413 ||
        error.message?.includes('413') ||
        error.message?.includes('too large')
      ) {
        errorMessage =
          'Image too large. Retrying will automatically compress it.';
      } else if (error.message?.includes('Face recognition failed')) {
        errorMessage = 'Face not recognized. Please ensure your face is clear.';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message?.includes('Location')) {
        errorMessage = 'Location error. Please enable location services.';
      } else if (error.response?.status >= 400 && error.response?.status < 500) {
        errorMessage = error.message || 'Request error. Please try again.';
      }

      // --- UPDATED: Replaced Alert.alert with message state ---
      setMessage(errorMessage);
      setIsSuccess(false);
      setIsLoading(false);
    }
  };

  // --- UPDATED: Themed Loading State ---
  if (!permission || !locationPermission) {
    return (
      <View style={[styles.container, styles.fullScreenCenter]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.messageText, { color: 'white' }]} variant="bodyLarge">
          Loading camera...
        </Text>
      </View>
    );
  }

  // --- UPDATED: Themed Permission Denied State ---
  if (!permission.granted || locationPermission !== 'granted') {
    return (
      <View style={[styles.container, styles.fullScreenCenter, { padding: 30 }]}>
        <MaterialCommunityIcons
          name="shield-alert-outline"
          size={80}
          color={colors.error}
        />
        <Text
          style={[styles.messageText, { color: 'white', marginTop: 20 }]}
          variant="headlineSmall"
        >
          Permissions Required
        </Text>
        <Text
          style={[styles.messageText, { color: 'white', opacity: 0.8 }]}
          variant="bodyLarge"
        >
          {!permission.granted
            ? 'Camera permission is required for face verification.'
            : 'Location permission is required to verify attendance.'}
        </Text>
        <Button
          mode="contained"
          onPress={
            !permission.granted
              ? requestPermission
              : Location.requestForegroundPermissionsAsync
          }
          style={{ marginTop: 20, width: '80%' }}
        >
          Grant Permission
        </Button>
        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 10 }}
          textColor="white"
        >
          Back
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          active={isFocused && !isLoading && !isSuccess}
        />

        {/* Face oval overlay */}
        <View style={styles.overlay}>
          <View style={styles.faceOval} />
        </View>
      </View>

      {/* Bottom UI */}
      <View style={styles.bottomContainer}>
        <View style={styles.statusContainer}>
          {isLoading && <ActivityIndicator size="large" color={colors.primary} />}
          {/* --- UPDATED: Use theme color for success --- */}
          {isSuccess && (
            <MaterialCommunityIcons
              name="check-circle"
              size={60}
              color={colors.primary}
            />
          )}
        </View>

        <Text style={styles.messageText} variant="titleMedium">
          {message}
        </Text>

        {!isLoading && !isSuccess && (
          <Button
            mode="contained"
            onPress={captureAndSubmit}
            style={styles.captureButton}
            contentStyle={styles.captureButtonContent}
            labelStyle={styles.captureButtonLabel}
          >
            Capture & Verify
          </Button>
        )}

        {!isLoading && (
          <Button
            mode="text" // --- UPDATED: Use text for less emphasis
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            textColor="white" // --- UPDATED: Explicitly set text color
          >
            Back
          </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  // --- ADDED: Full screen utility style ---
  fullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceOval: {
    width: OVAL_WIDTH,
    height: OVAL_HEIGHT,
    borderRadius: OVAL_WIDTH / 2, // Corrected for oval shape
    borderWidth: 3,
    borderColor: '#FFF',
    backgroundColor: 'transparent',
  },
  bottomContainer: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    paddingBottom: 30, // Add more padding at the bottom
  },
  statusContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    color: '#FFF',
    textAlign: 'center',
    marginVertical: 10,
  },
  captureButton: {
    marginTop: 15,
    width: '90%', // Make button wider
  },
  captureButtonContent: {
    paddingVertical: 10, // Make button taller
  },
  captureButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 12,
    width: '60%',
  },
});

export default FaceLivenessScreen;
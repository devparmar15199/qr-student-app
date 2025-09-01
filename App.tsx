import React, { useEffect, useState, Component, ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme, Text } from 'react-native-paper';
import { AuthProvider } from './src/contexts/AuthContext';
import Navigation from './src/navigation/Navigation';
import { initTFLite } from './src/utils/tflite';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Custom theme for react-native-paper
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ea',
    accent: '#03dac6',
    background: '#f5f5f5',
    text: '#1a1a1a',
    error: '#d32f2f',
  },
  roundness: 8,
};

// Error boundary component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong. Please restart the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [isTFLiteLoaded, setIsTFLiteLoaded] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initTFLite();
        setIsTFLiteLoaded(true);
      } catch (err) {
        console.error('Failed to initialize TFLite:', err);
      }
    };
    initialize();
  }, []);
  
  if (!isTFLiteLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6200ea" />
        <Text style={styles.loadingText}>Loading Face Recognition Model...</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <ErrorBoundary>
        <AuthProvider>
          <Navigation />
          <StatusBar style="auto" />
        </AuthProvider>
      </ErrorBoundary>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#1a1a1a',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    padding: 20,
  },
});
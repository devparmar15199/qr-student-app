import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import ClassesScreen from '../screens/ClassesScreen';
import ScanScreen from '../screens/ScanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AttendanceManagementScreen from '../screens/AttendanceManagementScreen';
import AuditLogsScreen from '../screens/AuditLogsScreen';

// Define navigation types
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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = () => {
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";
          
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Scan') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'Classes') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else if (route.name === 'AttendanceManagement') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'AuditLogs') {
            iconName = focused ? 'list' : 'list-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ea',
        tabBarInactiveTintColor: '#757575',
        tabBarStyle: {
          backgroundColor: '#f5f5f5',
          borderTopColor: '#e0e0e0',
          borderTopWidth: 1,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      {user?.role === 'student' && <Tab.Screen name="Scan" component={ScanScreen} />}
      <Tab.Screen name="Classes" component={ClassesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      {user?.role === 'teacher' && (
        <Tab.Screen
          name="AttendanceManagement"
          component={AttendanceManagementScreen}
          initialParams={{ classId: '' }}
        />
      )}
      {user?.role === 'admin' && <Tab.Screen name="AuditLogs" component={AuditLogsScreen} />}
    </Tab.Navigator>
  );
};

const Navigation = () => {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <Stack.Screen name="MainTabs" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
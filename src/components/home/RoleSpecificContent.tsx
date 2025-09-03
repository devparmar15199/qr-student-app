import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { TabParamList, RootStackParamList } from '../../types';

// Define the navigation prop type for better type safety
type HomeScreenNavigationProp = NativeStackScreenProps<TabParamList>;
type RootStackParamListProp = NativeStackScreenProps<RootStackParamList>;

const CommonButton = (props: React.ComponentProps<typeof Button>) => (
    <Button
        mode="contained"
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
        {...props}
    />
);

export const StudentHomeContent = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    return (
        <>
            <Text style={styles.instructions}>To mark your attendance:</Text>
            <Text style={styles.step}>1. Navigate to the Scan tab.</Text>
            <Text style={styles.step}>2. Scan the QR code from your teacher.</Text>
            <Text style={styles.step}>3. Your attendance will be marked.</Text>
            <CommonButton onPress={() => navigation.navigate('Scan')}>
                Go to Scan
            </CommonButton>
        </>
    );
};

export const TeacherHomeContent = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    return (
        <>
            <Text style={styles.instructions}>To manage attendance:</Text>
            <Text style={styles.step}>1. Go to Classes to select a class.</Text>
            <Text style={styles.step}>2. Generate a QR code for the session.</Text>
            <Text style={styles.step}>3. Review attendance records.</Text>
            <CommonButton onPress={() => navigation.navigate('Classes')}>
                Go to Classes
            </CommonButton>
        </>
    );
};

export const AdminHomeContent = () => {
    const navigation = useNavigation<RootStackParamList>();
    return (
        <>
            <Text style={styles.instructions}>Admin Dashboard:</Text>
            <Text style={styles.step}>- Manage all attendance records.</Text>
            <Text style={styles.step}>- Monitor system activity via Audit Logs.</Text>
            <CommonButton onPress={() => navigation.navigate('AuditLogs')}>
                View Audit Logs
            </CommonButton>
            <CommonButton onPress={() => navigation.navigate('UserManagement')}>
                Manage Users
            </CommonButton>
            <CommonButton onPress={() => navigation.navigate('Classes')}>
                Manage Classes
            </CommonButton>
        </>
    );
};

const styles = StyleSheet.create({
    instructions: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        marginTop: 24,
    },
    step: {
        fontSize: 16,
        marginBottom: 8,
        paddingLeft: 12,
    },
    button: {
        marginTop: 16,
        borderRadius: 8,
    },
    buttonContent: {
        paddingVertical: 8,
    },
    buttonLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
});

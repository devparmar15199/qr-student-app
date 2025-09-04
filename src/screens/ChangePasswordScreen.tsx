import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, TextInput, Button, Card, Snackbar, useTheme, ActivityIndicator } from 'react-native-paper';
import ScreenContainer from '../components/common/ScreenContainer';
import { users } from '../services/api';

const ChangePasswordScreen = () => {
    const { colors } = useTheme();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            setErrorMessage('New Password and confirmation do not match.');
            return;
        }
        if (!currentPassword || !newPassword) {
            setErrorMessage('Please fill out all fields.');
            return;
        }
        
        setLoading(true);
        setSuccessMessage('');
        setErrorMessage('');

        try {
            await users.changePassword({ currentPassword, newPassword });
            setSuccessMessage('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenContainer>
            <View style={styles.container}>
                <Text style={styles.title}>Change Password</Text>
                <Card style={styles.card}>
                    <Card.Content>
                        <TextInput
                            label="Current Password"
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            secureTextEntry
                            mode="outlined"
                            style={styles.input}
                            disabled={loading}
                        />
                        <TextInput
                            label="New Password"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry
                            mode="outlined"
                            style={styles.input}
                            disabled={loading}
                        />
                        <TextInput
                            label="Confirm New Password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            mode="outlined"
                            style={styles.input}
                            disabled={loading}
                        />
                        <Button
                            mode="contained"
                            onPress={handleChangePassword}
                            loading={loading}
                            disabled={loading}
                            style={styles.button}
                        >
                            Change Password
                        </Button>
                    </Card.Content>
                </Card>
            </View>
            <Snackbar
                visible={!!errorMessage}
                onDismiss={() => setErrorMessage('')}
                duration={4000}
                style={{ backgroundColor: colors.error }}
            >
                {errorMessage}
            </Snackbar>
            <Snackbar
                visible={!!successMessage}
                onDismiss={() => setSuccessMessage('')}
                duration={4000}
                style={{ backgroundColor: colors.primary }}
            >
                {successMessage}
            </Snackbar>
        </ScreenContainer>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 20,
    },
    card: {
        padding: 16,
    },
    input: {
        marginBottom: 16,
    },
    button: {
        marginTop: 10,
    },
});

export default ChangePasswordScreen;

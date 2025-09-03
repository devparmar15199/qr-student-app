import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Text, Card, TextInput, ActivityIndicator, Snackbar, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { audit } from '../services/api';
import { TabParamList, AuditLog } from '../types';
import { UseDebounce } from '../hooks/useDebounce';
import ScreenContainer from '../components/common/ScreenContainer';
import UnauthorizedAccess from '../components/common/UnauthorizedAccess';

type Props = NativeStackScreenProps<TabParamList, 'AuditLogs'>;

const AuditLogsScreen = () => {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [userIdFilter, setUserIdFilter] = useState('');
  const debouncedUserId = UseDebounce(userIdFilter, 500); // Debounce user input

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await audit.getLogs({ userId: debouncedUserId || undefined });
      setLogs(response);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [debouncedUserId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Role check
  if (user?.role !== 'admin') {
    return <UnauthorizedAccess message="This screen is for admins only." />;
  }

  return (
    <ScreenContainer onRefresh={fetchLogs} refreshing={loading}>
      <Text style={styles.title}>Audit Logs</Text>

      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Filter by User ID"
            value={userIdFilter}
            onChangeText={setUserIdFilter}
            mode="outlined"
            style={styles.input}
            disabled={loading}
          />
        </Card.Content>
      </Card>

      {loading && logs.length === 0 ? (
        <ActivityIndicator size="large" style={styles.loader} />
      ) : logs.length === 0 ? (
        <Text style={styles.noData}>No audit logs found.</Text>
      ) : (
        logs.map((log) => (
          <Card key={log._id} style={styles.card}>
            <Card.Title
              title={log.action}
              subtitle={`User: ${log.userId.fullName}`}
              right={() => <Text style={{ color: log.status === 'success' ? 'green' : colors.error }}>{log.status}</Text>}
            />
            <Card.Content>
              <Text>Date: {new Date(log.createdAt).toLocaleString()}</Text>
            </Card.Content>
          </Card>
        ))
      )}
      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={{ backgroundColor: colors.error }}
      >
        {error}
      </Snackbar>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 0,
  },
  loader: {
    marginTop: 20,
  },
  noData: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default AuditLogsScreen;
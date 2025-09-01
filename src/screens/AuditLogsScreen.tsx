import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, TextInput, ActivityIndicator, Snackbar, Button, RadioButton } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { audit, AuditLog } from '../services/api';

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

type Props = NativeStackScreenProps<TabParamList, 'AuditLogs'>;

const AuditLogsScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<'success' | 'failed' | ''>('');

  useEffect(() => {
    fetchLogs();
  }, [userIdFilter, actionFilter, startDate, endDate, statusFilter]);

  const fetchLogs = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await audit.getLogs({
        userId: userIdFilter || undefined,
        action: actionFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status: statusFilter || undefined,
      });
      setLogs(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  if (user?.role !== 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>This screen is for admins only</Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Home')}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
        >
          Back to Home
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} enabled={!loading} />
        }
      >
        <Text style={styles.title}>Audit Logs</Text>
        <View style={styles.filterContainer}>
          <Text style={styles.sectionTitle}>Filters</Text>
          <TextInput
            label="User ID"
            value={userIdFilter}
            onChangeText={setUserIdFilter}
            mode="outlined"
            style={styles.input}
            disabled={loading || refreshing}
            theme={{ roundness: 8 }}
          />
          <TextInput
            label="Action"
            value={actionFilter}
            onChangeText={setActionFilter}
            mode="outlined"
            style={styles.input}
            disabled={loading || refreshing}
            theme={{ roundness: 8 }}
          />
          <TextInput
            label="Start Date (YYYY-MM-DD)"
            value={startDate}
            onChangeText={setStartDate}
            mode="outlined"
            style={styles.input}
            disabled={loading || refreshing}
            theme={{ roundness: 8 }}
          />
          <TextInput
            label="End Date (YYYY-MM-DD)"
            value={endDate}
            onChangeText={setEndDate}
            mode="outlined"
            style={styles.input}
            disabled={loading || refreshing}
            theme={{ roundness: 8 }}
          />
          <Text style={styles.subTitle}>Status</Text>
          <RadioButton.Group
            onValueChange={(value) => setStatusFilter(value as 'success' | 'failed' | '')}
            value={statusFilter}
          >
            <View style={styles.radioOption}>
              <RadioButton value="" disabled={loading || refreshing} />
              <Text style={styles.radioText}>All</Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="success" disabled={loading || refreshing} />
              <Text style={styles.radioText}>Success</Text>
            </View>
            <View style={styles.radioOption}>
              <RadioButton value="failed" disabled={loading || refreshing} />
              <Text style={styles.radioText}>Failed</Text>
            </View>
          </RadioButton.Group>
        </View>
        {loading ? (
          <ActivityIndicator animating={true} size="large" style={styles.loader} />
        ) : logs.length === 0 ? (
          <Text style={styles.noData}>No audit logs found</Text>
        ) : (
          logs.map((log) => (
            <Card key={log._id} style={styles.card}>
              <Card.Content>
                <Text style={styles.logTitle}>Action: {log.action}</Text>
                <Text>User: {log.userId.fullName}</Text>
                <Text>Status: {log.status}</Text>
                <Text>Date: {new Date(log.createdAt).toLocaleString()}</Text>
                <Text>Details: {JSON.stringify(log.details)}</Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1a1a1a',
  },
  subTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  filterContainer: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  radioText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  card: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  loader: {
    marginTop: 20,
  },
  noData: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#1a1a1a',
  },
  message: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#6200ea',
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: '#d32f2f',
    borderRadius: 8,
  },
});

export default AuditLogsScreen;
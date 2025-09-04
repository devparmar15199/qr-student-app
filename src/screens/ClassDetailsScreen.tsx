import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
import { Text, Card, ActivityIndicator, Snackbar, useTheme } from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Class, User, RootStackParamList } from '../types';
import ScreenContainer from '../components/common/ScreenContainer';
import { classes } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'ClassDetails'>

const ClassDetailsScreen = ({ route }: Props) => {
    const { colors } = useTheme();
    const { classId } = route.params;

    const [classDetails, setClassDetails] = useState<Class | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchClassDetails = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const details = await classes.getById(classId);
            setClassDetails(details);
        } catch (err: any) {
            setError(err.message || 'Failed to load class details');
        } finally {
            setLoading(false);
        }
    }, [classId]);

    useEffect(() => {
        fetchClassDetails();
    }, [fetchClassDetails]);

    if (loading) {
        return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
        </View>
        );
    }

    if (error || !classDetails) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error || 'Class details not found.'}</Text>
            </View>
        );
    }
 
    const renderStudent = ({ item }: { item: User }) => (
        <Card style={styles.studentCard}>
            <Card.Content>
                <Text style={styles.studentName}>{item.fullName}</Text>
                <Text>Enrollment No: {item.enrollmentNo}</Text>
            </Card.Content>
        </Card>
    );
    
    return (
        <ScreenContainer>
            <View style={styles.container}>
            <Text style={styles.title}>Class: {classDetails.classNumber}</Text>
            <Card style={styles.detailsCard}>
                <Card.Content>
                    <Text style={styles.detailText}>Teacher: {classDetails.teacherId.fullName}</Text>
                </Card.Content>
            </Card>
            <Text style={styles.sectionTitle}>Enrolled Students</Text>
            {classDetails.students.length > 0 ? (
                <FlatList
                    data={classDetails.students}
                    renderItem={renderStudent}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={styles.listContainer}
                />
            ) : (
                <Text style={styles.noDataText}>No students are enrolled in this class yet.</Text>
            )}
            </View>
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
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsCard: {
    marginBottom: 20,
    padding: 10,
  },
  detailText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  listContainer: {
    paddingBottom: 20,
  },
  studentCard: {
    marginBottom: 10,
    padding: 5,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default ClassDetailsScreen;

import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { classes } from '../services/api';

interface Class {
  _id: string;
  classNumber: string;
  subjectCode: string;
  subjectName: string;
  classYear: number;
  semester: number;
  division: string;
}

const ClassesScreen = () => {
  const [classList, setClassList] = useState<Class[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchClasses = async () => {
    try {
      const response = await classes.getAll();
      setClassList(response.data);
    } catch (error) {
      if (error instanceof Error) {
        alert('Error fetching classes: ' + error.message);
      } else {
        alert('Error fetching classes');
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchClasses();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>My Classes</Text>
      {classList.map((classItem) => (
        <Card key={classItem._id} style={styles.card}>
          <Card.Content>
            <Text style={styles.className}>{classItem.subjectName}</Text>
            <Text>Subject Code: {classItem.subjectCode}</Text>
            <Text>Class: {classItem.classNumber}</Text>
            <Text>Year: {classItem.classYear}, Semester: {classItem.semester}</Text>
            <Text>Division: {classItem.division}</Text>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});

export default ClassesScreen;

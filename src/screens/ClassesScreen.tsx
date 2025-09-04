import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, SafeAreaView } from 'react-native';
import { 
    Text, 
    Card, 
    ActivityIndicator, 
    Snackbar, 
    Button, 
    useTheme, 
    FAB, 
    Modal, 
    Portal, 
    TextInput, 
    IconButton, 
    Menu, 
    Dialog, 
    Divider 
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { classes } from '../services/api';
import { TabParamList, Class } from '../types';

type Props = NativeStackScreenProps<TabParamList, 'Classes'>;

type ClassFormData = Omit<Class, '_id' | 'teacherId'>;

const INITIAL_FORM_STATE: ClassFormData = {
  subjectName: '',
  subjectCode: '',
  classNumber: '',
  division: '',
  classYear: '',
  semester: '',
};

// A dedicated component for rendering a class card
const ClassCard = ({ classItem, userRole, onNavigate, onEdit, onDelete }: { classItem: Class; userRole?: string; onNavigate: () => void; onEdit: (item: Class) => void; onDelete: (item: Class) => void }) => {
  const [menuVisible, setMenuVisible] = useState(false);
  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  const isPrivilegedUser = userRole === 'teacher' || userRole === 'admin';

  return (
    <Card style={styles.card}>
      <Card.Title
        title={classItem.subjectName}
        subtitle={`Code: ${classItem.subjectCode}`}
        titleStyle={styles.className}
        right={(props) => 
          isPrivilegedUser ? (
            <Menu
              visible={menuVisible}
              onDismiss={closeMenu}
              anchor={<IconButton {...props} icon="dots-vertical" onPress={openMenu} />}
            >
              <Menu.Item 
                onPress={() => {
                  onEdit(classItem);
                  closeMenu();
                }}
                title="Edit Class" 
              />
              <Divider />
              <Menu.Item 
                onPress={() => {
                  onDelete(classItem);
                  closeMenu();
                }}
                title="Delete Class" 
                titleStyle={{ color: 'red' }}
              />
            </Menu>
          ) : null
        }
      />
      <Card.Content>
        <Text style={styles.classText}>Class: {classItem.classNumber} (Div: {classItem.division})</Text>
        <Text style={styles.classText}>Year: {classItem.classYear}, Semester: {classItem.semester}</Text>
      </Card.Content>
      {isPrivilegedUser && (
        <Card.Actions>
          <Button mode="contained" onPress={onNavigate}>
            View Attendance
          </Button>
        </Card.Actions>
      )}
    </Card>
  );
};

const ClassesScreen = ({ navigation }: Props) => {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [classList, setClassList] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [classData, setClassData] = useState<ClassFormData>(INITIAL_FORM_STATE);

  const fetchClasses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const apiCall = {
        student: classes.getEnrolled,
        teacher: classes.getTeacherClasses,
        admin: classes.getAll,
      }[user.role];

      if (apiCall) {
        const response = await apiCall();
        setClassList(response);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const closeModal = () => {
    setModalVisible(false);
    setSelectedClass(null);
    setClassData(INITIAL_FORM_STATE);
  };
  
  const closeDialog = () => {
    setDialogVisible(false);
    setSelectedClass(null);
  };

  const handleCreate = () => {
    setModalMode('create');
    setSelectedClass(null);
    setClassData(INITIAL_FORM_STATE);
    setModalVisible(true);
  };

  const handleEdit = (classItem: Class) => {
    setModalMode('edit');
    setSelectedClass(classItem);
    setClassData({
      subjectName: classItem.subjectName,
      subjectCode: classItem.subjectCode,
      classNumber: classItem.classNumber,
      division: classItem.division,
      classYear: classItem.classYear,
      semester: classItem.semester,
    });
    setModalVisible(true);
  };

  const handleDelete = (classItem: Class) => {
    setSelectedClass(classItem);
    setDialogVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedClass) return;
    try {
      await classes.delete(selectedClass._id);
      await fetchClasses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete class');
    } finally {
        closeDialog();
    }
  };

  const handleSave = async () => {
    if (!user) {
        setError("User not found. Please log in again.");
        return;
    }
    try {
        if (modalMode === 'create') {
            const payload = {
                ...classData,
                teacherId: user._id, // ✅ Add the authenticated user's ID
            };
            await classes.create(payload as any);
        } else if (selectedClass) {
            await classes.update(selectedClass._id, classData);
        }
        await fetchClasses();
        closeModal();
    } catch (err: any) {
        setError(err.message || 'Failed to save class');
    }
  };

  const handleInputChange = (name: keyof ClassFormData, value: string) => {
    setClassData(prev => ({ ...prev, [name]: value }));
  }

  const renderItem = ({ item }: { item: Class }) => (
    <ClassCard 
      classItem={item}
      userRole={user?.role}
      onNavigate={() => navigation.navigate('AttendanceManagement', { classId: item._id })}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );

  const isPrivilegedUser = user?.role === 'teacher' || user?.role === 'admin';

  if (loading && classList.length === 0) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator animating={true} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={classList}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListHeaderComponent={<Text style={styles.title}>My Classes</Text>}
        ListEmptyComponent={<Text style={styles.noData}>No classes found</Text>}
        onRefresh={fetchClasses}
        refreshing={loading}
      />

      {isPrivilegedUser && (
        <Portal>
          <Modal visible={modalVisible} onDismiss={closeModal} contentContainerStyle={styles.modalContainer}>
            <Text style={styles.modalTitle}>{modalMode === 'create' ? 'Create a New Class' : 'Edit Class'}</Text>
            <TextInput label="Subject Name" value={classData.subjectName} onChangeText={v => handleInputChange('subjectName', v)} style={styles.input} />
            <TextInput label="Subject Code" value={classData.subjectCode} onChangeText={v => handleInputChange('subjectCode', v)} style={styles.input} />
            <TextInput label="Class Number (e.g., 601)" value={classData.classNumber} onChangeText={v => handleInputChange('classNumber', v)} style={styles.input} />
            <TextInput label="Division (e.g., A)" value={classData.division} onChangeText={v => handleInputChange('division', v)} style={styles.input} />
            <TextInput label="Year (e.g., 3rd)" value={classData.classYear} onChangeText={v => handleInputChange('classYear', v)} style={styles.input} />
            <TextInput label="Semester (e.g., 6th)" value={classData.semester} onChangeText={v => handleInputChange('semester', v)} style={styles.input} />
            <View style={styles.modalActions}>
              <Button onPress={closeModal}>Cancel</Button>
              <Button mode="contained" onPress={handleSave}>Save</Button>
            </View>
          </Modal>

          <Dialog visible={dialogVisible} onDismiss={closeDialog}>
            <Dialog.Title>Confirm Deletion</Dialog.Title>
            <Dialog.Content>
              <Text>Are you sure you want to delete the class "{selectedClass?.subjectName}"? This action cannot be undone.</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={closeDialog}>Cancel</Button>
              <Button onPress={handleConfirmDelete} textColor={colors.error}>Delete</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      )}

      {isPrivilegedUser && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={handleCreate}
        />
      )}

      <Snackbar
        visible={!!error}
        onDismiss={() => setError('')}
        duration={4000}
        style={{ backgroundColor: colors.error }}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 20,
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80, // Space for the FAB
  },
  card: {
    marginBottom: 16,
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
  },
  classText: {
    fontSize: 14,
    marginBottom: 4,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noData: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
    color: '#777',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
  },
  input: {
      marginBottom: 12,
  },
  modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 20,
  }
});

export default ClassesScreen;
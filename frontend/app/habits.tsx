import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { habitsAPI } from '../services/api';
import { format } from 'date-fns';

export default function HabitsScreen() {
  const router = useRouter();
  const [habits, setHabits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayLogs, setTodayLogs] = useState<Record<string, any>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabit, setNewHabit] = useState({
    title: '',
    type: 'quantitative',
    target: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const data = await habitsAPI.getAll();
      setHabits(data.habits || []);
      
      // Load today's logs for each habit
      const today = format(new Date(), 'yyyy-MM-dd');
      const logs: Record<string, any> = {};
      
      for (const habit of data.habits || []) {
        try {
          const logData = await habitsAPI.getLogs(habit.id, today, today);
          if (logData.logs && logData.logs.length > 0) {
            logs[habit.id] = {
              completed: logData.logs[0].completed,
              value: logData.logs[0].value || 0,
            };
          } else {
            logs[habit.id] = { completed: false, value: 0 };
          }
        } catch (error) {
          logs[habit.id] = { completed: false, value: 0 };
        }
      }
      
      setTodayLogs(logs);
    } catch (error) {
      console.error('Error loading habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddHabit = async () => {
    if (!newHabit.title.trim()) {
      Alert.alert('Ошибка', 'Введите название привычки');
      return;
    }

    if (!newHabit.target || parseFloat(newHabit.target) <= 0) {
      Alert.alert('Ошибка', 'Введите цель (число больше 0)');
      return;
    }

    setSaving(true);
    try {
      await habitsAPI.create({
        title: newHabit.title,
        type: 'quantitative',
        target: parseFloat(newHabit.target),
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
        reminders: [],
      });

      setShowAddModal(false);
      setNewHabit({ title: '', type: 'quantitative', target: '' });
      await loadHabits();
      Alert.alert('Успешно', 'Привычка создана!');
    } catch (error) {
      console.error('Error creating habit:', error);
      Alert.alert('Ошибка', 'Не удалось создать привычку');
    } finally {
      setSaving(false);
    }
  };

  const incrementHabit = async (habitId: string, currentValue: number, target: number) => {
    const newValue = Math.min(currentValue + 1, target);
    try {
      await habitsAPI.log(habitId, {
        completed: newValue >= target,
        value: newValue,
      });
      setTodayLogs({
        ...todayLogs,
        [habitId]: { completed: newValue >= target, value: newValue },
      });
    } catch (error) {
      console.error('Error updating habit:', error);
      Alert.alert('Ошибка', 'Не удалось обновить привычку');
    }
  };

  const decrementHabit = async (habitId: string, currentValue: number) => {
    const newValue = Math.max(currentValue - 1, 0);
    try {
      await habitsAPI.log(habitId, {
        completed: false,
        value: newValue,
      });
      setTodayLogs({
        ...todayLogs,
        [habitId]: { completed: false, value: newValue },
      });
    } catch (error) {
      console.error('Error updating habit:', error);
      Alert.alert('Ошибка', 'Не удалось обновить привычку');
    }
  };

  const deleteHabit = async (habitId: string, habitTitle: string) => {
    Alert.alert(
      'Удалить привычку?',
      `Вы уверены, что хотите удалить "${habitTitle}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await habitsAPI.delete(habitId);
              await loadHabits();
              Alert.alert('Успешно', 'Привычка удалена');
            } catch (error) {
              console.error('Error deleting habit:', error);
              Alert.alert('Ошибка', 'Не удалось удалить привычку');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Привычки</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
        ) : habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkbox-outline" size={64} color={colors.gray400} />
            <Text style={styles.emptyText}>Пока нет привычек</Text>
            <Text style={styles.emptySubtext}>Нажмите + чтобы создать первую привычку</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Сегодня</Text>
            {habits.map((habit) => {
              const log = todayLogs[habit.id] || { completed: false, value: 0 };
              const progress = habit.target ? (log.value / habit.target) * 100 : 0;
              
              return (
                <View key={habit.id} style={styles.habitCard}>
                  <View style={styles.habitHeader}>
                    <Text style={styles.habitTitle}>{habit.title}</Text>
                    <View style={styles.habitHeaderRight}>
                      {log.completed && (
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      )}
                      <TouchableOpacity
                        onPress={() => deleteHabit(habit.id, habit.title)}
                        style={styles.deleteButton}
                      >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  {habit.target && (
                    <>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
                      </View>
                      <Text style={styles.progressText}>
                        {log.value} / {habit.target} ({Math.round(progress)}%)
                      </Text>
                      
                      <View style={styles.habitControls}>
                        <TouchableOpacity
                          style={styles.controlButton}
                          onPress={() => decrementHabit(habit.id, log.value)}
                          disabled={log.value === 0}
                        >
                          <Ionicons name="remove-circle" size={32} color={log.value === 0 ? colors.gray400 : colors.primary} />
                        </TouchableOpacity>
                        
                        <Text style={styles.currentValue}>{log.value}</Text>
                        
                        <TouchableOpacity
                          style={styles.controlButton}
                          onPress={() => incrementHabit(habit.id, log.value, habit.target)}
                          disabled={log.value >= habit.target}
                        >
                          <Ionicons name="add-circle" size={32} color={log.value >= habit.target ? colors.gray400 : colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                  
                  <TouchableOpacity
                    style={styles.deleteHabitButton}
                    onPress={() => deleteHabit(habit.id, habit.title)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                    <Text style={styles.deleteHabitText}>Удалить привычку</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новая привычка</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Название привычки</Text>
              <TextInput
                style={styles.input}
                value={newHabit.title}
                onChangeText={(text) => setNewHabit({ ...newHabit, title: text })}
                placeholder="Например: Выпить воды, Прочитать страниц..."
                placeholderTextColor={colors.textLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Цель в день (количество)</Text>
              <TextInput
                style={styles.input}
                value={newHabit.target}
                onChangeText={(text) => setNewHabit({ ...newHabit, target: text })}
                placeholder="Например: 8 (стаканов), 30 (страниц)"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleAddHabit}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? 'Создание...' : 'Создать привычку'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    paddingTop: spacing.xxl,
    backgroundColor: colors.white,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  loading: {
    marginTop: spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textLight,
    marginTop: spacing.md,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  habitCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  habitTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  habitHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  completedBadge: {
    marginLeft: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressText: {
    ...typography.bodySmall,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  habitControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    padding: spacing.sm,
  },
  currentValue: {
    ...typography.h2,
    color: colors.primary,
    marginHorizontal: spacing.lg,
    minWidth: 50,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  deleteHabitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: spacing.md,
  },
  deleteHabitText: {
    ...typography.bodySmall,
    color: colors.error,
    marginLeft: spacing.xs,
    fontWeight: '600',
  },
  habitHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
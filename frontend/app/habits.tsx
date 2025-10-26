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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Привычки</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
        ) : habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkbox-outline" size={64} color={colors.gray400} />
            <Text style={styles.emptyText}>Пока нет привычек</Text>
            <Text style={styles.emptySubtext}>Создайте свою первую привычку</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Сегодня</Text>
            {habits.map((habit) => (
              <TouchableOpacity
                key={habit.id}
                style={styles.habitCard}
                onPress={() => toggleHabit(habit.id)}
                activeOpacity={0.7}
              >
                <View style={styles.habitLeft}>
                  <View style={[
                    styles.checkbox,
                    todayLogs[habit.id] && styles.checkboxChecked
                  ]}>
                    {todayLogs[habit.id] && (
                      <Ionicons name="checkmark" size={20} color={colors.white} />
                    )}
                  </View>
                  <View style={styles.habitInfo}>
                    <Text style={[
                      styles.habitTitle,
                      todayLogs[habit.id] && styles.habitTitleCompleted
                    ]}>
                      {habit.title}
                    </Text>
                    {habit.target && (
                      <Text style={styles.habitTarget}>
                        Цель: {habit.target} {habit.type === 'quantitative' ? 'раз' : ''}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={colors.info} />
          <Text style={styles.infoText}>
            Нажмите на привычку чтобы отметить её выполненной за сегодня
          </Text>
        </View>
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray400,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  habitInfo: {
    flex: 1,
  },
  habitTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  habitTitleCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textLight,
  },
  habitTarget: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.sm,
  },
});
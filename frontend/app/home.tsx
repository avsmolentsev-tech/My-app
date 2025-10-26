import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useWaterStore } from '../store/useAuthStore';
import { colors, spacing, typography, borderRadius, shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { tipsAPI } from '../services/api';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { user, todayInfo, fetchTodayInfo } = useAuthStore();
  const { consumed, goal, glass, fetchToday, addWater } = useWaterStore();
  const [refreshing, setRefreshing] = useState(false);
  const [dailyTip, setDailyTip] = useState<string>('');
  const [loadingTip, setLoadingTip] = useState(true);
  const [habits, setHabits] = useState<any[]>([]);
  const [habitLogs, setHabitLogs] = useState<Record<string, any>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      fetchTodayInfo(),
      fetchToday(),
      loadDailyTip(),
      loadHabits(),
    ]);
  };

  const loadHabits = async () => {
    try {
      const { habitsAPI } = await import('../services/api');
      const data = await habitsAPI.getAll();
      setHabits(data.habits || []);
      
      // Load today's logs
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
      
      setHabitLogs(logs);
    } catch (error) {
      console.error('Error loading habits:', error);
    }
  };

  const loadDailyTip = async () => {
    try {
      setLoadingTip(true);
      const data = await tipsAPI.getDailyTip();
      setDailyTip(data.tip);
    } catch (error) {
      console.error('Error loading tip:', error);
      setDailyTip('Следи за водой: цель на сегодня — 2 л.');
    } finally {
      setLoadingTip(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddWater = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await addWater(glass);
  };

  const handleHabitIncrement = async (habitId: string, habit: any) => {
    const increment = Math.ceil(habit.target * 0.1);
    const currentValue = habitLogs[habitId]?.value || 0;
    const newValue = Math.min(currentValue + increment, habit.target);
    
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    try {
      const { habitsAPI } = await import('../services/api');
      await habitsAPI.log(habitId, {
        completed: newValue >= habit.target,
        value: newValue,
      });
      
      setHabitLogs({
        ...habitLogs,
        [habitId]: { completed: newValue >= habit.target, value: newValue },
      });
    } catch (error) {
      console.error('Error updating habit:', error);
    }
  };

  const handleHabitDelete = async (habitId: string, habitTitle: string) => {
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
              const { habitsAPI } = await import('../services/api');
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

  const waterProgress = Math.min((consumed / goal) * 100, 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Привет, {user?.name?.split(' ')[0] || 'дорогая'}!</Text>
          <Text style={styles.date}>
            {format(new Date(), 'dd MMMM, EEEE', { locale: ru })}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/settings' as any)}>
          <Ionicons name="settings-outline" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Today's Cycle Info */}
      {todayInfo?.has_settings && (
        <View style={[styles.card, styles.cycleCard]}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <Text style={styles.cardTitle}>Твой цикл сегодня</Text>
          </View>
          
          <View style={styles.cycleInfo}>
            <View style={styles.cycleItem}>
              <Text style={styles.cycleLabel}>День цикла</Text>
              <Text style={styles.cycleValue}>{todayInfo.cycle_day}</Text>
            </View>
            
            {todayInfo.dpo !== null && todayInfo.dpo >= 0 && (
              <View style={styles.cycleItem}>
                <Text style={styles.cycleLabel}>DPO</Text>
                <Text style={styles.cycleValue}>{todayInfo.dpo}</Text>
              </View>
            )}
            
            {todayInfo.days_until_ovulation !== null && todayInfo.days_until_ovulation > 0 && (
              <View style={styles.cycleItem}>
                <Text style={styles.cycleLabel}>До овуляции</Text>
                <Text style={styles.cycleValue}>{todayInfo.days_until_ovulation} дней</Text>
              </View>
            )}
          </View>
          
          {todayInfo.is_period && (
            <View style={[styles.statusBadge, { backgroundColor: colors.period + '20' }]}>
              <Text style={[styles.statusText, { color: colors.period }]}>Менструация</Text>
            </View>
          )}
          
          {todayInfo.is_ovulation && (
            <View style={[styles.statusBadge, { backgroundColor: colors.ovulation + '20' }]}>
              <Text style={[styles.statusText, { color: colors.ovulation }]}>Овуляция (прогноз)</Text>
            </View>
          )}
          
          {todayInfo.is_fertile_window && !todayInfo.is_ovulation && (
            <View style={[styles.statusBadge, { backgroundColor: colors.fertile + '20' }]}>
              <Text style={[styles.statusText, { color: colors.fertile }]}>Фертильное окно</Text>
            </View>
          )}
        </View>
      )}

      {/* Daily Tip */}
      <View style={[styles.card, styles.tipCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name="bulb" size={24} color={colors.secondary} />
          <Text style={styles.cardTitle}>Совет дня</Text>
        </View>
        {loadingTip ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.tipText}>{dailyTip}</Text>
        )}
      </View>

      {/* Water Tracker */}
      <View style={[styles.card, styles.waterCard]}>
        <View style={styles.cardHeader}>
          <Ionicons name="water" size={24} color={colors.water} />
          <Text style={styles.cardTitle}>Вода сегодня</Text>
        </View>
        
        <View style={styles.waterProgress}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${waterProgress}%` }]} />
          </View>
          <Text style={styles.waterText}>
            {consumed} / {goal} мл ({Math.round(waterProgress)}%)
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.waterButton}
          onPress={handleAddWater}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={colors.white} />
          <Text style={styles.waterButtonText}>Добавить стакан ({glass} мл)</Text>
        </TouchableOpacity>
      </View>

      {/* Habits Section */}
      {habits.length > 0 && (
        <View style={styles.habitsSection}>
          <Text style={styles.sectionTitle}>Мои привычки</Text>
          {habits.map((habit) => {
            const log = habitLogs[habit.id] || { completed: false, value: 0 };
            const progress = habit.target ? (log.value / habit.target) * 100 : 0;
            
            return (
              <View key={habit.id} style={[styles.card, styles.habitCard]}>
                <View style={styles.habitHeader}>
                  <Text style={styles.cardTitle}>{habit.title}</Text>
                  <View style={styles.habitHeaderRight}>
                    {log.completed && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    )}
                    <TouchableOpacity
                      onPress={() => handleHabitDelete(habit.id, habit.title)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.waterProgress}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%`, backgroundColor: colors.secondary }]} />
                  </View>
                  <Text style={styles.waterText}>
                    {log.value} / {habit.target} ({Math.round(progress)}%)
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.habitButton}
                  onPress={() => handleHabitIncrement(habit.id, habit)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={20} color={colors.white} />
                  <Text style={styles.habitButtonText}>
                    +{Math.ceil(habit.target * 0.1)}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/calendar' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={32} color={colors.primary} />
          <Text style={styles.actionText}>Календарь</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/journal' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="book-outline" size={32} color={colors.primary} />
          <Text style={styles.actionText}>Дневник</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => router.push('/habits' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="checkbox-outline" size={32} color={colors.primary} />
          <Text style={styles.actionText}>Привычки</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingTop: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
  },
  date: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: spacing.xs,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  cycleCard: {
    backgroundColor: colors.primaryLight + '40',
  },
  tipCard: {
    backgroundColor: colors.secondaryLight + '40',
  },
  waterCard: {
    backgroundColor: colors.waterLight + '40',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  cycleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  cycleItem: {
    alignItems: 'center',
  },
  cycleLabel: {
    ...typography.caption,
    color: colors.textLight,
    marginBottom: spacing.xs,
  },
  cycleValue: {
    ...typography.h3,
    color: colors.primary,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  statusText: {
    ...typography.bodySmall,
    fontWeight: '600',
  },
  tipText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
  },
  waterProgress: {
    marginBottom: spacing.md,
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
    backgroundColor: colors.water,
    borderRadius: borderRadius.full,
  },
  waterText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  waterButton: {
    flexDirection: 'row',
    backgroundColor: colors.water,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  waterButtonText: {
    ...typography.body,
    color: colors.white,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },
  waterHint: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionText: {
    ...typography.bodySmall,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  habitsSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  habitCard: {
    backgroundColor: colors.secondaryLight + '30',
  },
  habitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  habitHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  deleteButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  habitHint: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
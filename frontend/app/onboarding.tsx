import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { cycleAPI } from '../services/api';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function OnboardingScreen() {
  const router = useRouter();
  const { fetchCycleSettings, fetchTodayInfo } = useAuthStore();
  
  const [lastPeriodDate, setLastPeriodDate] = useState(subDays(new Date(), 7));
  const [lastPeriodDateString, setLastPeriodDateString] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avgCycleLength, setAvgCycleLength] = useState('28');
  const [periodLength, setPeriodLength] = useState('5');
  const [lutealLength, setLutealLength] = useState('14');
  const [loading, setLoading] = useState(false);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLastPeriodDate(selectedDate);
      setLastPeriodDateString(format(selectedDate, 'yyyy-MM-dd'));
    }
  };

  const handleWebDateChange = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      setLastPeriodDate(date);
      setLastPeriodDateString(dateString);
    } catch (error) {
      console.error('Invalid date:', error);
    }
  };

  const handleComplete = async () => {
    if (!avgCycleLength || !periodLength || !lutealLength) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните все поля');
      return;
    }

    setLoading(true);
    try {
      await cycleAPI.saveOnboarding({
        last_period_start: format(lastPeriodDate, 'yyyy-MM-dd'),
        avg_cycle_length: parseInt(avgCycleLength),
        period_length: parseInt(periodLength),
        luteal_length: parseInt(lutealLength),
      });

      await fetchCycleSettings();
      await fetchTodayInfo();

      router.replace('/home');
    } catch (error) {
      console.error('Onboarding error:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить данные. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="flower" size={60} color={colors.primary} />
          <Text style={styles.title}>Давай настроим твой трекер</Text>
          <Text style={styles.subtitle}>
            Эти данные помогут рассчитать прогнозы цикла и овуляции
          </Text>
        </View>

        <View style={styles.form}>
          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Дата начала последней менструации</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={24} color={colors.primary} />
              <Text style={styles.dateButtonText}>
                {format(lastPeriodDate, 'dd MMMM yyyy', { locale: ru })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={lastPeriodDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={subDays(new Date(), 90)}
              />
            )}
            <Text style={styles.hint}>Нажмите чтобы выбрать дату</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Средняя длина цикла (дней)</Text>
            <TextInput
              style={styles.input}
              value={avgCycleLength}
              onChangeText={setAvgCycleLength}
              keyboardType="number-pad"
              placeholder="28"
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.hint}>Обычно 24-35 дней</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Длина менструации (дней)</Text>
            <TextInput
              style={styles.input}
              value={periodLength}
              onChangeText={setPeriodLength}
              keyboardType="number-pad"
              placeholder="5"
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.hint}>Обычно 3-7 дней</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Длина лютеиновой фазы (дней)</Text>
            <TextInput
              style={styles.input}
              value={lutealLength}
              onChangeText={setLutealLength}
              keyboardType="number-pad"
              placeholder="14"
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.hint}>Обычно 12-16 дней, по умолчанию 14</Text>
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="information-circle" size={20} color={colors.warning} />
          <Text style={styles.disclaimerText}>
            Это приложение носит информационный характер и не является медицинским изделием или методом контрацепции.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Сохранение...' : 'Начать использовать'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.xxl,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
});
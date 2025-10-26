import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { cycleAPI } from '../services/api';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function CalendarScreen() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [calendarData, setCalendarData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    loadCalendar();
  }, []);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const start = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      
      const data = await cycleAPI.getCalendar(start, end);
      setCalendarData(data.calendar);
      
      // Создаём отмеченные даты для календаря
      const marked: any = {};
      data.calendar.forEach((day: any) => {
        const dots = [];
        let color = colors.gray300;
        
        if (day.is_period) {
          color = colors.period;
          dots.push({ color: colors.period });
        }
        if (day.is_ovulation) {
          color = colors.ovulation;
          dots.push({ color: colors.ovulation });
        }
        if (day.is_fertile_window && !day.is_ovulation) {
          color = colors.fertile;
          dots.push({ color: colors.fertile });
        }
        if (day.is_pms) {
          dots.push({ color: colors.pms });
        }
        
        marked[day.date] = {
          marked: dots.length > 0,
          dots: dots,
          selectedColor: color,
        };
      });
      
      // Отметить выбранную дату
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: colors.primary,
      };
      
      setMarkedDates(marked);
    } catch (error) {
      console.error('Error loading calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDayInfo = (date: string) => {
    if (!calendarData) return null;
    return calendarData.find((day: any) => day.date === date);
  };

  const selectedDayInfo = getDayInfo(selectedDate);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Календарь цикла</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <Calendar
            current={selectedDate}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markedDates={markedDates}
            markingType="multi-dot"
            theme={{
              backgroundColor: colors.background,
              calendarBackground: colors.white,
              textSectionTitleColor: colors.text,
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: colors.white,
              todayTextColor: colors.primary,
              dayTextColor: colors.text,
              textDisabledColor: colors.gray400,
              monthTextColor: colors.text,
              textMonthFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
            }}
          />

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>Обозначения:</Text>
            <View style={styles.legendItems}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.period }]} />
                <Text style={styles.legendText}>Менструация</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.ovulation }]} />
                <Text style={styles.legendText}>Овуляция</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.fertile }]} />
                <Text style={styles.legendText}>Фертильное окно</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.pms }]} />
                <Text style={styles.legendText}>ПМС</Text>
              </View>
            </View>
          </View>

          {/* Selected day info */}
          {selectedDayInfo && (
            <View style={styles.dayInfo}>
              <Text style={styles.dayInfoTitle}>Информация о дне</Text>
              <View style={styles.dayInfoContent}>
                <View style={styles.dayInfoRow}>
                  <Text style={styles.dayInfoLabel}>День цикла:</Text>
                  <Text style={styles.dayInfoValue}>{selectedDayInfo.cycle_day}</Text>
                </View>
                {selectedDayInfo.dpo !== null && (
                  <View style={styles.dayInfoRow}>
                    <Text style={styles.dayInfoLabel}>DPO:</Text>
                    <Text style={styles.dayInfoValue}>{selectedDayInfo.dpo}</Text>
                  </View>
                )}
                {selectedDayInfo.is_period && (
                  <View style={styles.statusTag}>
                    <Text style={styles.statusTagText}>Менструация</Text>
                  </View>
                )}
                {selectedDayInfo.is_ovulation && (
                  <View style={[styles.statusTag, { backgroundColor: colors.ovulation + '20' }]}>
                    <Text style={[styles.statusTagText, { color: colors.ovulation }]}>Овуляция (прогноз)</Text>
                  </View>
                )}
                {selectedDayInfo.is_fertile_window && !selectedDayInfo.is_ovulation && (
                  <View style={[styles.statusTag, { backgroundColor: colors.fertile + '20' }]}>
                    <Text style={[styles.statusTagText, { color: colors.fertile }]}>Фертильное окно</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.md,
  },
  legend: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  legendTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    marginBottom: spacing.sm,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  legendText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  dayInfo: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  dayInfoTitle: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  dayInfoContent: {
  },
  dayInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  dayInfoLabel: {
    ...typography.body,
    color: colors.textLight,
  },
  dayInfoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  statusTag: {
    backgroundColor: colors.period + '20',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  statusTagText: {
    ...typography.bodySmall,
    color: colors.period,
    fontWeight: '600',
  },
});
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { journalAPI } from '../services/api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function JournalScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    good_1: '',
    good_2: '',
    good_3: '',
    self_praise: '',
    mood: '',
    energy: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await journalAPI.getEntries();
      setEntries(data.entries || []);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.good_1 && !formData.good_2 && !formData.good_3) {
      Alert.alert('Ошибка', 'Заполните хотя бы одно хорошее событие');
      return;
    }

    setSaving(true);
    try {
      await journalAPI.createEntry({
        ...formData,
        mood: formData.mood ? parseInt(formData.mood) : undefined,
        energy: formData.energy ? parseInt(formData.energy) : undefined,
      });
      
      Alert.alert('Успешно', 'Запись сохранена');
      setShowForm(false);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        good_1: '',
        good_2: '',
        good_3: '',
        self_praise: '',
        mood: '',
        energy: '',
        notes: '',
      });
      await loadEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить запись');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Дневник</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? "close" : "add"} size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showForm && (
        <ScrollView style={styles.form}>
          <Text style={styles.formTitle}>Как прошёл твой день?</Text>
          <Text style={styles.formSubtitle}>Давай запишем, что было хорошего</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>3 хорошие вещи:</Text>
            <TextInput
              style={styles.input}
              value={formData.good_1}
              onChangeText={(text) => setFormData({ ...formData, good_1: text })}
              placeholder="1. Что хорошего произошло?"
              placeholderTextColor={colors.textLight}
              multiline
            />
            <TextInput
              style={styles.input}
              value={formData.good_2}
              onChangeText={(text) => setFormData({ ...formData, good_2: text })}
              placeholder="2. Что хорошего произошло?"
              placeholderTextColor={colors.textLight}
              multiline
            />
            <TextInput
              style={styles.input}
              value={formData.good_3}
              onChangeText={(text) => setFormData({ ...formData, good_3: text })}
              placeholder="3. Что хорошего произошло?"
              placeholderTextColor={colors.textLight}
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>За что могу себя похвалить?</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.self_praise}
              onChangeText={(text) => setFormData({ ...formData, self_praise: text })}
              placeholder="Напиши что-то хорошее о себе..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Настроение (1-10)</Text>
              <TextInput
                style={styles.input}
                value={formData.mood}
                onChangeText={(text) => setFormData({ ...formData, mood: text })}
                placeholder="8"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Энергия (1-10)</Text>
              <TextInput
                style={styles.input}
                value={formData.energy}
                onChangeText={(text) => setFormData({ ...formData, energy: text })}
                placeholder="7"
                placeholderTextColor={colors.textLight}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Заметки (необязательно)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Дополнительные мысли..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Сохранение...' : 'Сохранить'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {!showForm && (
        <ScrollView style={styles.entriesList}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
          ) : entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="book-outline" size={64} color={colors.gray400} />
              <Text style={styles.emptyText}>Пока нет записей</Text>
              <Text style={styles.emptySubtext}>Нажмите + чтобы создать первую запись</Text>
            </View>
          ) : (
            entries.map((entry, index) => (
              <View key={index} style={styles.entryCard}>
                <Text style={styles.entryDate}>
                  {format(new Date(entry.date), 'dd MMMM yyyy', { locale: ru })}
                </Text>
                {entry.good_1 && <Text style={styles.entryText}>✨ {entry.good_1}</Text>}
                {entry.good_2 && <Text style={styles.entryText}>✨ {entry.good_2}</Text>}
                {entry.good_3 && <Text style={styles.entryText}>✨ {entry.good_3}</Text>}
                {entry.self_praise && (
                  <Text style={styles.entryPraise}>💖 {entry.self_praise}</Text>
                )}
                <View style={styles.entryMeta}>
                  {entry.mood && (
                    <View style={styles.metaItem}>
                      <Ionicons name="happy-outline" size={16} color={colors.primary} />
                      <Text style={styles.metaText}>Настроение: {entry.mood}/10</Text>
                    </View>
                  )}
                  {entry.energy && (
                    <View style={styles.metaItem}>
                      <Ionicons name="flash-outline" size={16} color={colors.secondary} />
                      <Text style={styles.metaText}>Энергия: {entry.energy}/10</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
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
  form: {
    flex: 1,
    padding: spacing.md,
  },
  formTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    ...typography.body,
    color: colors.textLight,
    marginBottom: spacing.lg,
  },
  inputGroup: {
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
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray300,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 1,
    marginRight: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  entriesList: {
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
  entryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  entryDate: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  entryText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  entryPraise: {
    ...typography.body,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  entryMeta: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  metaText: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginLeft: spacing.xs,
  },
});
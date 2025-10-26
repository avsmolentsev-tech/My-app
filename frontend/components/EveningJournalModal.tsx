import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { journalAPI } from '../services/api';
import { format } from 'date-fns';

interface EveningJournalModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function EveningJournalModal({ visible, onClose, onSave }: EveningJournalModalProps) {
  const [good1, setGood1] = useState('');
  const [good2, setGood2] = useState('');
  const [good3, setGood3] = useState('');
  const [selfPraise, setSelfPraise] = useState('');
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!good1 && !good2 && !good3) {
      alert('Заполните хотя бы одно хорошее событие');
      return;
    }

    setSaving(true);
    try {
      await journalAPI.createEntry({
        date: format(new Date(), 'yyyy-MM-dd'),
        good_1: good1,
        good_2: good2,
        good_3: good3,
        self_praise: selfPraise,
        mood: mood ? parseInt(mood) : undefined,
        energy: energy ? parseInt(energy) : undefined,
        notes,
      });
      
      // Очистить поля
      setGood1('');
      setGood2('');
      setGood3('');
      setSelfPraise('');
      setMood('');
      setEnergy('');
      setNotes('');
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving journal:', error);
      alert('Не удалось сохранить запись');
    } finally {
      setSaving(false);
    }
  };

  const handleRemindLater = () => {
    // Напомнить через 30 минут
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={styles.header}>
                <Ionicons name="moon" size={32} color={colors.primary} />
                <Text style={styles.title}>Как прошёл твой день?</Text>
                <Text style={styles.subtitle}>
                  Давай запишем, что было хорошего и за что можешь себя похвалить
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>3 хорошие вещи:</Text>
                <TextInput
                  style={styles.input}
                  value={good1}
                  onChangeText={setGood1}
                  placeholder="1. Что хорошего произошло?"
                  placeholderTextColor={colors.textLight}
                  multiline
                />
                <TextInput
                  style={styles.input}
                  value={good2}
                  onChangeText={setGood2}
                  placeholder="2. Что хорошего произошло?"
                  placeholderTextColor={colors.textLight}
                  multiline
                />
                <TextInput
                  style={styles.input}
                  value={good3}
                  onChangeText={setGood3}
                  placeholder="3. Что хорошего произошло?"
                  placeholderTextColor={colors.textLight}
                  multiline
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>За что могу себя похвалить?</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={selfPraise}
                  onChangeText={setSelfPraise}
                  placeholder="Напиши что-то хорошее о себе..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.row}>
                <View style={styles.halfSection}>
                  <Text style={styles.label}>Настроение (1-10)</Text>
                  <TextInput
                    style={styles.input}
                    value={mood}
                    onChangeText={setMood}
                    placeholder="8"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
                <View style={styles.halfSection}>
                  <Text style={styles.label}>Энергия (1-10)</Text>
                  <TextInput
                    style={styles.input}
                    value={energy}
                    onChangeText={setEnergy}
                    placeholder="7"
                    placeholderTextColor={colors.textLight}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                </View>
              </View>

              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>
                    {saving ? 'Сохранение...' : 'Сохранить'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.laterButton]}
                  onPress={handleRemindLater}
                >
                  <Text style={styles.laterButtonText}>Напомнить позже</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.skipButton]}
                  onPress={onClose}
                >
                  <Text style={styles.skipButtonText}>Пропустить сегодня</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textLight,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  halfSection: {
    flex: 1,
    marginRight: spacing.sm,
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
    marginBottom: spacing.sm,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  buttons: {
    marginTop: spacing.md,
  },
  button: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  laterButton: {
    backgroundColor: colors.secondary,
  },
  laterButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: colors.gray200,
  },
  skipButtonText: {
    ...typography.body,
    color: colors.textLight,
    fontWeight: '600',
  },
});
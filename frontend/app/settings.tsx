import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/useAuthStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    Alert.alert(
      'Выход',
      'Вы уверены, что хотите выйти?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Выйти',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              router.replace('/login');
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
        <Text style={styles.headerTitle}>Настройки</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Профиль</Text>
          <View style={styles.card}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={32} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.userName}>{user?.name || 'Пользователь'}</Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Настройки</Text>
          
          <TouchableOpacity
            style={styles.option}
            onPress={() => router.push('/onboarding' as any)}
          >
            <View style={styles.optionLeft}>
              <Ionicons name="calendar-outline" size={24} color={colors.text} />
              <Text style={styles.optionText}>Настройки цикла</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>О приложении</Text>
          
          <View style={styles.card}>
            <View style={styles.disclaimer}>
              <Ionicons name="information-circle" size={24} color={colors.warning} />
              <Text style={styles.disclaimerText}>
                Это приложение носит информационный характер и не является медицинским изделием или методом контрацепции. По вопросам здоровья обратитесь к врачу.
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
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
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textLight,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  userName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  userEmail: {
    ...typography.bodySmall,
    color: colors.textLight,
    marginTop: spacing.xs,
  },
  option: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: spacing.xs,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.sm,
    lineHeight: 20,
  },
  logoutButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error,
    marginTop: spacing.md,
    marginBottom: spacing.xxl,
  },
  logoutText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
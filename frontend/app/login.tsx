import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAuthStore } from '../store/useAuthStore';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuthStore();
  const [processing, setProcessing] = React.useState(false);

  useEffect(() => {
    // Обработка deep link после авторизации
    const handleDeepLink = async (event: Linking.EventType) => {
      const url = event.url;
      
      // Извлекаем session_id из фрагмента URL
      const hashParams = url.split('#')[1];
      if (!hashParams) return;
      
      const params = new URLSearchParams(hashParams);
      const sessionId = params.get('session_id');
      
      if (sessionId) {
        setProcessing(true);
        try {
          await login(sessionId);
          // После успешного входа роутер автоматически перенаправит
        } catch (error) {
          console.error('Login failed:', error);
          alert('Ошибка входа. Пожалуйста, попробуйте снова.');
        } finally {
          setProcessing(false);
        }
      }
    };

    // Подписка на deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Проверка начального URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Если уже авторизован, перенаправляем
    if (isAuthenticated) {
      router.replace('/home');
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    const redirectUrl = Linking.createURL('/home');
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    
    try {
      await WebBrowser.openBrowserAsync(authUrl);
    } catch (error) {
      console.error('Failed to open browser:', error);
      alert('Не удалось открыть браузер для входа');
    }
  };

  const handleTestLogin = async () => {
    setProcessing(true);
    try {
      const response = await fetch(process.env.EXPO_PUBLIC_BACKEND_URL + '/api/auth/test-login', {
        method: 'POST',
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (data.session_token) {
        await login(data.session_token);
        router.replace('/onboarding');
      }
    } catch (error) {
      console.error('Test login failed:', error);
      alert('Ошибка тестового входа');
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading || processing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Иконка/логотип */}
        <View style={styles.iconContainer}>
          <Ionicons name="flower" size={80} color={colors.primary} />
        </View>
        
        <Text style={styles.title}>CycleWise</Text>
        <Text style={styles.subtitle}>Твой персональный трекер цикла</Text>
        
        <View style={styles.features}>
          <FeatureItem icon="calendar" text="Трекинг цикла и овуляции" />
          <FeatureItem icon="water" text="Контроль водного баланса" />
          <FeatureItem icon="checkbox" text="Отслеживание привычек" />
          <FeatureItem icon="book" text="Дневник и рефлексия" />
          <FeatureItem icon="stats-chart" text="Полезные сводки" />
        </View>
        
        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Ionicons name="logo-google" size={24} color={colors.white} style={styles.googleIcon} />
          <Text style={styles.loginButtonText}>Войти через Google</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.loginButton, styles.testLoginButton]}
          onPress={handleTestLogin}
          activeOpacity={0.8}
        >
          <Ionicons name="flask" size={24} color={colors.primary} style={styles.googleIcon} />
          <Text style={[styles.loginButtonText, styles.testLoginText]}>Тестовый вход (для проверки)</Text>
        </TouchableOpacity>
        
        <Text style={styles.disclaimer}>
          Это приложение носит информационный характер и не является медицинским изделием или методом контрацепции. По вопросам здоровья обратитесь к врачу.
        </Text>
      </View>
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textLight,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  features: {
    alignSelf: 'stretch',
    marginBottom: spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  featureText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginBottom: spacing.md,
  },
  testLoginButton: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  googleIcon: {
    marginRight: spacing.sm,
  },
  loginButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '600',
  },
  testLoginText: {
    color: colors.primary,
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  loadingText: {
    ...typography.body,
    color: colors.textLight,
    marginTop: spacing.md,
  },
});

// App.tsx

import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { colors } from '@/styles/colors';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';
import { AuthProvider } from '@/context/AuthContext';
import { SubscriptionProvider } from '@/context/SubscriptionContext';

// import de páginas
import TitleListScreen from '@/screens/TitleListScreen';
import TitleDetailScreen from '@/screens/TitleDetailScreen';
import StatisticsScreen from '@/screens/StatisticsScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import LoginScreen from '@/screens/LoginScreen';
import ChangePasswordScreen from '@/screens/ChangePasswordScreen';
import SubscriptionScreen from '@/screens/SubscriptionScreen';
import ProfileScreen from '@/screens/ProfileScreen';

export type RootStackParamList = {
  TitleList: undefined;
  TitleDetail: { id?: string } | undefined;
  Settings: undefined;
  Statistics: undefined;
  Login: undefined;
  ChangePassword: undefined;
  Subscription: undefined;
  Profile: undefined;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { theme } = useTheme();
  const themeColors = colors[theme];

  const navigationTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: themeColors.background,
      text: themeColors.text,
      card: themeColors.card,
      border: themeColors.border,
      primary: themeColors.primary,
    },
  };

  return (
    <>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor={themeColors.background}
      />
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator initialRouteName='TitleList' id={undefined}>
          <Stack.Screen
            name='TitleList'
            component={TitleListScreen}
            options={{
              title: 'Minhas Leituras'
            }}
          />
          <Stack.Screen
            name='TitleDetail'
            component={TitleDetailScreen}
            options={{
              title: 'Detalhes do título',
              headerRight: () => <ThemeToggleButton />,
            }}
          />
          <Stack.Screen
            name='Settings'
            component={SettingsScreen}
            options={{
              title: 'Configurações',
              headerRight: () => <ThemeToggleButton />,
            }}
          />
          <Stack.Screen
            name='Statistics'
            component={StatisticsScreen}
            options={{
              title: 'Estatísticas',
              headerRight: () => <ThemeToggleButton />,
            }}
          />
          <Stack.Screen
            name='Login'
            component={LoginScreen}
            options={{
              title: 'Login',
            }}
          />
          <Stack.Screen
            name='ChangePassword'
            component={ChangePasswordScreen}
            options={{
              title: 'Trocar Senha'
            }}
          />
          <Stack.Screen
            name='Subscription'
            component={SubscriptionScreen}
            options={{
              title: 'Assinatura',
              headerRight: () => <ThemeToggleButton />
            }}
          />
          <Stack.Screen
            name='Profile'
            component={ProfileScreen}
            options={{
              title: 'Perfil',
              headerRight: () => <ThemeToggleButton />
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <SafeAreaView style={{ flex: 1 }}>
              <AppNavigator />
            </SafeAreaView>
            <Toast />
          </SubscriptionProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '@clerk/clerk-expo';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { StorageProvider } from './src/contexts/StorageContext';
import { CurrencyProvider } from './src/contexts/CurrencyContext';
import { ClerkProviderWrapper } from './src/components/ClerkProviderWrapper';
import { initializeData } from './src/lib/init';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { TradesScreen } from './src/screens/TradesScreen';
import { TradeDetailScreen } from './src/screens/TradeDetailScreen';
import { EditTradeScreen } from './src/screens/EditTradeScreen';
import { NewTradeScreen } from './src/screens/NewTradeScreen';
import { TrackScreen } from './src/screens/TrackScreen';
import { ReviewTabScreen } from './src/screens/ReviewTabScreen';
import { YouScreen } from './src/screens/YouScreen';
import { RiskScreen } from './src/screens/RiskScreen';
import { StrategiesScreen } from './src/screens/StrategiesScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SignInScreen } from './src/screens/SignInScreen';
import { SignUpScreen } from './src/screens/SignUpScreen';
import { TabIcon } from './src/components/TabIcon';

const Tab = createBottomTabNavigator();
const TrackStack = createStackNavigator();
const YouStack = createStackNavigator();
const AuthStack = createStackNavigator();

function LoadingScreen() {
  const { colors, theme } = useTheme();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ActivityIndicator size="large" color={colors.text} />
      <Text style={{ color: colors.text, marginTop: 10 }}>Loading...</Text>
    </View>
  );
}

function TrackStackNavigator() {
  const { colors } = useTheme();
  
  return (
    <TrackStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
        headerTintColor: colors.text,
      }}
    >
      <TrackStack.Screen 
        name="TrackMain"
        options={{ headerShown: false }}
      >
        {(props) => (
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <TrackScreen {...props} />
          </SafeAreaView>
        )}
      </TrackStack.Screen>
      <TrackStack.Screen 
        name="TradeDetail" 
        component={TradeDetailScreen}
        options={{ title: 'Trade Details' }}
      />
      <TrackStack.Screen 
        name="EditTrade" 
        component={EditTradeScreen}
        options={{ headerShown: false }}
      />
      <TrackStack.Screen 
        name="NewTrade" 
        component={NewTradeScreen}
        options={{ headerShown: false }}
      />
    </TrackStack.Navigator>
  );
}

function YouStackNavigator() {
  const { colors } = useTheme();
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <YouStack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerBackTitleVisible: false,
        }}
      >
        <YouStack.Screen 
          name="YouMain"
          component={YouScreen}
          options={{ headerShown: false }}
        />
        <YouStack.Screen 
          name="Risk"
          component={RiskScreen}
          options={({ navigation }) => ({ 
            title: 'Risk Dashboard',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={{ paddingLeft: 8, paddingRight: 16 }}
              >
                <Text style={{ fontSize: 28, color: colors.text }}>‹</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <YouStack.Screen 
          name="Strategies"
          component={StrategiesScreen}
          options={({ navigation }) => ({ 
            title: 'Strategies',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={{ paddingLeft: 8, paddingRight: 16 }}
              >
                <Text style={{ fontSize: 28, color: colors.text }}>‹</Text>
              </TouchableOpacity>
            ),
          })}
        />
        <YouStack.Screen 
          name="Settings"
          component={SettingsScreen}
          options={({ navigation }) => ({ 
            title: 'Settings',
            headerLeft: () => (
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={{ paddingLeft: 8, paddingRight: 16 }}
              >
                <Text style={{ fontSize: 28, color: colors.text }}>‹</Text>
              </TouchableOpacity>
            ),
          })}
        />
      </YouStack.Navigator>
    </SafeAreaView>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

function TabNavigator() {
  const { colors, theme } = useTheme();

  return (
    <>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color }) => {
            let iconName: 'home' | 'chart-bar' | 'book-open' | 'user';

            if (route.name === 'Home') {
              iconName = 'home';
            } else if (route.name === 'Trades') {
              iconName = 'chart-bar';
            } else if (route.name === 'Journal') {
              iconName = 'book-open';
            } else if (route.name === 'You') {
              iconName = 'user';
            } else {
              iconName = 'home';
            }

            return <TabIcon name={iconName} size={24} color={focused ? colors.text : colors.textSecondary} />;
          },
          tabBarActiveTintColor: colors.text,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 84,
            paddingTop: 8,
            paddingBottom: 28,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
          },
          headerStyle: {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
          headerTintColor: colors.text,
          header: () => null, // Hide default header for all tabs
        })}
      >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen} 
      />
      <Tab.Screen 
        name="Trades" 
        component={TrackStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Always navigate to TrackMain when tab is pressed
            navigation.navigate('Trades', { screen: 'TrackMain' });
          },
        })}
      />
      <Tab.Screen 
        name="Journal"
      >
        {(props) => (
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <ReviewTabScreen {...props} />
          </SafeAreaView>
        )}
      </Tab.Screen>
      <Tab.Screen 
        name="You" 
        component={YouStackNavigator} 
      />
    </Tab.Navigator>
    </>
  );
}

function AppNavigator() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={{ color: '#fff', marginTop: 10 }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isSignedIn ? <TabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        // Only initialize data if using localStorage (not database)
        // Database initialization happens after authentication
        // await initializeData();
        setIsReady(true);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setIsReady(true); // Still show app even if init fails
      }
    }
    init();
  }, []);

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <ThemeProvider>
          <CurrencyProvider>
            <LoadingScreen />
          </CurrencyProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  }

  if (error) {
    console.error('App error:', error);
  }

  return (
    <ClerkProviderWrapper>
      <SafeAreaProvider>
        <ThemeProvider>
          <CurrencyProvider>
            <StorageProvider>
              <AppNavigator />
            </StorageProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ClerkProviderWrapper>
  );
}

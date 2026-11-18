import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { ExploreScreen } from '../screens/ExploreScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SavedRoutesScreen } from '../screens/SavedRoutesScreen';
import { TabBar } from './TabBar';
import { AppTabParamList } from './types';

const Tab = createBottomTabNavigator<AppTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Routes" component={SavedRoutesScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

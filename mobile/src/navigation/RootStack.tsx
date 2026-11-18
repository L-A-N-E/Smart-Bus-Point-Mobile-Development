import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ActiveTripScreen } from '../screens/ActiveTripScreen';
import { LineDetailScreen } from '../screens/LineDetailScreen';
import { RailStatusScreen } from '../screens/RailStatusScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { RouteDetailScreen } from '../screens/RouteDetailScreen';
import { RoutePlannerScreen } from '../screens/RoutePlannerScreen';
import { RouteResultsScreen } from '../screens/RouteResultsScreen';
import { ScanQrScreen } from '../screens/ScanQrScreen';
import { StopDetailScreen } from '../screens/StopDetailScreen';
import { MainTabs } from './MainTabs';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabs} />
      <Stack.Screen name="ScanQr" component={ScanQrScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="StopDetail" component={StopDetailScreen} />
      <Stack.Screen name="LineDetail" component={LineDetailScreen} />
      <Stack.Screen name="RoutePlanner" component={RoutePlannerScreen} />
      <Stack.Screen name="RouteResults" component={RouteResultsScreen} />
      <Stack.Screen name="RouteDetail" component={RouteDetailScreen} />
      <Stack.Screen name="ActiveTrip" component={ActiveTripScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="RailStatus" component={RailStatusScreen} />
      <Stack.Screen name="Report" component={ReportScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

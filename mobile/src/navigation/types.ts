import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RoutePoint } from '../contexts/SavedRoutesContext';
import { PlanRequest, RouteOption } from '../services/api';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Home: undefined;
  Routes: undefined;
  Explore: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<AppTabParamList>;
  // Modal aberto pelo botão central da TabBar.
  ScanQr: undefined;
  // Aberta pelo scanner, pela busca ou pelo deep link sbp://parada/<codigo>.
  StopDetail: { code: string };
  LineDetail: { routeId: string; vehiclesCode: number | null; shortName: string; destination: string; origin: string };
  RoutePlanner: { presetOrigin?: RoutePoint } | undefined;
  RouteResults: { request: PlanRequest; originLabel: string; destinationLabel: string };
  RouteDetail: { option: RouteOption; request: PlanRequest; originLabel: string; destinationLabel: string };
  ActiveTrip: { option: RouteOption; originLabel: string; destinationLabel: string };
  RailStatus: undefined;
  Report: { stopCode?: string; line?: string };
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type AppTabScreenProps<T extends keyof AppTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

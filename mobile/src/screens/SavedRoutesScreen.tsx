import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Dialog, EmptyState, Icon, Screen, ScreenHeader, TextField } from '../components';
import { useI18n } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { SavedRoute, useSavedRoutes } from '../contexts/SavedRoutesContext';
import { AppTabScreenProps } from '../navigation/types';
import { spacing } from '../tokens';
import { tap } from '../utils/haptics';

export function SavedRoutesScreen({ navigation }: AppTabScreenProps<'Routes'>) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const showToast = useToast();
  const { routes, removeRoute, renameRoute, restoreRoute } = useSavedRoutes();

  const [renaming, setRenaming] = useState<SavedRoute | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<SavedRoute | null>(null);

  const openPlanner = () => navigation.getParent()?.navigate('RoutePlanner', undefined);

  const openSavedRoute = (saved: SavedRoute) => {
    tap();
    showToast({ message: t('routes.recalculating'), icon: 'refresh' });
    navigation.getParent()?.navigate('RouteResults', {
      request: {
        origin: { lat: saved.origin.lat, lng: saved.origin.lng },
        destination: { lat: saved.destination.lat, lng: saved.destination.lng },
        onlyAccessible: saved.preferences.onlyAccessible,
        lessWalking: saved.preferences.lessWalking,
      },
      originLabel: saved.origin.label,
      destinationLabel: saved.destination.label,
    });
  };

  const confirmDelete = () => {
    if (!deleting) return;
    removeRoute(deleting.id);
    showToast({
      message: t('routes.deleted'),
      icon: 'delete-outline',
      action: { label: t('common.undo'), onPress: () => restoreRoute(deleting) },
    });
    setDeleting(null);
  };

  const confirmRename = () => {
    if (!renaming || !renameValue.trim()) return;
    renameRoute(renaming.id, renameValue.trim());
    setRenaming(null);
    setRenameValue('');
  };

  return (
    <Screen scroll={false}>
      <ScreenHeader title={t('routes.savedTitle')} logo />

      <FlatList
        data={routes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Card onPress={() => openSavedRoute(item)} accessibilityLabel={item.name} style={styles.row}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
              <Icon name="map-marker-path" size={20} color={colors.primaryText} />
            </View>
            <View style={styles.flex}>
              <AppText variant="title" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {item.origin.label} → {item.destination.label}
              </AppText>
            </View>
            <Pressable
              onPress={() => {
                setRenaming(item);
                setRenameValue(item.name);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('routes.rename')}
              hitSlop={8}
              style={styles.iconButton}
            >
              <Icon name="pencil-outline" size={18} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={() => setDeleting(item)}
              accessibilityRole="button"
              accessibilityLabel={t('routes.delete')}
              hitSlop={8}
              style={styles.iconButton}
            >
              <Icon name="trash-can-outline" size={18} color={colors.dangerText} />
            </Pressable>
          </Card>
        )}
        ListHeaderComponent={
          <Button title={t('routes.newRoute')} icon="plus" onPress={openPlanner} style={styles.newRouteButton} />
        }
        ListEmptyComponent={
          <EmptyState icon="map-marker-path" title={t('routes.noSavedTitle')} description={t('routes.noSavedDescription')} />
        }
      />

      <Dialog
        visible={Boolean(deleting)}
        icon="trash-can-outline"
        title={t('routes.deleteConfirmTitle')}
        message={deleting ? t('routes.deleteConfirmMessage', { name: deleting.name }) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />

      <Modal visible={Boolean(renaming)} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
          <View style={[styles.renameCard, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityViewIsModal>
            <AppText variant="h3" style={styles.renameTitle}>
              {t('routes.renameTitle')}
            </AppText>
            <TextField value={renameValue} onChangeText={setRenameValue} autoFocus accessibilityLabel={t('routes.renameTitle')} />
            <View style={styles.renameActions}>
              <Button title={t('common.cancel')} variant="secondary" onPress={() => setRenaming(null)} style={styles.flex} />
              <Button title={t('common.save')} onPress={confirmRename} style={styles.flex} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xxxl },
  newRouteButton: { marginBottom: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  renameCard: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: spacing.xl },
  renameTitle: { marginBottom: spacing.lg },
  renameActions: { flexDirection: 'row', gap: spacing.md },
});

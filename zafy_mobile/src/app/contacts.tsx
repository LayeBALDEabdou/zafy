import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SwipeToDelete } from '@/components/SwipeToDelete';
import { useT } from '@/i18n';
import { parseContactCard } from '@/lib/contactCard';
import { contactSubtitle, deleteContact, emitContactPick, loadContacts, type Contact } from '@/lib/contacts';
import { onScan } from '@/lib/scan';
import { colors, fonts } from '@/theme';

/** Annuaire : les personnes à qui on envoie de l'argent. `?pick=1` = choisir un contact pour un envoi. */
export default function Contacts() {
  const { t } = useT();
  const { pick } = useLocalSearchParams<{ pick?: string }>();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [query, setQuery] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);

  // Carte Zafy scannée : écran de confirmation, rien à écrire
  useEffect(
    () =>
      onScan((data) => {
        const card = parseContactCard(data);
        if (!card) {
          setScanError(t('contacts.notCard'));
          return;
        }
        setScanError(null);
        router.push({
          pathname: '/ajouter-contact',
          params: { n: card.name, a: card.address, ...(card.phone ? { p: card.phone } : {}) },
        });
      }),
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      loadContacts()
        .then(setContacts)
        .catch(() => setContacts([]));
    }, []),
  );

  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const list = (contacts ?? []).filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      (digits.length > 0 && (c.phone ?? '').replace(/\D/g, '').includes(digits)),
  );

  const choose = (c: Contact) => {
    if (pick) {
      emitContactPick(c);
      router.back();
    } else {
      router.push({ pathname: '/contact', params: { id: c.id } });
    }
  };

  const remove = async (c: Contact) => {
    await deleteContact(c.id);
    setContacts((all) => all?.filter((x) => x.id !== c.id) ?? null);
  };

  return (
    <Screen header={<ScreenHeader title={pick ? t('contacts.pickTitle') : t('contacts.title')} />}>
      {contacts && contacts.length > 0 ? (
        <View style={styles.search}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('contacts.search')}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} accessibilityLabel={t('a11y.clearSearch')} hitSlop={8}>
              <Icon name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Card fill style={styles.list}>
        {contacts && contacts.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="user" size={28} color={colors.successText} />
            <Text style={styles.emptyText}>
              {t('contacts.empty')}
            </Text>
          </View>
        ) : contacts && list.length === 0 ? (
          <Text style={styles.noResult}>{t('contacts.noResult')}</Text>
        ) : (
          list.map((c, i) => (
            <SwipeToDelete
              key={c.id}
              title={t('contacts.deleteTitle')}
              message={t('contacts.deleteMessage', { name: c.name })}
              onDelete={() => remove(c)}
              style={i < list.length - 1 && styles.divider}>
              <Pressable onPress={() => choose(c)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{c.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text style={styles.name} numberOfLines={1}>
                    {c.name}
                  </Text>
                  <Text style={styles.sub} numberOfLines={1}>
                    {contactSubtitle(c)}
                  </Text>
                </View>
                <Icon name={pick ? 'send' : 'chevronRight'} size={18} color={colors.textSecondary} />
              </Pressable>
            </SwipeToDelete>
          ))
        )}
      </Card>
      {list.length > 0 ? <Text style={styles.hint}>{t('contacts.swipeHint')}</Text> : null}

      {scanError ? <Text style={styles.scanError}>{scanError}</Text> : null}
      <PrimaryButton
        title={t('contacts.scanCard')}
        icon={<Icon name="scan" size={18} color={colors.navy} strokeWidth={2.4} />}
        onPress={() => router.push('/scanner')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, minWidth: 0, color: colors.navy, fontFamily: fonts.inter500, fontSize: 15, padding: 0 },
  list: { paddingVertical: 8, paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.background },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.turquoise,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.sora700, fontSize: 16, color: colors.navy },
  rowBody: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.inter600, fontSize: 15, color: colors.navy },
  sub: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary },
  empty: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 24 },
  emptyText: { fontFamily: fonts.inter400, fontSize: 14, lineHeight: 20, color: colors.textSecondary, textAlign: 'center' },
  noResult: { fontFamily: fonts.inter500, fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: 24 },
  scanError: { fontFamily: fonts.inter600, fontSize: 14, color: colors.dangerText, textAlign: 'center' },
  hint: { fontFamily: fonts.inter400, fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: -6 },
});

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../theme/tokens';
import { WALLET_TERMINOLOGY } from '../../constants/terminology';

interface WalletSwitcherProps {
    activeWallet: 'public' | 'privacy';
    onSwitch: (wallet: 'public' | 'privacy') => void;
    publicBalance: string;
    privacyBalance: string;
}

const { width } = Dimensions.get('window');

export default function WalletSwitcher({
    activeWallet,
    onSwitch,
    publicBalance,
    privacyBalance,
}: WalletSwitcherProps) {

    const isPrivacy = activeWallet === 'privacy';

    return (
        <View style={styles.container}>
            {/* Public Tab */}
            <TouchableOpacity
                style={[
                    styles.tab,
                    { backgroundColor: !isPrivacy ? COLORS.accent : 'transparent' }
                ]}
                onPress={() => onSwitch('public')}
                activeOpacity={0.8}
            >
                <Text style={[
                    styles.label,
                    { color: !isPrivacy ? COLORS.textPrimary : COLORS.textSecondary }
                ]}>
                    🌐 {WALLET_TERMINOLOGY.public.screenTitle}
                </Text>
                <Text style={[
                    styles.balance,
                    { color: !isPrivacy ? COLORS.textPrimary : COLORS.textSecondary }
                ]}>
                    {publicBalance}
                </Text>
                {!isPrivacy && (
                    <Text style={styles.activeLabel}>[ACTIVE]</Text>
                )}
            </TouchableOpacity>

            {/* Privacy Tab */}
            <TouchableOpacity
                style={[
                    styles.tab,
                    { backgroundColor: isPrivacy ? COLORS.privacyAccent : 'transparent' }
                ]}
                onPress={() => onSwitch('privacy')}
                activeOpacity={0.8}
            >
                <Text style={[
                    styles.label,
                    { color: isPrivacy ? COLORS.textPrimary : COLORS.textSecondary }
                ]}>
                    🔒 {WALLET_TERMINOLOGY.privacy.screenTitle}
                </Text>
                <Text style={[
                    styles.balance,
                    { color: isPrivacy ? COLORS.textPrimary : COLORS.textSecondary }
                ]}>
                    {privacyBalance}
                </Text>
                {isPrivacy && (
                    <Text style={styles.activeLabel}>[ACTIVE]</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: BORDER_RADIUS.xl,
        padding: 4,
        marginHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        height: 80,
    },
    tab: {
        flex: 1,
        borderRadius: BORDER_RADIUS.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontFamily: TYPOGRAPHY.fontFamily.bold,
        fontSize: TYPOGRAPHY.fontSize.md,
        marginBottom: 4,
    },
    balance: {
        fontFamily: TYPOGRAPHY.fontFamily.regular,
        fontSize: TYPOGRAPHY.fontSize.sm,
    },
    activeLabel: {
        fontFamily: TYPOGRAPHY.fontFamily.regular,
        fontSize: 10,
        marginTop: 4,
        opacity: 0.8,
        color: COLORS.textPrimary,
    },
});

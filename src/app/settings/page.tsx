import type { Metadata } from 'next';
import { AppearanceControl } from '@/components/appearance-control';
import { NativeActions } from '@/components/native-actions';

export const metadata: Metadata = { title: 'Appearance and settings' };
export default function SettingsPage() {
  return <section className="shell inner-page narrow-page">
    <p className="eyebrow">YOUR EXPERIENCE</p>
    <h1 className="inner-heading">Make it <em>yours.</em></h1>
    <p className="inner-lede">Choose the look that feels right for you. Your selection is saved in this browser, and System follows your device preference.</p>
    <div className="settings-panel">
      <div><h2>Appearance</h2><p>Select light, dark or system colour mode. This setting doesn’t require an account.</p></div>
      <AppearanceControl />
    </div>
    <div className="settings-native-divider"/>
    <NativeActions />
    <p className="settings-note">Account security, notification preferences, privacy and language settings will become available with verified sign-in.</p>
  </section>;
}

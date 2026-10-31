import type { Metadata } from 'next';
import { AppearanceControl } from '@/components/appearance-control';

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
    <p className="settings-note">More settings for notification preferences, account security, privacy and language will become available when sign-in is ready.</p>
  </section>;
}

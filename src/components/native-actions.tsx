'use client';

import { useEffect, useState } from 'react';
import { ArrowSquareOut, CheckCircle, DeviceMobile, ShareNetwork } from '@phosphor-icons/react';

type InstallState = 'unknown' | 'installed' | 'ios' | 'browser';

export function NativeActions() {
  const [installState, setInstallState] = useState<InstallState>('unknown');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone) setInstallState('installed');
    else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) setInstallState('ios');
    else setInstallState('browser');
  }, []);

  async function share() {
    const url = window.location.origin;
    const data = { title: 'Duzelo', text: 'A little help. A lot closer.', url };
    try {
      if (navigator.share) {
        await navigator.share(data);
        setFeedback('Share sheet opened.');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setFeedback('Link copied to clipboard.');
      } else {
        setFeedback('Copy this link: ' + url);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFeedback('Sharing is unavailable. Copy this link: ' + url);
    }
  }

  return (
    <div className="native-actions">
      <div className="native-install-panel">
        <span className="native-actions-icon"><DeviceMobile size={23} aria-hidden="true" /></span>
        <div>
          <h2>Take Duzelo with you</h2>
          <p>{installState === 'installed'
            ? 'Duzelo is running in its home-screen experience.'
            : installState === 'ios'
              ? 'On iPhone or iPad, open this site in Safari, tap Share, then Add to Home Screen.'
              : 'Install Duzelo from your browser’s Install app or Add to Home Screen menu when available.'}</p>
          <p>Public pages you have visited may work offline. Sign-in and private services require a connection.</p>
        </div>
        {installState === 'installed' && <CheckCircle size={24} className="native-installed" aria-label="Installed" />}
      </div>
      <button type="button" className="button button-outline native-share" onClick={() => void share()}>
        <ShareNetwork size={20} aria-hidden="true" /> Share Duzelo <ArrowSquareOut size={16} aria-hidden="true" />
      </button>
      <p role="status" aria-live="polite" className="native-feedback">{feedback}</p>
    </div>
  );
}

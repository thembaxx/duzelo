export const metadata = { robots: { index: false, follow: false } };
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <section className="shell inner-page account-page">{children}</section>;
}

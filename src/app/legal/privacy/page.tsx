export default function LegalPreview() {
  return (
    <section className="shell inner-page narrow-page">
      <p className="eyebrow">Development preview</p>
      <h1 className="inner-heading">Preview privacy notice</h1>
      <p className="inner-lede">
        Local testing stores a fixture phone identity, display name, account modes, consent and
        notification preferences in an isolated test database. No live SMS or notification is sent.
        Phone numbers, exact addresses and administrator MFA secrets must never appear in public
        cards. Production retention, operator contact and rights-request procedures require approval
        before registration opens.
      </p>
    </section>
  );
}

import { Button, Field } from "../ui.jsx";

export default function EmailVerification({
  email, code, setCode, busy, error, onVerify, onResend
}) {
  return (
    <form className="space-y-4" onSubmit={onVerify}>
      <p className="text-sm">Enter the code sent to {email}.</p>
      <Field label="Verification code" value={code}
        onChange={(e) => setCode(e.target.value)}
        inputMode="numeric" autoComplete="one-time-code"
        pattern="[0-9]{6}" maxLength={6} required />
      {error && <p role="alert">{error}</p>}
      <Button type="submit" loading={busy}>Verify email</Button>
      <Button type="button" variant="soft"
        disabled={busy} onClick={onResend}>Resend code</Button>
    </form>
  );
}

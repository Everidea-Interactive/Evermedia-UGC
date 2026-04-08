const authCriticalCss = `
.auth-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: #101217;
  color: #ebedf2;
  font-family: var(--font-sans), Manrope, "Segoe UI", sans-serif;
}

.auth-shell {
  position: relative;
  width: 100%;
  max-width: 28rem;
}

.auth-card {
  width: 100%;
  border: 1px solid #313745;
  border-radius: 1rem;
  background: #181c23;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.36);
  padding: 1.5rem;
}

.auth-mode-input {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.auth-signin-only,
.auth-reset-only,
.auth-panel {
  display: none;
}

.auth-panel {
  margin-top: 1.5rem;
  flex-direction: column;
  gap: 1rem;
}

#auth-mode-signin:checked ~ .auth-card .auth-signin-only {
  display: block;
}

#auth-mode-reset:checked ~ .auth-card .auth-reset-only {
  display: block;
}

#auth-mode-signin:checked ~ .auth-card .auth-panel-signin,
#auth-mode-reset:checked ~ .auth-card .auth-panel-reset {
  display: flex;
}

.auth-eyebrow {
  margin: 0;
  color: #8f97a8;
  font-size: 0.72rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.auth-title {
  margin: 0.75rem 0 0;
  color: #f4f6f9;
  font-family: var(--font-display), "Space Grotesk", var(--font-sans), system-ui,
    sans-serif;
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1.2;
}

.auth-copy {
  margin: 0.65rem 0 0;
  color: #a1a8b8;
  font-size: 0.96rem;
  line-height: 1.6;
}

.auth-banner {
  margin-top: 1.5rem;
  border-radius: 0.9rem;
  padding: 0.95rem 1rem;
  font-size: 0.92rem;
  line-height: 1.5;
}

.auth-banner-error {
  border: 1px solid rgba(223, 91, 91, 0.4);
  background: rgba(111, 28, 28, 0.28);
  color: #ffb4b4;
}

.auth-banner-info {
  border: 1px solid #2e3442;
  background: #12161d;
  color: #c7cedc;
}

.auth-field {
  display: grid;
  gap: 0.5rem;
}

.auth-label {
  color: #eef1f5;
  font-size: 0.92rem;
  font-weight: 600;
}

.auth-input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #313745;
  border-radius: 0.75rem;
  background: #101217;
  color: #eef1f5;
  padding: 0.72rem 0.9rem;
  font: inherit;
  outline: none;
}

.auth-input::placeholder {
  color: #7d8596;
}

.auth-input:focus {
  border-color: #d8dde8;
  box-shadow: 0 0 0 2px rgba(216, 221, 232, 0.16);
}

.auth-button {
  appearance: none;
  border: 0;
  border-radius: 0.75rem;
  background: #eceef2;
  color: #101217;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 0.78rem 1rem;
}

.auth-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.auth-switch-link {
  width: fit-content;
  color: #eef1f5;
  cursor: pointer;
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: #394053;
  text-underline-offset: 4px;
}

.auth-switch-link:hover {
  color: #ffffff;
}

.auth-inline-code {
  border: 1px solid #394053;
  border-radius: 0.45rem;
  background: #101217;
  color: #f3f5f8;
  padding: 0.08rem 0.34rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.86em;
}

@media (max-width: 640px) {
  .auth-screen {
    padding: 1.25rem;
  }

  .auth-card {
    padding: 1.25rem;
  }

  .auth-title {
    font-size: 1.45rem;
  }
}
`

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: authCriticalCss }} />
      {children}
    </>
  )
}

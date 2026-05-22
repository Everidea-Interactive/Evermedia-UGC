const authCriticalCss = `
.auth-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: var(--font-sans), Manrope, "Segoe UI", sans-serif;
}

.auth-shell {
  position: relative;
  width: 100%;
  max-width: 28rem;
}

.auth-card {
  width: 100%;
  border: 1px solid hsl(var(--border));
  border-radius: 1rem;
  background: hsl(var(--card));
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
  color: hsl(var(--muted-foreground));
  font-size: 0.72rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

.auth-title {
  margin: 0.75rem 0 0;
  color: hsl(var(--foreground));
  font-family: var(--font-display), "Space Grotesk", var(--font-sans), system-ui,
    sans-serif;
  font-size: 1.6rem;
  font-weight: 600;
  line-height: 1.2;
}

.auth-copy {
  margin: 0.65rem 0 0;
  color: hsl(var(--muted-foreground));
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
  color: hsl(var(--destructive-foreground));
}

.auth-banner-info {
  border: 1px solid hsl(var(--border));
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
}

.auth-field {
  display: grid;
  gap: 0.5rem;
}

.auth-label {
  color: hsl(var(--foreground));
  font-size: 0.92rem;
  font-weight: 600;
}

.auth-input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid hsl(var(--input));
  border-radius: 0.75rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  padding: 0.72rem 0.9rem;
  font: inherit;
  outline: none;
}

.auth-input::placeholder {
  color: hsl(var(--muted-foreground));
}

.auth-input:focus {
  border-color: hsl(var(--ring));
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.16);
}

.auth-input-with-action {
  position: relative;
}

.auth-input-with-action .auth-input {
  padding-right: 3rem;
}

.auth-input-action {
  position: absolute;
  top: 50%;
  right: 0.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: hsl(var(--muted-foreground));
  cursor: pointer;
  padding: 0;
  transform: translateY(-50%);
}

.auth-input-action:hover,
.auth-input-action:focus-visible {
  color: hsl(var(--foreground));
}

.auth-input-action:focus-visible {
  outline: none;
}

.auth-button {
  appearance: none;
  border: 0;
  border-radius: 0.75rem;
  background: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
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
  color: hsl(var(--foreground));
  cursor: pointer;
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: underline;
  text-decoration-color: hsl(var(--border));
  text-underline-offset: 4px;
}

.auth-switch-link:hover {
  color: hsl(var(--foreground));
}

.auth-inline-code {
  border: 1px solid hsl(var(--border));
  border-radius: 0.45rem;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
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

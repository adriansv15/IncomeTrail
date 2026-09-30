function AuthScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      if (needsConfirmation) {
        await confirmRegistration(email, code);
        setNeedsConfirmation(false);
        setMode("login");
        setMessage("Email confirmed. You can now sign in.");
      } else if (mode === "login") {
        const result = await login(email, password);

        if (result.isSignedIn) {
          onLoggedIn();
        } else {
          setMessage(
            "Additional Cognito challenge required. Contact your administrator to complete sign-in."
          );
        }
      } else {
        const result = await register(email, password, name.trim());

        if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
          setNeedsConfirmation(true);
          setMessage("Check your email for the confirmation code.");
        } else {
          setMode("login");
          setMessage("Account created. You can now sign in.");
        }
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Authentication failed."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="trail-auth-page">
      <section className="trail-auth-card">
        <div className="trail-auth-brand">
          <span className="trail-brand-mark">
            <Activity size={19} />
          </span>

          <span>
            IncomeTrail
            <small>Making every income legible.</small>
          </span>
        </div>

        <div className="trail-auth-tabs">
          <button
            className={
              mode === "login" && !needsConfirmation ? "active" : ""
            }
            onClick={() => {
              setMode("login");
              setNeedsConfirmation(false);
              setError("");
              setMessage("");
            }}
          >
            Sign in
          </button>

          <button
            className={
              mode === "signup" && !needsConfirmation ? "active" : ""
            }
            onClick={() => {
              setMode("signup");
              setNeedsConfirmation(false);
              setError("");
              setMessage("");
            }}
          >
            Create account
          </button>
        </div>

        <form className="trail-auth-form" onSubmit={submit}>
          {!needsConfirmation && mode === "signup" && (
            <label>
              Name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
              />
            </label>
          )}

          {!needsConfirmation && (
            <>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === "login"
                      ? "current-password"
                      : "new-password"
                  }
                  minLength={8}
                  required
                />
              </label>
            </>
          )}

          {needsConfirmation && (
            <label>
              Confirmation code
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                autoComplete="one-time-code"
                required
              />
            </label>
          )}

          {message && (
            <div className="trail-auth-message" role="status">
              {message}
            </div>
          )}

          {error && (
            <div className="trail-auth-error" role="alert">
              {error}
            </div>
          )}

          {!needsConfirmation && mode === "login" && (
            <div className="demo-login-hint">
              <div className="demo-login-title">
                Hackathon demo accounts
              </div>

              <div className="demo-login-account">
                <strong>Maya Chen</strong>
                <span>mockuser1@email.com</span>
                <span>
                  Password: REPLACE_WITH_MAYA_DEMO_PASSWORD
                </span>
              </div>

              <div className="demo-login-account">
                <strong>Alex Patel</strong>
                <span>mockuser2@email.com</span>
                <span>
                  Password: REPLACE_WITH_ALEX_DEMO_PASSWORD
                </span>
              </div>
            </div>
          )}

          <button
            className="trail-primary trail-full-button"
            disabled={busy}
          >
            {busy
              ? "Working…"
              : needsConfirmation
                ? "Confirm email"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
          </button>
        </form>

        <p className="trail-auth-help">
          {isAwsAuthConfigured
            ? `Secure sign-in through Amazon Cognito · ${awsConfig.region}`
            : "Cognito is not configured. Copy .env.example to .env.local, then restart the Vite server to enable sign-in."}
        </p>
      </section>
    </main>
  );
}

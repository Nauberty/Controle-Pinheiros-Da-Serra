import { useState, type FormEvent } from 'react';
import { Crown, LogIn, Users } from 'lucide-react';
import { login } from '../data/cloud';
import { LOGIN_ACCOUNTS } from '../firebase-config';
import { Field, PasswordInput } from './ui';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Senha incorreta.',
  'auth/wrong-password': 'Senha incorreta.',
  'auth/user-not-found': 'Login não encontrado.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
};

export default function Login() {
  const [account, setAccount] = useState(0); // índice em LOGIN_ACCOUNTS
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string } | null>(null);
  const chosenEmail = LOGIN_ACCOUNTS[account].email;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await login(chosenEmail, password);
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setMsg({ text: MESSAGES[code] ?? 'Não foi possível entrar. Tente novamente.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="splash">
      <div className="login-card" style={{ marginTop: 70 }}>
        <img src="./logo.png" alt="Logo Pinheiros da Serra" />
        <h1>Pinheiros da Serra</h1>
        <p className="muted small">Área da diretoria · Pontuação, Membros e Tesouraria</p>
        <form onSubmit={submit}>
          <div className="login-options">
            {LOGIN_ACCOUNTS.map((a, i) => (
              <button
                type="button"
                key={a.email}
                className={`login-option ${account === i ? 'on' : ''}`}
                onClick={() => {
                  setAccount(i);
                  setMsg(null);
                }}
              >
                {i === 0 ? <Crown /> : <Users />}
                <span>
                  <b>{a.label}</b>
                  <small>{a.hint}</small>
                </span>
              </button>
            ))}
          </div>
          <Field label="Senha">
            <PasswordInput autoComplete="current-password" required autoFocus value={password} onChange={setPassword} />
          </Field>
          {msg && <div className="notice danger">{msg.text}</div>}
          <button className="btn btn-primary" style={{ height: 46 }} disabled={busy}>
            <LogIn /> {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

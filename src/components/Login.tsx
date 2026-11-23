import { useState, type FormEvent } from 'react';
import { Crown, LogIn, Users } from 'lucide-react';
import { login, resetPassword } from '../data/cloud';
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
  const [account, setAccount] = useState(0); // índice em LOGIN_ACCOUNTS, ou -1 = outro e-mail
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const chosenEmail = account >= 0 ? LOGIN_ACCOUNTS[account].email : email;

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

  const forgot = async () => {
    if (!email) return setMsg({ text: 'Digite seu e-mail acima para receber o link de nova senha.' });
    try {
      await resetPassword(email);
      setMsg({ text: 'Enviamos um link para redefinir sua senha. Confira seu e-mail.', ok: true });
    } catch {
      setMsg({ text: 'Não foi possível enviar o e-mail. Confira o endereço digitado.' });
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
          {account < 0 && (
            <Field label="E-mail">
              <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
          )}
          <Field label="Senha">
            <PasswordInput autoComplete="current-password" required autoFocus value={password} onChange={setPassword} />
          </Field>
          {msg && <div className={`notice ${msg.ok ? 'info' : 'danger'}`}>{msg.text}</div>}
          <button className="btn btn-primary" style={{ height: 46 }} disabled={busy}>
            <LogIn /> {busy ? 'Entrando…' : 'Entrar'}
          </button>
          {account >= 0 ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAccount(-1)}>
              Entrar com outro e-mail
            </button>
          ) : (
            <div className="row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAccount(0)}>
                Voltar
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={forgot}>
                Esqueci minha senha
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

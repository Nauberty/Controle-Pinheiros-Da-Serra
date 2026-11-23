import { useState, type FormEvent } from 'react';
import { LogIn } from 'lucide-react';
import { login, resetPassword } from '../data/cloud';
import { Field } from './ui';

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'E-mail inválido.',
  'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem conexão com a internet.',
};

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await login(email, password);
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
        <p className="muted small">Área da diretoria · Pontuação e Tesouraria</p>
        <form onSubmit={submit}>
          <Field label="E-mail">
            <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Senha">
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {msg && <div className={`notice ${msg.ok ? 'info' : 'danger'}`}>{msg.text}</div>}
          <button className="btn btn-primary" style={{ height: 46 }} disabled={busy}>
            <LogIn /> {busy ? 'Entrando…' : 'Entrar'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={forgot}>
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  );
}

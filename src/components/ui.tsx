import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, X, type LucideIcon } from 'lucide-react';
import type { Member, Unit } from '../types';
import type { Status } from '../lib/finance';

// ---------- Modal ----------
const modalStack: symbol[] = [];

export function Modal(props: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const onClose = useRef(props.onClose);
  onClose.current = props.onClose;
  useEffect(() => {
    const me = Symbol();
    modalStack.push(me);
    // ESC fecha somente a janela que está por cima
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && modalStack[modalStack.length - 1] === me && onClose.current();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      modalStack.splice(modalStack.indexOf(me), 1);
      if (!modalStack.length) document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && props.onClose()}>
      <div className={`modal ${props.wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={props.title}>
        <div className="modal-head">
          <h3>{props.title}</h3>
          <button className="icon-btn" onClick={props.onClose} aria-label="Fechar">
            <X />
          </button>
        </div>
        <div className="modal-body">{props.children}</div>
        {props.footer && <div className="modal-foot">{props.footer}</div>}
      </div>
    </div>
  );
}

// ---------- Campos ----------
export function Field(props: { label: string; children: ReactNode; full?: boolean; hint?: string }) {
  return (
    <label className={`field ${props.full ? 'full' : ''}`}>
      <span>{props.label}</span>
      {props.children}
      {props.hint && <small className="tiny">{props.hint}</small>}
    </label>
  );
}

/** Campo de senha com o "olho" para mostrar/ocultar o que está sendo digitado. */
export function PasswordInput(props: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  autoComplete?: string;
  required?: boolean;
  onEnter?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-input">
      <input
        className="input"
        type={show ? 'text' : 'password'}
        value={props.value}
        autoFocus={props.autoFocus}
        autoComplete={props.autoComplete}
        required={props.required}
        onChange={(e) => props.onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && props.onEnter?.()}
      />
      <button
        type="button"
        className="icon-btn"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        title={show ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {show ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}

export function MoneyInput(props: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="input-money">
      <input
        className="input"
        inputMode="decimal"
        placeholder="0,00"
        value={props.value}
        autoFocus={props.autoFocus}
        onChange={(e) => props.onChange(e.target.value.replace(/[^\d.,]/g, ''))}
      />
    </div>
  );
}

// ---------- Indicadores ----------
export function Stat(props: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'green' | 'red' | 'amber' | 'blue' | 'sand';
}) {
  const Icon = props.icon;
  return (
    <div className="card stat">
      <div className={`stat-icon tone-${props.tone ?? 'green'}`}>
        <Icon />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="stat-label">{props.label}</div>
        <div className="stat-value">{props.value}</div>
        {props.hint && <div className="stat-hint">{props.hint}</div>}
      </div>
    </div>
  );
}

export function Bar(props: { pct: number; color?: string; lg?: boolean }) {
  return (
    <div className={`bar ${props.lg ? 'lg' : ''}`}>
      <span style={{ width: `${Math.max(0, Math.min(100, props.pct))}%`, ['--fill' as string]: props.color }} />
    </div>
  );
}

export function Empty(props: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  const Icon = props.icon;
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon />
      </div>
      <h4>{props.title}</h4>
      {props.text && <p className="small">{props.text}</p>}
      {props.action}
    </div>
  );
}

export function UnitLogo({ unit, size = 28 }: { unit: Unit; size?: number }) {
  if (!unit.logo) return <span className="dot" style={{ ['--unit' as string]: unit.color, width: size * 0.4, height: size * 0.4 }} />;
  return <img className="unit-logo" src={'./' + unit.logo} alt="" width={size} height={size} />;
}

export function UnitChip({ unit }: { unit?: Unit }) {
  if (!unit) return <span className="muted">Sem unidade</span>;
  return (
    <span className="unit-chip">
      <UnitLogo unit={unit} size={22} />
      {unit.name}
    </span>
  );
}

const STATUS_LABEL: Record<Status, string> = { pago: 'Pago', parcial: 'Parcial', pendente: 'Pendente' };
export const StatusBadge = ({ status }: { status: Status }) => (
  <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>
);

/** Foto do membro (ou iniciais na cor da unidade). */
export function MemberAvatar({ member, unit, size = 36 }: { member: Pick<Member, 'name' | 'photo'>; unit?: Unit; size?: number }) {
  const style = { width: size, height: size, borderRadius: Math.round(size * 0.28), fontSize: Math.round(size * 0.36) };
  if (member.photo) return <img className="avatar avatar-photo" src={member.photo} alt="" style={style} />;
  return (
    <div className="avatar" style={{ ...style, background: (unit?.color ?? '#8a918c') + '22', color: unit?.color ?? 'var(--text-2)' }}>
      {initials(member.name || '?')}
    </div>
  );
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// ---------- Toasts (avisos rápidos) ----------
type Toast = { id: number; text: string; error?: boolean };
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();
const emitToasts = () => toastListeners.forEach((l) => l());

export function toast(text: string, error = false) {
  const id = Date.now() + Math.random();
  toasts = [...toasts, { id, text, error }];
  emitToasts();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emitToasts();
  }, error ? 6000 : 3200);
}

/** Executa uma ação mostrando aviso de sucesso ou erro. */
export async function run(action: () => Promise<unknown>, success?: string) {
  try {
    await action();
    if (success) toast(success);
    return true;
  } catch (e) {
    toast('Não foi possível salvar: ' + (e as Error).message, true);
    return false;
  }
}

export function Toasts() {
  const list = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
  );
  return (
    <div className="toasts" aria-live="polite">
      {list.map((t) => (
        <div key={t.id} className={`toast ${t.error ? 'error' : ''}`}>
          {t.error ? <AlertTriangle /> : <CheckCircle2 />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

// ---------- Confirmação ----------
type ConfirmReq = { title: string; text: string; danger?: boolean; ok: string; resolve: (v: boolean) => void };
let confirmReq: ConfirmReq | null = null;
const confirmListeners = new Set<() => void>();

export function confirmDialog(title: string, text: string, opts: { ok?: string; danger?: boolean } = {}) {
  return new Promise<boolean>((resolve) => {
    confirmReq = { title, text, ok: opts.ok ?? 'Confirmar', danger: opts.danger ?? true, resolve };
    confirmListeners.forEach((l) => l());
  });
}

export function ConfirmHost() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((n) => n + 1);
    confirmListeners.add(l);
    return () => void confirmListeners.delete(l);
  }, []);
  if (!confirmReq) return null;
  const req = confirmReq;
  const close = (v: boolean) => {
    confirmReq = null;
    req.resolve(v);
    force((n) => n + 1);
  };
  return (
    <Modal
      title={req.title}
      onClose={() => close(false)}
      footer={
        <>
          <button className="btn" onClick={() => close(false)}>
            Cancelar
          </button>
          <button className={`btn ${req.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
            {req.ok}
          </button>
        </>
      }
    >
      <p className="muted">{req.text}</p>
    </Modal>
  );
}

import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCopy, History, RefreshCw } from 'lucide-react';
import type { Member, SgcChange } from '../types';
import type { Data } from '../data/store';
import { save } from '../data/store';
import { FIELDS, ROLES, SECTIONS, age, completeness, fieldLabel, roleLabel, type ProfileKey, type Section } from '../lib/memberFields';
import { chargeBalances } from '../lib/finance';
import { dateBR, money, uid } from '../lib/format';
import { Bar, Field, Modal, UnitLogo, initials, run, toast } from './ui';

type Tab = Section | 'sgc';
type Draft = Partial<Record<ProfileKey | 'name' | 'unitId' | 'role', string>> & { active: boolean };

const TRACKED = ['name', 'unitId', 'role', 'active', ...FIELDS.map((f) => f.key)] as const;

function toDraft(m?: Member): Draft {
  const d: Draft = { active: m?.active ?? true, name: m?.name ?? '', unitId: m?.unitId ?? '', role: roleLabel(m?.role ?? 'Desbravador') };
  for (const f of FIELDS) d[f.key] = (m?.[f.key] as string | undefined) ?? '';
  return d;
}

/** Valor legível para o registro de alterações. */
function display(key: string, value: unknown, data: Data): string {
  if (key === 'active') return value ? 'Ativo' : 'Inativo';
  if (key === 'unitId') return data.units.find((u) => u.id === value)?.name ?? '—';
  const f = FIELDS.find((x) => x.key === key);
  if (f?.type === 'date' && value) return dateBR(String(value));
  return String(value ?? '').trim() || '—';
}

export function changesText(m: Member) {
  return (m.sgcChanges ?? []).map((c) => `• ${fieldLabel(c.field)}: ${c.from} → ${c.to}`).join('\n');
}

export async function markSynced(m: Member) {
  return run(
    () => save('members', { ...m, sgcPending: false, sgcChanges: [], sgcSyncedAt: Date.now() }),
    `${m.name}: marcado como atualizado no SGC`,
  );
}

export default function MemberProfile(props: { data: Data; member?: Member; onClose: () => void }) {
  const { data } = props;
  // usa sempre a versão mais recente do membro (atualiza em tempo real)
  const member = props.member ? data.members.find((m) => m.id === props.member!.id) ?? props.member : undefined;
  const [tab, setTab] = useState<Tab>('pessoal');
  const [draft, setDraft] = useState<Draft>(() => toDraft(member));
  const [busy, setBusy] = useState(false);
  const original = useMemo(() => toDraft(member), [member?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof Draft, v: string | boolean) => setDraft((d) => ({ ...d, [k]: v }));
  const changedKeys = TRACKED.filter((k) => (draft[k] ?? '') !== (original[k] ?? ''));
  const unit = data.units.find((u) => u.id === draft.unitId);
  const years = age(draft.birthDate);
  const pct = completeness(draft);

  const debt = useMemo(() => {
    if (!member || !data.isExecutive) return null;
    let owed = 0;
    for (const c of data.charges.filter((c) => !c.archived && c.memberIds.includes(member.id)))
      owed += chargeBalances(c, data.members, data.payments).find((b) => b.member.id === member.id)?.remaining ?? 0;
    return owed;
  }, [member, data]);

  const submit = async () => {
    if (!draft.name?.trim()) return toast('Informe o nome', true);
    setBusy(true);
    const now = Date.now();
    const newChanges: SgcChange[] = member
      ? changedKeys.map((k) => ({
          field: k,
          from: display(k, original[k], data),
          to: display(k, draft[k], data),
          at: now,
          ...(data.userEmail ? { by: data.userEmail } : {}),
        }))
      : [{ field: 'name', from: '—', to: 'Cadastro novo — incluir no SGC', at: now, ...(data.userEmail ? { by: data.userEmail } : {}) }];

    // junta com alterações ainda não lançadas, mantendo só a última de cada campo
    const merged = [...(member?.sgcChanges ?? [])];
    for (const c of newChanges) {
      const i = merged.findIndex((x) => x.field === c.field);
      if (i >= 0) merged[i] = { ...c, from: merged[i].from };
      else merged.push(c);
    }

    const item: Member = {
      ...(member ?? {}),
      id: member?.id ?? uid(),
      name: draft.name.trim(),
      unitId: draft.unitId || null,
      role: draft.role || 'Desbravador',
      active: draft.active,
      createdAt: member?.createdAt ?? now,
      updatedAt: now,
      sgcPending: newChanges.length > 0 || !!member?.sgcPending,
      sgcChanges: merged.filter((c) => c.from !== c.to),
    };
    for (const f of FIELDS) item[f.key] = (draft[f.key] ?? '').trim();

    const ok = await run(() => save('members', item), member ? 'Ficha atualizada' : 'Membro cadastrado');
    setBusy(false);
    if (ok) props.onClose();
  };

  const copy = async () => {
    if (!member) return;
    const text = `${member.name}${member.sgcId ? ` (SGC ${member.sgcId})` : ''}\n${changesText(member)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast('Alterações copiadas');
    } catch {
      toast('Não foi possível copiar', true);
    }
  };

  const fields = FIELDS.filter((f) => f.section === tab);
  const pending = member?.sgcChanges ?? [];

  return (
    <Modal
      wide
      title={member ? 'Ficha do membro' : 'Novo membro'}
      onClose={props.onClose}
      footer={
        <>
          <span className="small muted grow">
            {member && changedKeys.length > 0 && `${changedKeys.length} campo(s) alterado(s) — ficará pendente para lançar no SGC`}
          </span>
          <button className="btn" onClick={props.onClose}>
            {changedKeys.length || !member ? 'Cancelar' : 'Fechar'}
          </button>
          <button className="btn btn-primary" disabled={busy || (!!member && !changedKeys.length)} onClick={submit}>
            Salvar
          </button>
        </>
      }
    >
      <div className="profile-head">
        <div className="avatar lg" style={{ background: (unit?.color ?? '#8a918c') + '22', color: unit?.color ?? 'var(--text-2)' }}>
          {initials(draft.name || '?')}
        </div>
        <div className="grow">
          <div className="profile-name">{draft.name || 'Novo membro'}</div>
          <div className="row wrap small muted" style={{ gap: 8, marginTop: 4 }}>
            {unit && (
              <span className="unit-chip">
                <UnitLogo unit={unit} size={20} /> {unit.name}
              </span>
            )}
            <span>· {roleLabel(draft.role)}</span>
            {years !== null && <span>· {years} anos</span>}
            {draft.currentClass && <span>· Classe {draft.currentClass}</span>}
          </div>
          <div className="row" style={{ marginTop: 8, maxWidth: 320 }}>
            <span className="tiny" style={{ whiteSpace: 'nowrap' }}>
              Ficha {pct}% completa
            </span>
            <div className="grow">
              <Bar pct={pct} color={pct === 100 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'} />
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {member?.sgcPending ? (
            <span className="badge parcial">
              <RefreshCw size={12} /> Pendente no SGC
            </span>
          ) : member ? (
            <span className="badge pago">
              <CheckCircle2 size={12} /> SGC em dia
            </span>
          ) : null}
          {debt !== null && (
            <div className="small" style={{ marginTop: 6 }}>
              {debt ? (
                <>
                  Em aberto: <b className="down">{money(debt)}</b>
                </>
              ) : (
                <span className="up">Tesouraria em dia</span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 16 }}>
        {SECTIONS.map((s) => (
          <button key={s.id} className={`tab ${tab === s.id ? 'on' : ''}`} onClick={() => setTab(s.id)}>
            {s.label}
          </button>
        ))}
        {member && (
          <button className={`tab ${tab === 'sgc' ? 'on' : ''}`} onClick={() => setTab('sgc')}>
            <History /> SGC {pending.length > 0 && <span className="count">{pending.length}</span>}
          </button>
        )}
      </div>

      {tab === 'sgc' && member ? (
        <div className="stack" style={{ gap: 14 }}>
          <div className="notice info">
            <RefreshCw />
            <div>
              Abaixo estão as alterações feitas aqui que ainda precisam ser lançadas no SGC. Depois de atualizar lá, clique em{' '}
              <b>Marcar como atualizado no SGC</b>.
              {member.sgcSyncedAt && (
                <div className="tiny" style={{ marginTop: 4 }}>
                  Última atualização no SGC: {new Date(member.sgcSyncedAt).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          </div>
          {pending.length === 0 ? (
            <p className="muted small">Nenhuma alteração pendente. A ficha está igual à do SGC.</p>
          ) : (
            <>
              <div className="card table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Campo</th>
                      <th>Antes</th>
                      <th>Agora</th>
                      <th className="hide-sm">Quando / quem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((c) => (
                      <tr key={c.field}>
                        <td>
                          <b style={{ fontWeight: 600 }}>{fieldLabel(c.field)}</b>
                        </td>
                        <td className="muted small" style={{ whiteSpace: 'pre-wrap' }}>
                          {c.from}
                        </td>
                        <td className="small" style={{ whiteSpace: 'pre-wrap' }}>
                          {c.to}
                        </td>
                        <td className="hide-sm tiny">
                          {new Date(c.at).toLocaleDateString('pt-BR')}
                          {c.by && <div>{c.by}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="row wrap">
                <button className="btn btn-sm" onClick={copy}>
                  <ClipboardCopy /> Copiar alterações
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => markSynced(member)}>
                  <CheckCircle2 /> Marcar como atualizado no SGC
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="form-grid">
          {tab === 'pessoal' && (
            <>
              <Field label="Nome completo" full>
                <input className="input" autoFocus={!member} value={draft.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Unidade">
                <select className="select" value={draft.unitId} onChange={(e) => set('unitId', e.target.value)}>
                  <option value="">Sem unidade</option>
                  {data.units.filter((u) => u.active || u.id === draft.unitId).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Função no clube">
                <select className="select" value={draft.role} onChange={(e) => set('role', e.target.value)}>
                  {[...new Set([...ROLES, draft.role ?? ''])].filter(Boolean).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          {fields.map((f) => (
            <Field key={f.key} label={f.label} full={f.full}>
              {f.type === 'select' ? (
                <select className="select" value={draft[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">—</option>
                  {[...new Set([...(f.options ?? []), draft[f.key] ?? ''])].filter(Boolean).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  className="textarea"
                  placeholder={f.placeholder}
                  value={draft[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : (
                <input
                  className="input"
                  type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
                  inputMode={f.type === 'tel' ? 'tel' : undefined}
                  placeholder={f.placeholder}
                  value={draft[f.key] ?? ''}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </Field>
          ))}
          {tab === 'pessoal' && member && (
            <label className="check-row full" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
              <input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} />
              Membro ativo no clube
            </label>
          )}
        </div>
      )}
    </Modal>
  );
}

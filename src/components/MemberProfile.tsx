import { useMemo, useRef, useState } from 'react';
import { Camera, CheckCircle2, ClipboardCopy, History, Plus, RefreshCw, Trash2, Wallet } from 'lucide-react';
import type { Member, SgcChange } from '../types';
import type { Data } from '../data/store';
import { save } from '../data/store';
import {
  FIELDS,
  ROLES,
  SECTIONS,
  VACCINES,
  age,
  completeness,
  fieldLabel,
  roleLabel,
  vaccineList,
  type ProfileKey,
  type Section,
} from '../lib/memberFields';
import { chargeBalances, methodLabel } from '../lib/finance';
import { dateBR, money, uid } from '../lib/format';
import { resizePhoto } from '../lib/photo';
import { Bar, Field, Modal, StatusBadge, UnitLogo, run, toast } from './ui';
import { PaymentForm } from './FinanceForms';

export type ProfileTab = Section | 'financeiro' | 'sgc';
type Draft = Partial<Record<ProfileKey | 'name' | 'unitId' | 'role', string>> & { active: boolean };

const TRACKED = ['name', 'unitId', 'role', 'active', 'photo', 'vaccines', ...FIELDS.map((f) => f.key)] as const;

function toDraft(m?: Member, presetUnit?: string): Draft {
  const d: Draft = {
    active: m?.active ?? true,
    name: m?.name ?? '',
    unitId: m?.unitId ?? presetUnit ?? '',
    role: roleLabel(m?.role ?? 'Desbravador'),
    photo: m?.photo ?? '',
    vaccines: m?.vaccines ?? '',
  };
  for (const f of FIELDS) d[f.key] = (m?.[f.key] as string | undefined) ?? '';
  return d;
}

/** Valor legível para o registro de alterações. */
function display(key: string, value: unknown, data: Data): string {
  if (key === 'active') return value ? 'Ativo' : 'Inativo';
  if (key === 'unitId') return data.units.find((u) => u.id === value)?.name ?? '—';
  if (key === 'photo') return value ? 'Com foto' : 'Sem foto';
  if (key === 'vaccines') return vaccineList(String(value ?? '')).join(', ') || '—';
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

export default function MemberProfile(props: {
  data: Data;
  member?: Member;
  presetUnit?: string;
  initialTab?: ProfileTab;
  onClose: () => void;
}) {
  const { data } = props;
  // usa sempre a versão mais recente do membro (atualiza em tempo real)
  const member = props.member ? data.members.find((m) => m.id === props.member!.id) ?? props.member : undefined;
  const [tab, setTab] = useState<ProfileTab>(props.initialTab ?? 'cadastro');
  const [draft, setDraft] = useState<Draft>(() => toDraft(member, props.presetUnit));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [payFor, setPayFor] = useState<{ chargeId?: string } | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const original = useMemo(() => toDraft(member), [member?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof Draft, v: string | boolean) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k as string]) setErrors((e) => ({ ...e, [k as string]: '' }));
  };
  const changedKeys = TRACKED.filter((k) => (draft[k] ?? '') !== (original[k] ?? ''));
  const unit = data.units.find((u) => u.id === draft.unitId);
  const years = age(draft);
  const pct = completeness(draft);
  const vaccines = vaccineList(draft.vaccines);

  const finance = useMemo(() => {
    if (!member || !data.isExecutive) return null;
    const rows = data.charges
      .filter((c) => c.memberIds.includes(member.id))
      .map((c) => ({ charge: c, b: chargeBalances(c, data.members, data.payments).find((x) => x.member.id === member.id)! }))
      .filter((r) => r.b);
    const payments = data.payments.filter((p) => p.memberId === member.id).sort((a, b) => b.date.localeCompare(a.date));
    const open = rows.filter((r) => !r.charge.archived);
    return {
      rows,
      payments,
      due: open.reduce((s, r) => s + r.b.due, 0),
      paid: payments.reduce((s, p) => s + p.amount, 0),
      remaining: open.reduce((s, r) => s + r.b.remaining, 0),
    };
  }, [member, data]);

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      set('photo', await resizePhoto(file));
    } catch (e) {
      toast('Foto: ' + (e as Error).message, true);
    }
  };

  const toggleVaccine = (v: string) =>
    set('vaccines', (vaccines.includes(v) ? vaccines.filter((x) => x !== v) : [...vaccines, v]).join('\n'));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!draft.name?.trim() || draft.name.trim().split(/\s+/).length < 2) e.name = 'Informe o nome completo (nome e sobrenome).';
    const a = age(draft);
    if (a === null) e.age = 'Informe a idade ou a data de nascimento.';
    else if (a < 4 || a > 99) e.age = 'Idade inválida.';
    setErrors(e);
    if (Object.keys(e).length) {
      setTab('cadastro');
      toast('Preencha os campos obrigatórios: nome completo e idade.', true);
      return false;
    }
    return true;
  };

  const submit = async () => {
    if (!validate()) return;
    setBusy(true);
    const now = Date.now();
    const by = data.userEmail ? { by: data.userEmail } : {};
    const newChanges: SgcChange[] = member
      ? changedKeys.map((k) => ({ field: k, from: display(k, original[k], data), to: display(k, draft[k], data), at: now, ...by }))
      : [{ field: 'name', from: '—', to: 'Cadastro novo — incluir no SGC', at: now, ...by }];

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
      name: draft.name!.trim(),
      unitId: draft.unitId || null,
      role: draft.role || 'Desbravador',
      active: draft.active,
      createdAt: member?.createdAt ?? now,
      updatedAt: now,
      photo: draft.photo || '',
      vaccines: draft.vaccines || '',
      sgcPending: newChanges.length > 0 || !!member?.sgcPending,
      sgcChanges: merged.filter((c) => c.from !== c.to),
    };
    for (const f of FIELDS) item[f.key] = (draft[f.key] ?? '').trim();
    if (draft.birthDate && age(draft) !== null) item.age = String(age(draft)); // idade sempre coerente com o nascimento

    const ok = await run(() => save('members', item), member ? 'Cadastro atualizado' : `${item.name} cadastrado(a) com sucesso`);
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

  const renderField = (key: ProfileKey) => {
    const f = FIELDS.find((x) => x.key === key)!;
    const value = draft[f.key] ?? '';
    const ageFromBirth = f.key === 'age' && !!draft.birthDate && years !== null;
    return (
      <Field key={f.key} label={f.label + (f.required ? ' *' : '')} full={f.full} hint={ageFromBirth ? 'Calculada pela data de nascimento' : undefined}>
        {f.type === 'select' ? (
          <select className="select" value={value} onChange={(e) => set(f.key, e.target.value)}>
            <option value="">Selecione…</option>
            {[...new Set([...(f.options ?? []), value])].filter(Boolean).map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ) : f.type === 'textarea' ? (
          <textarea className="textarea" placeholder={f.placeholder} value={value} onChange={(e) => set(f.key, e.target.value)} />
        ) : (
          <input
            className={`input ${errors[f.key] ? 'invalid' : ''}`}
            type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'}
            inputMode={f.type === 'tel' ? 'tel' : f.type === 'number' ? 'numeric' : undefined}
            placeholder={f.placeholder}
            value={ageFromBirth ? String(years) : value}
            readOnly={ageFromBirth}
            onChange={(e) => set(f.key, f.type === 'number' ? e.target.value.replace(/\D/g, '').slice(0, 2) : e.target.value)}
          />
        )}
        {errors[f.key] && <small className="field-error">{errors[f.key]}</small>}
      </Field>
    );
  };

  const sectionFields = (s: Section) => FIELDS.filter((f) => f.section === s).map((f) => renderField(f.key));
  const pending = member?.sgcChanges ?? [];

  return (
    <Modal
      wide
      title={member ? 'Ficha cadastral do membro' : 'Cadastro de novo membro'}
      onClose={props.onClose}
      footer={
        <>
          <span className="small muted grow">
            {member
              ? changedKeys.length > 0 && `${changedKeys.length} alteração(ões) não salva(s)`
              : 'Campos com * são obrigatórios.'}
          </span>
          <button className="btn" onClick={props.onClose}>
            {changedKeys.length || !member ? 'Cancelar' : 'Fechar'}
          </button>
          <button className="btn btn-primary" disabled={busy || (!!member && !changedKeys.length)} onClick={submit}>
            {member ? 'Salvar alterações' : 'Cadastrar membro'}
          </button>
        </>
      }
    >
      <div className="profile-head">
        <button type="button" className="photo-picker" onClick={() => photoRef.current?.click()} title="Adicionar ou trocar foto">
          {draft.photo ? (
            <img src={draft.photo} alt="Foto do membro" />
          ) : (
            <span>
              <Camera />
              Foto
            </span>
          )}
          <i>
            <Camera size={14} />
          </i>
        </button>
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            onPhoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="profile-name">{draft.name || 'Novo membro'}</div>
          <div className="row wrap small muted" style={{ gap: 8, marginTop: 4 }}>
            {unit && (
              <span className="unit-chip">
                <UnitLogo unit={unit} size={20} /> {unit.name}
              </span>
            )}
            <span>· {roleLabel(draft.role)}</span>
            {years !== null && <span>· {years} anos</span>}
            {draft.bloodType && <span>· Tipo sanguíneo {draft.bloodType}</span>}
          </div>
          <div className="row" style={{ marginTop: 8, maxWidth: 320 }}>
            <span className="tiny" style={{ whiteSpace: 'nowrap' }}>
              Cadastro {pct}% completo
            </span>
            <div className="grow">
              <Bar pct={pct} color={pct === 100 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'} />
            </div>
          </div>
          {draft.photo && (
            <button type="button" className="link-btn danger-link" onClick={() => set('photo', '')}>
              <Trash2 size={13} /> Remover foto
            </button>
          )}
        </div>
        <div className="profile-side">
          {member?.sgcPending ? (
            <span className="badge parcial">
              <RefreshCw size={12} /> Pendente no SGC
            </span>
          ) : member ? (
            <span className="badge pago">
              <CheckCircle2 size={12} /> SGC em dia
            </span>
          ) : null}
          {finance && (
            <button type="button" className="link-btn" style={{ marginTop: 6 }} onClick={() => setTab('financeiro')}>
              {finance.remaining ? (
                <>
                  Em aberto: <b className="down">{money(finance.remaining)}</b>
                </>
              ) : (
                <span className="up">Financeiro em dia</span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 16 }}>
        {SECTIONS.map((s) => (
          <button key={s.id} className={`tab ${tab === s.id ? 'on' : ''}`} onClick={() => setTab(s.id)}>
            {s.label}
          </button>
        ))}
        {member && data.isExecutive && (
          <button className={`tab ${tab === 'financeiro' ? 'on' : ''}`} onClick={() => setTab('financeiro')}>
            <Wallet /> Financeiro {finance && finance.remaining > 0 && <span className="count down">!</span>}
          </button>
        )}
        {member && (
          <button className={`tab ${tab === 'sgc' ? 'on' : ''}`} onClick={() => setTab('sgc')}>
            <History /> SGC {pending.length > 0 && <span className="count">{pending.length}</span>}
          </button>
        )}
      </div>

      {tab === 'cadastro' && (
        <div className="form-grid">
          <Field label="Nome completo *" full>
            <input
              className={`input ${errors.name ? 'invalid' : ''}`}
              autoFocus={!member}
              placeholder="Nome e sobrenome"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
            />
            {errors.name && <small className="field-error">{errors.name}</small>}
          </Field>
          <Field label="Unidade">
            <select className="select" value={draft.unitId} onChange={(e) => set('unitId', e.target.value)}>
              <option value="">Sem unidade</option>
              {data.units
                .filter((u) => u.active || u.id === draft.unitId)
                .map((u) => (
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
          <div className="form-section full">Identificação e documentos</div>
          {renderField('age')}
          {renderField('birthDate')}
          {renderField('gender')}
          {renderField('shirtSize')}
          {renderField('cpf')}
          {renderField('rg')}
          <div className="form-section full">Contato</div>
          {renderField('phone')}
          {renderField('guardian')}
          {renderField('guardianPhone')}
          {renderField('guardianRelation')}
          {member && (
            <label className="check-row full" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
              <input type="checkbox" checked={draft.active} onChange={(e) => set('active', e.target.checked)} />
              Membro ativo no clube
            </label>
          )}
        </div>
      )}

      {tab === 'saude' && (
        <div className="form-grid">
          {renderField('bloodType')}
          {renderField('emergencyContact')}
          {renderField('healthPlan')}
          {renderField('susCard')}
          {renderField('healthConditions')}
          {renderField('allergies')}
          {renderField('medications')}
          <div className="form-section full">Vacinação</div>
          {renderField('vaccineCardUpToDate')}
          <div className="full">
            <div className="small muted" style={{ marginBottom: 8 }}>
              Marque as vacinas já tomadas ({vaccines.length} de {VACCINES.length}):
            </div>
            <div className="vaccine-grid">
              {[...new Set([...VACCINES, ...vaccines])].map((v) => (
                <label key={v} className={`vaccine ${vaccines.includes(v) ? 'on' : ''}`}>
                  <input type="checkbox" checked={vaccines.includes(v)} onChange={() => toggleVaccine(v)} />
                  {v}
                </label>
              ))}
            </div>
          </div>
          {renderField('vaccinesOther')}
        </div>
      )}

      {tab === 'endereco' && <div className="form-grid">{sectionFields('endereco')}</div>}
      {tab === 'clube' && <div className="form-grid">{sectionFields('clube')}</div>}

      {tab === 'financeiro' && finance && member && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="grid grid-3" style={{ gap: 10 }}>
            <div className="card" style={{ padding: 14 }}>
              <div className="stat-label">Total devido</div>
              <div className="stat-value" style={{ fontSize: 20 }}>
                {money(finance.due)}
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="stat-label">Total pago</div>
              <div className="stat-value up" style={{ fontSize: 20 }}>
                {money(finance.paid)}
              </div>
            </div>
            <div className="card" style={{ padding: 14 }}>
              <div className="stat-label">Em aberto</div>
              <div className={`stat-value ${finance.remaining ? 'down' : 'up'}`} style={{ fontSize: 20 }}>
                {money(finance.remaining)}
              </div>
            </div>
          </div>

          <div className="row-between wrap">
            <b>Cobranças</b>
            <button className="btn btn-sm btn-primary" onClick={() => setPayFor({})}>
              <Plus /> Registrar pagamento
            </button>
          </div>
          {finance.rows.length === 0 ? (
            <p className="small muted">Este membro não está incluído em nenhuma cobrança.</p>
          ) : (
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cobrança</th>
                    <th className="num">Devido</th>
                    <th className="num">Pago</th>
                    <th className="num">Falta</th>
                    <th>Situação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {finance.rows.map(({ charge, b }) => (
                    <tr key={charge.id} style={{ opacity: charge.archived ? 0.6 : 1 }}>
                      <td>
                        <b style={{ fontWeight: 600 }}>{charge.title}</b>
                        {charge.dueDate && <div className="tiny">Vencimento {dateBR(charge.dueDate)}</div>}
                      </td>
                      <td className="num">{money(b.due)}</td>
                      <td className="num">{money(b.paid)}</td>
                      <td className="num">{b.remaining ? money(b.remaining) : '—'}</td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="actions">
                        {b.remaining > 0 && (
                          <button className="btn btn-sm" onClick={() => setPayFor({ chargeId: charge.id })}>
                            Quitar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <b>Histórico de pagamentos</b>
          {finance.payments.length === 0 ? (
            <p className="small muted">Nenhum pagamento registrado.</p>
          ) : (
            <div className="card table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Referente a</th>
                    <th>Forma</th>
                    <th className="num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {finance.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{dateBR(p.date)}</td>
                      <td>
                        {(p.chargeId && data.charges.find((c) => c.id === p.chargeId)?.title) || 'Avulso'}
                        {p.note && <div className="tiny">{p.note}</div>}
                      </td>
                      <td>
                        <span className={`badge method-${p.method}`}>{methodLabel(p.method)}</span>
                      </td>
                      <td className="num">
                        <b>{money(p.amount)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'sgc' && member && (
        <div className="stack" style={{ gap: 14 }}>
          <div className="notice info">
            <RefreshCw />
            <div>
              Alterações feitas aqui que ainda precisam ser lançadas no SGC. Depois de atualizar lá, clique em{' '}
              <b>Marcar como atualizado no SGC</b>.
              {member.sgcSyncedAt && (
                <div className="tiny" style={{ marginTop: 4 }}>
                  Última atualização no SGC: {new Date(member.sgcSyncedAt).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
          </div>
          {pending.length === 0 ? (
            <p className="muted small">Nenhuma alteração pendente. O cadastro está igual ao do SGC.</p>
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
      )}

      {payFor && member && (
        <PaymentForm data={data} preset={{ memberId: member.id, chargeId: payFor.chargeId }} onClose={() => setPayFor(null)} />
      )}
    </Modal>
  );
}


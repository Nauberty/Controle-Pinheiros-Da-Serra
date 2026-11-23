import { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FileUp, ListPlus, Plus, RefreshCw, Search, Trash2, UserPlus, Users } from 'lucide-react';
import type { Member } from '../types';
import { removeItem, save } from '../data/store';
import { chargeBalances } from '../lib/finance';
import { money, normalize, uid } from '../lib/format';
import { downloadCSV } from '../lib/download';
import { parseCSV, toIsoDate } from '../lib/csv';
import { FIELDS, ROLES, age, completeness, roleLabel, type ProfileKey } from '../lib/memberFields';
import { Bar, Empty, Field, MemberAvatar, Modal, UnitChip, UnitLogo, confirmDialog, run, toast } from '../components/ui';
import MemberProfile, { markSynced } from '../components/MemberProfile';
import type { PageProps } from './types';

type View = 'ativos' | 'pendentes' | 'inativos';

export default function Membros({ data }: PageProps) {
  const [profile, setProfile] = useState<{ member?: Member; unit?: string } | null>(null);
  const [bulk, setBulk] = useState(false);
  const [importRows, setImportRows] = useState<string[][] | null>(null);
  const [q, setQ] = useState('');
  const [unit, setUnit] = useState('');
  const [role, setRole] = useState('');
  const [view, setView] = useState<View>('ativos');
  const fileRef = useRef<HTMLInputElement>(null);
  const unitById = new Map(data.units.map((u) => [u.id, u]));

  // quanto cada pessoa ainda deve (somente diretoria executiva enxerga)
  const debt = useMemo(() => {
    const map = new Map<string, number>();
    if (!data.isExecutive) return map;
    for (const c of data.charges.filter((c) => !c.archived))
      for (const b of chargeBalances(c, data.members, data.payments)) map.set(b.member.id, (map.get(b.member.id) ?? 0) + b.remaining);
    return map;
  }, [data.charges, data.members, data.payments, data.isExecutive]);

  const pendingCount = data.members.filter((m) => m.sgcPending).length;
  const list = data.members
    .filter(
      (m) =>
        (view === 'ativos' ? m.active : view === 'inativos' ? !m.active : m.sgcPending) &&
        (!unit || (unit === '_none' ? !m.unitId : m.unitId === unit)) &&
        (!role || roleLabel(m.role) === role) &&
        (!q || normalize(`${m.name} ${m.guardian ?? ''} ${m.sgcId ?? ''} ${m.cpf ?? ''}`).includes(normalize(q))),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const counts = data.activeUnits.map((u) => ({ unit: u, n: data.members.filter((m) => m.active && m.unitId === u.id).length }));

  const del = async (m: Member) => {
    const pays = data.payments.filter((p) => p.memberId === m.id).length;
    if (pays || !data.isExecutive) {
      const ok = await confirmDialog(
        'Desativar membro?',
        `${m.name} será marcado como inativo e o histórico será mantido.${pays ? ` (Possui ${pays} pagamento(s) registrado(s).)` : ''}`,
        { ok: 'Desativar', danger: false },
      );
      if (ok) run(() => save('members', { ...m, active: false }), 'Membro desativado');
      return;
    }
    const ok = await confirmDialog('Excluir membro?', `${m.name} será removido de todas as cobranças.`, { ok: 'Excluir' });
    if (!ok) return;
    run(async () => {
      await Promise.all(
        data.charges
          .filter((c) => c.memberIds.includes(m.id))
          .map((c) => save('charges', { ...c, memberIds: c.memberIds.filter((id) => id !== m.id) })),
      );
      await removeItem('members', m.id);
    }, 'Membro excluído');
  };

  const exportCSV = () =>
    downloadCSV('membros-pinheiros-da-serra.csv', [
      ['Nome completo', 'Unidade', 'Função', 'Idade atual', ...FIELDS.map((f) => f.label), 'Vacinas tomadas', 'Situação', 'Pendente no SGC'],
      ...list.map((m) => [
        m.name,
        (m.unitId && unitById.get(m.unitId)?.name) || '',
        roleLabel(m.role),
        age(m) ?? '',
        ...FIELDS.map((f) => (m[f.key] ?? '').toString().replace(/\n/g, ' | ')),
        (m.vaccines ?? '').split('\n').filter(Boolean).join(', '),
        m.active ? 'Ativo' : 'Inativo',
        m.sgcPending ? 'Sim' : 'Não',
      ]),
    ]);

  const onFile = async (f: File) => {
    try {
      const rows = parseCSV(await f.text());
      if (rows.length < 2) throw new Error('a planilha está vazia');
      setImportRows(rows);
    } catch (e) {
      toast('Não foi possível ler a planilha: ' + (e as Error).message, true);
    }
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Controle de Membros</h1>
          <p className="page-sub">Ficha completa de cada desbravador e controle do que precisa ser atualizado no SGC.</p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <FileUp /> Importar planilha
          </button>
          <button className="btn" onClick={() => setBulk(true)}>
            <ListPlus /> Adicionar vários
          </button>
          <button className="btn btn-primary" onClick={() => setProfile({})}>
            <UserPlus /> Novo membro
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 18 }}>
        {counts.map((c) => (
          <div
            key={c.unit.id}
            role="button"
            tabIndex={0}
            className="card unit-count"
            style={{ borderColor: unit === c.unit.id ? c.unit.color : undefined }}
            onClick={() => setUnit(unit === c.unit.id ? '' : c.unit.id)}
            title="Clique para filtrar a lista por esta unidade"
          >
            <UnitLogo unit={c.unit} size={46} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="small muted">{c.unit.name}</div>
              <div className="stat-value" style={{ fontSize: 22 }}>
                {c.n} <span className="tiny">membro(s)</span>
              </div>
            </div>
            <button
              className="icon-btn unit-add"
              title={`Cadastrar membro na unidade ${c.unit.name}`}
              aria-label={`Cadastrar membro na unidade ${c.unit.name}`}
              onClick={(e) => {
                e.stopPropagation();
                setProfile({ unit: c.unit.id });
              }}
            >
              <UserPlus />
            </button>
          </div>
        ))}
      </div>

      {pendingCount > 0 && view !== 'pendentes' && (
        <div className="notice warn" style={{ marginBottom: 18, alignItems: 'center' }}>
          <RefreshCw />
          <div className="grow">
            <b>{pendingCount} ficha(s)</b> com alterações que ainda precisam ser lançadas no SGC.
          </div>
          <button className="btn btn-sm" onClick={() => setView('pendentes')}>
            Ver pendências
          </button>
        </div>
      )}

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search />
            <input className="input" placeholder="Buscar por nome, CPF, código SGC…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">Todas as unidades</option>
            {data.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
            <option value="_none">Sem unidade</option>
          </select>
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Todas as funções</option>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <div className="segmented">
            <button className={view === 'ativos' ? 'on' : ''} onClick={() => setView('ativos')}>
              Ativos
            </button>
            <button className={view === 'pendentes' ? 'on' : ''} onClick={() => setView('pendentes')}>
              Pendentes SGC {pendingCount > 0 && `(${pendingCount})`}
            </button>
            <button className={view === 'inativos' ? 'on' : ''} onClick={() => setView('inativos')}>
              Inativos
            </button>
          </div>
          <button className="btn btn-sm" onClick={exportCSV} disabled={!list.length}>
            <Download /> Exportar
          </button>
        </div>

        {list.length === 0 ? (
          <Empty
            icon={view === 'pendentes' ? CheckCircle2 : Users}
            title={
              view === 'pendentes'
                ? 'Nenhuma pendência com o SGC'
                : data.members.length
                  ? 'Ninguém encontrado'
                  : 'Nenhum membro cadastrado'
            }
            text={
              view === 'pendentes'
                ? 'Todas as fichas estão iguais às do SGC.'
                : data.members.length
                  ? 'Ajuste a busca ou os filtros.'
                  : 'Importe a planilha exportada do SGC ou cadastre os membros.'
            }
            action={
              !data.members.length && (
                <button className="btn btn-primary" onClick={() => fileRef.current?.click()}>
                  <FileUp /> Importar planilha
                </button>
              )
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Unidade</th>
                  <th className="hide-sm">Função / classe</th>
                  <th className="hide-sm">Ficha</th>
                  <th>SGC</th>
                  {data.isExecutive && <th className="num hide-sm">Em aberto</th>}
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((m) => {
                  const u = m.unitId ? unitById.get(m.unitId) : undefined;
                  const owed = debt.get(m.id) ?? 0;
                  const years = age(m);
                  const pct = completeness(m);
                  return (
                    <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => setProfile({ member: m })}>
                      <td>
                        <div className="row">
                          <MemberAvatar member={m} unit={u} size={38} />
                          <div>
                            <b style={{ fontWeight: 600 }}>{m.name}</b>
                            <div className="tiny">
                              {years !== null ? `${years} anos` : 'Idade não informada'}
                              {m.sgcId && ` · SGC ${m.sgcId}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <UnitChip unit={u} />
                      </td>
                      <td className="hide-sm small">
                        {roleLabel(m.role)}
                        {m.currentClass && <div className="tiny">Classe {m.currentClass}</div>}
                      </td>
                      <td className="hide-sm" style={{ minWidth: 110 }}>
                        <div className="tiny" style={{ marginBottom: 4 }}>
                          {pct}%
                        </div>
                        <Bar pct={pct} color={pct === 100 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'} />
                      </td>
                      <td>
                        {m.sgcPending ? (
                          <span className="badge parcial" title={`${m.sgcChanges?.length ?? 0} alteração(ões)`}>
                            Pendente
                          </span>
                        ) : (
                          <span className="badge pago">Em dia</span>
                        )}
                      </td>
                      {data.isExecutive && (
                        <td className="num hide-sm">{owed ? <b className="down">{money(owed)}</b> : <span className="up small">—</span>}</td>
                      )}
                      <td className="actions" onClick={(e) => e.stopPropagation()}>
                        {m.sgcPending && (
                          <button className="icon-btn" title="Marcar como atualizado no SGC" onClick={() => markSynced(m)}>
                            <CheckCircle2 />
                          </button>
                        )}
                        <button className="icon-btn danger" aria-label="Excluir" onClick={() => del(m)}>
                          <Trash2 />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {profile && <MemberProfile data={data} member={profile.member} presetUnit={profile.unit} onClose={() => setProfile(null)} />}
      {bulk && <BulkForm data={data} onClose={() => setBulk(false)} />}
      {importRows && <ImportDialog data={data} rows={importRows} onClose={() => setImportRows(null)} />}
    </div>
  );
}

// ---------------- Importar planilha (SGC ou outra) ----------------
type Target = ProfileKey | 'name' | 'unit' | 'role' | '';

function guessTarget(header: string): Target {
  const h = normalize(header);
  if (['nome', 'nome completo', 'desbravador', 'membro'].includes(h)) return 'name';
  if (['unidade'].includes(h)) return 'unit';
  if (['funcao', 'cargo'].includes(h)) return 'role';
  for (const f of FIELDS) {
    const names = [f.label, ...(f.aliases ?? [])].map(normalize);
    if (names.includes(h)) return f.key;
  }
  for (const f of FIELDS) if ([f.label, ...(f.aliases ?? [])].some((n) => h.includes(normalize(n)) && normalize(n).length > 3)) return f.key;
  return '';
}

function ImportDialog({ data, rows, onClose }: { data: PageProps['data']; rows: string[][]; onClose: () => void }) {
  const [header, ...body] = rows;
  const [map, setMap] = useState<Target[]>(() => header.map(guessTarget));
  const [busy, setBusy] = useState(false);
  const nameCol = map.indexOf('name');

  const plan = useMemo(() => {
    if (nameCol < 0) return { create: [] as Member[], update: [] as Member[] };
    const byName = new Map(data.members.map((m) => [normalize(m.name), m]));
    const bySgc = new Map(data.members.filter((m) => m.sgcId).map((m) => [normalize(m.sgcId!), m]));
    const unitByName = new Map(data.units.map((u) => [normalize(u.name).replace(/^unidade\s+/, '').replace(/-/g, ' '), u.id]));
    const create: Member[] = [];
    const update: Member[] = [];
    const now = Date.now();
    for (const r of body) {
      const name = (r[nameCol] ?? '').trim();
      if (!name) continue;
      const sgcCol = map.indexOf('sgcId');
      const existing = (sgcCol >= 0 && r[sgcCol] && bySgc.get(normalize(r[sgcCol]))) || byName.get(normalize(name));
      const m: Member = existing
        ? { ...existing }
        : { id: uid(), name, unitId: null, role: 'Desbravador', active: true, createdAt: now };
      map.forEach((t, i) => {
        const v = (r[i] ?? '').trim();
        if (!t || !v) return;
        if (t === 'name') m.name = v;
        else if (t === 'unit') m.unitId = unitByName.get(normalize(v).replace(/^unidade\s+/, '').replace(/-/g, ' ')) ?? m.unitId;
        else if (t === 'role') m.role = ROLES.find((x) => normalize(x).startsWith(normalize(v).slice(0, 6))) ?? v;
        else {
          const f = FIELDS.find((x) => x.key === t);
          m[t] = f?.type === 'date' ? toIsoDate(v) : v;
        }
      });
      // dados vindos do SGC: ficha fica "em dia"
      m.sgcPending = false;
      m.sgcChanges = [];
      m.sgcSyncedAt = now;
      m.updatedAt = now;
      (existing ? update : create).push(m);
    }
    return { create, update };
  }, [map, body, nameCol, data.members, data.units]);

  const submit = async () => {
    setBusy(true);
    const ok = await run(
      () => Promise.all([...plan.create, ...plan.update].map((m) => save('members', m))),
      `${plan.create.length} cadastrado(s), ${plan.update.length} atualizado(s)`,
    );
    setBusy(false);
    if (ok) onClose();
  };

  const options: { v: Target; l: string }[] = [
    { v: '', l: '— Ignorar —' },
    { v: 'name', l: 'Nome' },
    { v: 'unit', l: 'Unidade' },
    { v: 'role', l: 'Função' },
    ...FIELDS.map((f) => ({ v: f.key as Target, l: f.label })),
  ];

  return (
    <Modal
      wide
      title="Importar planilha de membros"
      onClose={onClose}
      footer={
        <>
          <span className="small muted grow">
            {nameCol < 0 ? 'Indique qual coluna tem o nome.' : `${plan.create.length} novo(s) · ${plan.update.length} atualização(ões)`}
          </span>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={nameCol < 0 || busy || !(plan.create.length + plan.update.length)} onClick={submit}>
            Importar
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 14 }}>
        <p className="small muted">
          Exporte a lista de membros do SGC (ou use qualquer planilha), salve como <b>CSV</b> e confira abaixo a qual campo corresponde cada
          coluna. Quem já está cadastrado (mesmo nome ou código SGC) é atualizado; os demais são criados.
        </p>
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Coluna da planilha</th>
                <th>Exemplo</th>
                <th>Campo no sistema</th>
              </tr>
            </thead>
            <tbody>
              {header.map((h, i) => (
                <tr key={i}>
                  <td>
                    <b style={{ fontWeight: 600 }}>{h || `Coluna ${i + 1}`}</b>
                  </td>
                  <td className="small muted">{body[0]?.[i] ?? ''}</td>
                  <td>
                    <select
                      className="select"
                      style={{ height: 36 }}
                      value={map[i]}
                      onChange={(e) => setMap(map.map((x, j) => (j === i ? (e.target.value as Target) : x)))}
                    >
                      {options.map((o) => (
                        <option key={o.v} value={o.v}>
                          {o.l}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- Adicionar vários ----------------
function BulkForm({ data, onClose }: { data: PageProps['data']; onClose: () => void }) {
  const [text, setText] = useState('');
  const [unitId, setUnitId] = useState('');
  const [role, setRole] = useState('Desbravador');
  const existing = new Set(data.members.map((m) => normalize(m.name)));
  const names = [...new Set(text.split('\n').map((l) => l.replace(/^\s*[\d.\-)*•]+\s*/, '').trim()).filter(Boolean))];
  const fresh = names.filter((n) => !existing.has(normalize(n)));

  const submit = async () => {
    const now = Date.now();
    const ok = await run(
      () =>
        Promise.all(
          fresh.map((name, i) =>
            save('members', {
              id: uid(),
              name,
              unitId: unitId || null,
              role,
              active: true,
              createdAt: now + i,
              sgcPending: true,
              sgcChanges: [{ field: 'name', from: '—', to: 'Cadastro novo — incluir no SGC', at: now }],
            }),
          ),
        ),
      `${fresh.length} membro(s) cadastrado(s)`,
    );
    if (ok) onClose();
  };

  return (
    <Modal
      title="Adicionar vários membros"
      onClose={onClose}
      footer={
        <>
          <span className="small muted grow">
            {fresh.length} novo(s){names.length !== fresh.length && ` · ${names.length - fresh.length} já cadastrado(s)`}
          </span>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!fresh.length} onClick={submit}>
            <Plus /> Cadastrar
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nomes — um por linha (pode colar de uma planilha ou do WhatsApp)" full>
          <textarea
            className="textarea"
            style={{ minHeight: 200 }}
            autoFocus
            placeholder={'Ana Souza\nBruno Lima\nCarla Mendes'}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <Field label="Unidade de todos">
          <select className="select" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Sem unidade</option>
            {data.activeUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Função">
          <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

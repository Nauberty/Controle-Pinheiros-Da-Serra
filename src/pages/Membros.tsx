import { useMemo, useState } from 'react';
import { Download, ListPlus, Pencil, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react';
import type { Member, MemberRole } from '../types';
import { removeItem, save } from '../data/store';
import { chargeBalances } from '../lib/finance';
import { money, normalize, uid } from '../lib/format';
import { downloadCSV } from '../lib/download';
import { Empty, Field, Modal, UnitChip, confirmDialog, initials, run } from '../components/ui';
import type { PageProps } from './types';

const ROLES: { id: MemberRole; label: string }[] = [
  { id: 'desbravador', label: 'Desbravador' },
  { id: 'conselheiro', label: 'Conselheiro' },
  { id: 'diretoria', label: 'Diretoria' },
  { id: 'outro', label: 'Outro' },
];
const roleLabel = (r: MemberRole) => ROLES.find((x) => x.id === r)?.label ?? r;

export default function Membros({ data }: PageProps) {
  const [form, setForm] = useState<{ member?: Member } | null>(null);
  const [bulk, setBulk] = useState(false);
  const [q, setQ] = useState('');
  const [unit, setUnit] = useState('');
  const [role, setRole] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const unitById = new Map(data.units.map((u) => [u.id, u]));

  // quanto cada pessoa ainda deve nas cobranças ativas
  const debt = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of data.charges.filter((c) => !c.archived))
      for (const b of chargeBalances(c, data.members, data.payments)) map.set(b.member.id, (map.get(b.member.id) ?? 0) + b.remaining);
    return map;
  }, [data.charges, data.members, data.payments]);

  const list = data.members
    .filter(
      (m) =>
        m.active !== showInactive &&
        (!unit || (unit === '_none' ? !m.unitId : m.unitId === unit)) &&
        (!role || m.role === role) &&
        (!q || normalize(`${m.name} ${m.guardian ?? ''}`).includes(normalize(q))),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const counts = data.activeUnits.map((u) => ({ unit: u, n: data.members.filter((m) => m.active && m.unitId === u.id).length }));

  const del = async (m: Member) => {
    const pays = data.payments.filter((p) => p.memberId === m.id).length;
    if (pays) {
      const ok = await confirmDialog(
        'Desativar membro?',
        `${m.name} tem ${pays} pagamento(s) registrado(s), por isso não pode ser excluído. Deseja marcar como inativo? O histórico será mantido.`,
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
    downloadCSV('membros.csv', [
      ['Nome', 'Unidade', 'Função', 'Responsável', 'Telefone', 'Situação', 'Em aberto (R$)'],
      ...list.map((m) => [
        m.name,
        (m.unitId && unitById.get(m.unitId)?.name) || '',
        roleLabel(m.role),
        m.guardian ?? '',
        m.phone ?? '',
        m.active ? 'Ativo' : 'Inativo',
        ((debt.get(m.id) ?? 0) / 100).toFixed(2).replace('.', ','),
      ]),
    ]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Membros</h1>
          <p className="page-sub">
            {data.members.filter((m) => m.active).length} membro(s) ativo(s) · {counts.map((c) => `${c.unit.name}: ${c.n}`).join(' · ')}
          </p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setBulk(true)}>
            <ListPlus /> Adicionar vários
          </button>
          <button className="btn btn-primary" onClick={() => setForm({})}>
            <UserPlus /> Novo membro
          </button>
        </div>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search />
            <input className="input" placeholder="Buscar por nome ou responsável…" value={q} onChange={(e) => setQ(e.target.value)} />
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
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          <div className="segmented">
            <button className={!showInactive ? 'on' : ''} onClick={() => setShowInactive(false)}>
              Ativos
            </button>
            <button className={showInactive ? 'on' : ''} onClick={() => setShowInactive(true)}>
              Inativos
            </button>
          </div>
          <button className="btn btn-sm" onClick={exportCSV} disabled={!list.length}>
            <Download /> Exportar
          </button>
        </div>

        {list.length === 0 ? (
          <Empty
            icon={Users}
            title={data.members.length ? 'Ninguém encontrado' : 'Nenhum membro cadastrado'}
            text={data.members.length ? 'Ajuste a busca ou os filtros.' : 'Cadastre os desbravadores, conselheiros e diretoria do clube.'}
            action={
              !data.members.length && (
                <button className="btn btn-primary" onClick={() => setBulk(true)}>
                  <ListPlus /> Adicionar lista de nomes
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
                  <th className="hide-sm">Função</th>
                  <th className="hide-sm">Responsável / contato</th>
                  <th className="num">Em aberto</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((m) => {
                  const u = m.unitId ? unitById.get(m.unitId) : undefined;
                  const owed = debt.get(m.id) ?? 0;
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="row">
                          <div className="avatar" style={{ background: (u?.color ?? '#8a918c') + '22', color: u?.color ?? 'var(--text-2)' }}>
                            {initials(m.name)}
                          </div>
                          <b style={{ fontWeight: 600 }}>{m.name}</b>
                        </div>
                      </td>
                      <td>
                        <UnitChip unit={u} />
                      </td>
                      <td className="hide-sm">
                        <span className="badge neutral">{roleLabel(m.role)}</span>
                      </td>
                      <td className="hide-sm small muted">
                        {[m.guardian, m.phone].filter(Boolean).join(' · ') || '—'}
                      </td>
                      <td className="num">{owed ? <b className="down">{money(owed)}</b> : <span className="up small">Em dia</span>}</td>
                      <td className="actions">
                        <button className="icon-btn" aria-label="Editar" onClick={() => setForm({ member: m })}>
                          <Pencil />
                        </button>
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

      {form && <MemberForm data={data} member={form.member} onClose={() => setForm(null)} />}
      {bulk && <BulkForm data={data} onClose={() => setBulk(false)} />}
    </div>
  );
}

function MemberForm({ data, member, onClose }: { data: PageProps['data']; member?: Member; onClose: () => void }) {
  const [name, setName] = useState(member?.name ?? '');
  const [unitId, setUnitId] = useState(member?.unitId ?? '');
  const [role, setRole] = useState<MemberRole>(member?.role ?? 'desbravador');
  const [guardian, setGuardian] = useState(member?.guardian ?? '');
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [active, setActive] = useState(member?.active ?? true);
  const [addToCharges, setAddToCharges] = useState(true);
  const openCharges = data.charges.filter((c) => !c.archived);

  const submit = async () => {
    if (!name.trim()) return;
    const id = member?.id ?? uid();
    const ok = await run(async () => {
      await save('members', {
        id,
        name: name.trim(),
        unitId: unitId || null,
        role,
        guardian: guardian.trim(),
        phone: phone.trim(),
        active,
        createdAt: member?.createdAt ?? Date.now(),
      });
      if (!member && addToCharges)
        await Promise.all(openCharges.map((c) => save('charges', { ...c, memberIds: [...c.memberIds, id] })));
    }, member ? 'Membro atualizado' : 'Membro cadastrado');
    if (ok) onClose();
  };

  return (
    <Modal
      title={member ? 'Editar membro' : 'Novo membro'}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!name.trim()} onClick={submit}>
            Salvar
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Nome completo" full>
          <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Unidade">
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
          <select className="select" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Responsável (opcional)">
          <input className="input" value={guardian} onChange={(e) => setGuardian(e.target.value)} />
        </Field>
        <Field label="Telefone (opcional)">
          <input className="input" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        {member ? (
          <label className="check-row full" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Membro ativo
          </label>
        ) : (
          openCharges.length > 0 && (
            <label className="check-row full" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
              <input type="checkbox" checked={addToCharges} onChange={(e) => setAddToCharges(e.target.checked)} />
              Incluir nas cobranças em aberto ({openCharges.map((c) => c.title).join(', ')})
            </label>
          )
        )}
      </div>
    </Modal>
  );
}

function BulkForm({ data, onClose }: { data: PageProps['data']; onClose: () => void }) {
  const [text, setText] = useState('');
  const [unitId, setUnitId] = useState('');
  const [role, setRole] = useState<MemberRole>('desbravador');
  const existing = new Set(data.members.map((m) => normalize(m.name)));
  const names = [...new Set(text.split('\n').map((l) => l.replace(/^\s*[\d.\-)*•]+\s*/, '').trim()).filter(Boolean))];
  const fresh = names.filter((n) => !existing.has(normalize(n)));

  const submit = async () => {
    const now = Date.now();
    const ok = await run(
      () =>
        Promise.all(
          fresh.map((name, i) =>
            save('members', { id: uid(), name, unitId: unitId || null, role, active: true, createdAt: now + i }),
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
          <select className="select" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
            {ROLES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Modal>
  );
}

import { Fragment, useMemo, useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarClock,
  Download,
  HandCoins,
  Pencil,
  Plus,
  Receipt,
  Search,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { Charge, Expense, Payment } from '../types';
import { removeItem, save } from '../data/store';
import { cashSummary, chargeSummary, methodLabel, type Status } from '../lib/finance';
import { dateBR, money, monthKey, monthLabel, normalize } from '../lib/format';
import { csvMoney, downloadCSV } from '../lib/download';
import { Bar, Empty, Modal, Stat, StatusBadge, UnitChip, confirmDialog, run } from '../components/ui';
import { ChargeForm, ExpenseForm, PaymentForm } from '../components/FinanceForms';
import type { PageProps } from './types';

type Tab = 'cobrancas' | 'pagamentos' | 'despesas';

export default function Tesouraria({ data }: PageProps) {
  const [tab, setTab] = useState<Tab>('cobrancas');
  const [chargeForm, setChargeForm] = useState<{ charge?: Charge } | null>(null);
  const [payForm, setPayForm] = useState<{ payment?: Payment; preset?: { memberId?: string; chargeId?: string } } | null>(null);
  const [expForm, setExpForm] = useState<{ expense?: Expense } | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const cash = useMemo(
    () => cashSummary(data.payments, data.expenses, data.charges, data.members),
    [data.payments, data.expenses, data.charges, data.members],
  );

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tesouraria</h1>
          <p className="page-sub">Quem já pagou, quem falta pagar e todo o movimento do caixa.</p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={() => setExpForm({})}>
            <ArrowUpCircle /> Despesa
          </button>
          <button className="btn btn-primary" onClick={() => setPayForm({})}>
            <Plus /> Registrar pagamento
          </button>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <Stat icon={ArrowDownCircle} label="Entradas" value={money(cash.income)} hint={`${data.payments.length} pagamento(s)`} />
        <Stat icon={ArrowUpCircle} tone="red" label="Saídas" value={money(cash.out)} hint={`${data.expenses.length} despesa(s)`} />
        <Stat icon={Wallet} tone="blue" label="Saldo em caixa" value={money(cash.balance)} />
        <Stat icon={CalendarClock} tone="amber" label="A receber" value={money(cash.toReceive)} hint="Cobranças em aberto" />
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'cobrancas' ? 'on' : ''}`} onClick={() => setTab('cobrancas')}>
          <Receipt /> Cobranças <span className="count">{data.charges.filter((c) => !c.archived).length}</span>
        </button>
        <button className={`tab ${tab === 'pagamentos' ? 'on' : ''}`} onClick={() => setTab('pagamentos')}>
          <HandCoins /> Pagamentos <span className="count">{data.payments.length}</span>
        </button>
        <button className={`tab ${tab === 'despesas' ? 'on' : ''}`} onClick={() => setTab('despesas')}>
          <ArrowUpCircle /> Despesas <span className="count">{data.expenses.length}</span>
        </button>
      </div>

      {tab === 'cobrancas' && <Charges data={data} onNew={() => setChargeForm({})} onOpen={setDetail} />}
      {tab === 'pagamentos' && (
        <Payments data={data} onEdit={(p) => setPayForm({ payment: p })} byMethod={cash.byMethod} />
      )}
      {tab === 'despesas' && <Expenses data={data} onNew={() => setExpForm({})} onEdit={(e) => setExpForm({ expense: e })} />}

      {detail && (
        <ChargeDetail
          data={data}
          chargeId={detail}
          onClose={() => setDetail(null)}
          onEdit={(c) => setChargeForm({ charge: c })}
          onPay={(preset) => setPayForm({ preset })}
          onEditPayment={(p) => setPayForm({ payment: p })}
        />
      )}
      {chargeForm && (
        <ChargeForm
          data={data}
          charge={chargeForm.charge}
          onClose={(saved) => {
            setChargeForm(null);
            if (saved && !chargeForm.charge) setDetail(saved.id);
          }}
        />
      )}
      {payForm && <PaymentForm data={data} payment={payForm.payment} preset={payForm.preset} onClose={() => setPayForm(null)} />}
      {expForm && <ExpenseForm data={data} expense={expForm.expense} onClose={() => setExpForm(null)} />}
    </div>
  );
}

// ---------------- Cobranças ----------------
function Charges({ data, onNew, onOpen }: { data: PageProps['data']; onNew: () => void; onOpen: (id: string) => void }) {
  const [showArchived, setShowArchived] = useState(false);
  const list = data.charges
    .filter((c) => !!c.archived === showArchived)
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || b.createdAt - a.createdAt);
  const archivedCount = data.charges.filter((c) => c.archived).length;

  return (
    <div className="stack">
      <div className="row-between wrap">
        <p className="muted small">
          Crie uma cobrança (ex.: <b>Campori</b>), escolha quem deve pagar e acompanhe cada pessoa.
        </p>
        <div className="row">
          {archivedCount > 0 && (
            <button className="btn btn-sm btn-ghost" onClick={() => setShowArchived(!showArchived)}>
              <Archive /> {showArchived ? 'Ver ativas' : `Arquivadas (${archivedCount})`}
            </button>
          )}
          <button className="btn btn-sm" onClick={onNew}>
            <Plus /> Nova cobrança
          </button>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="card">
          <Empty
            icon={Receipt}
            title={showArchived ? 'Nenhuma cobrança arquivada' : 'Nenhuma cobrança criada'}
            text="Exemplo: “Campori 2027 — R$ 350,00 por pessoa”."
            action={
              !showArchived && (
                <button className="btn btn-primary" onClick={onNew}>
                  <Plus /> Criar cobrança
                </button>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-2">
          {list.map((c) => {
            const s = chargeSummary(c, data.members, data.payments);
            const total = s.rows.length || 1;
            return (
              <div key={c.id} className="card charge-card" onClick={() => onOpen(c.id)}>
                <div className="row-between">
                  <div>
                    <div className="charge-title">{c.title}</div>
                    <div className="small muted">
                      {money(c.amount)} por pessoa · {s.rows.length} pessoa(s)
                      {c.dueDate && ` · vence ${dateBR(c.dueDate)}`}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="pts" style={{ fontSize: 24 }}>
                      {s.pct}%
                    </div>
                    <div className="tiny">arrecadado</div>
                  </div>
                </div>
                <Bar lg pct={s.pct} />
                <div className="row-between small">
                  <span>
                    Recebido <b>{money(s.received)}</b>
                  </span>
                  <span>
                    Falta <b className="down">{money(s.remaining)}</b>
                  </span>
                </div>
                <div className="stack-bar">
                  <span style={{ width: `${(s.pago / total) * 100}%`, background: 'var(--success)' }} />
                  <span style={{ width: `${(s.parcial / total) * 100}%`, background: 'var(--warning)' }} />
                  <span style={{ width: `${(s.pendente / total) * 100}%`, background: 'var(--danger)' }} />
                </div>
                <div className="legend">
                  <span>
                    <i style={{ background: 'var(--success)' }} />
                    {s.pago} quitado(s)
                  </span>
                  <span>
                    <i style={{ background: 'var(--warning)' }} />
                    {s.parcial} parcial
                  </span>
                  <span>
                    <i style={{ background: 'var(--danger)' }} />
                    {s.pendente} pendente(s)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- Detalhe da cobrança ----------------
function ChargeDetail(props: {
  data: PageProps['data'];
  chargeId: string;
  onClose: () => void;
  onEdit: (c: Charge) => void;
  onPay: (preset: { memberId: string; chargeId: string }) => void;
  onEditPayment: (p: Payment) => void;
}) {
  const { data } = props;
  const [filter, setFilter] = useState<Status | ''>('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const charge = data.charges.find((c) => c.id === props.chargeId);
  const s = useMemo(
    () => (charge ? chargeSummary(charge, data.members, data.payments) : null),
    [charge, data.members, data.payments],
  );
  if (!charge || !s) return null;
  const unitById = new Map(data.units.map((u) => [u.id, u]));
  const rows = s.rows.filter((r) => (!filter || r.status === filter) && (!q || normalize(r.member.name).includes(normalize(q))));

  const exportCSV = () =>
    downloadCSV(`${normalize(charge.title).replace(/\s+/g, '-')}.csv`, [
      ['Nome', 'Unidade', 'Valor devido', 'Pago', 'Falta', 'Situação', 'Pagamentos'],
      ...s.rows.map((r) => [
        r.member.name,
        (r.member.unitId && unitById.get(r.member.unitId)?.name) || '',
        csvMoney(r.due),
        csvMoney(r.paid),
        csvMoney(r.remaining),
        r.status,
        r.payments.map((p) => `${dateBR(p.date)} ${methodLabel(p.method)} ${csvMoney(p.amount)}`).join(' | '),
      ]),
    ]);

  const toggleArchive = () =>
    run(() => save('charges', { ...charge, archived: !charge.archived }), charge.archived ? 'Cobrança reativada' : 'Cobrança arquivada');

  const del = async () => {
    const linked = data.payments.filter((p) => p.chargeId === charge.id).length;
    const ok = await confirmDialog(
      'Excluir cobrança?',
      linked
        ? `Existem ${linked} pagamento(s) ligados a esta cobrança. Eles continuarão no caixa como pagamentos avulsos. Prefira "Arquivar" se o evento já terminou.`
        : 'Essa ação não pode ser desfeita.',
      { ok: 'Excluir' },
    );
    if (!ok) return;
    await run(async () => {
      await Promise.all(
        data.payments.filter((p) => p.chargeId === charge.id).map((p) => save('payments', { ...p, chargeId: null })),
      );
      await removeItem('charges', charge.id);
    }, 'Cobrança excluída');
    props.onClose();
  };

  return (
    <Modal wide title={charge.title} onClose={props.onClose}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="grid grid-3" style={{ gap: 12 }}>
          <div className="card card-pad" style={{ padding: 14 }}>
            <div className="stat-label">Previsto</div>
            <div className="stat-value" style={{ fontSize: 22 }}>
              {money(s.expected)}
            </div>
          </div>
          <div className="card card-pad" style={{ padding: 14 }}>
            <div className="stat-label">Recebido</div>
            <div className="stat-value up" style={{ fontSize: 22 }}>
              {money(s.received)}
            </div>
          </div>
          <div className="card card-pad" style={{ padding: 14 }}>
            <div className="stat-label">Falta receber</div>
            <div className="stat-value down" style={{ fontSize: 22 }}>
              {money(s.remaining)}
            </div>
          </div>
        </div>
        <Bar lg pct={s.pct} />
        {charge.notes && <p className="small muted">{charge.notes}</p>}

        <div className="row wrap">
          <div className="segmented">
            {(
              [
                ['', `Todos (${s.rows.length})`],
                ['pendente', `Pendentes (${s.pendente})`],
                ['parcial', `Parciais (${s.parcial})`],
                ['pago', `Pagos (${s.pago})`],
              ] as [Status | '', string][]
            ).map(([k, label]) => (
              <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>
                {label}
              </button>
            ))}
          </div>
          <div className="search" style={{ minWidth: 160 }}>
            <Search />
            <input className="input" style={{ height: 38 }} placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th className="hide-sm">Unidade</th>
                <th className="num">Devido</th>
                <th className="num">Pago</th>
                <th className="num hide-sm">Falta</th>
                <th>Situação</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.member.id}>
                  <tr onClick={() => setOpen(open === r.member.id ? null : r.member.id)} style={{ cursor: 'pointer' }}>
                    <td>
                      <b style={{ fontWeight: 600 }}>{r.member.name}</b>
                      {r.payments.length > 0 && <div className="tiny">{r.payments.length === 1 ? "1 pagamento" : `${r.payments.length} pagamentos`} · ver</div>}
                    </td>
                    <td className="hide-sm">
                      <UnitChip unit={r.member.unitId ? unitById.get(r.member.unitId) : undefined} />
                    </td>
                    <td className="num">{money(r.due)}</td>
                    <td className="num">{money(r.paid)}</td>
                    <td className="num hide-sm">{r.remaining ? money(r.remaining) : '—'}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="actions">
                      {r.remaining > 0 && (
                        <button
                          className="btn btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            props.onPay({ memberId: r.member.id, chargeId: charge.id });
                          }}
                        >
                          <Plus /> Pagar
                        </button>
                      )}
                    </td>
                  </tr>
                  {open === r.member.id &&
                    r.payments.map((p) => (
                      <tr key={p.id} style={{ background: 'var(--surface-2)' }}>
                        <td colSpan={2} className="small">
                          ↳ {dateBR(p.date)} {p.note && <span className="muted">· {p.note}</span>}
                        </td>
                        <td className="num small" colSpan={2}>
                          {money(p.amount)}
                        </td>
                        <td className="hide-sm" />
                        <td>
                          <span className={`badge method-${p.method}`}>{methodLabel(p.method)}</span>
                        </td>
                        <td className="actions">
                          <button className="icon-btn" aria-label="Editar pagamento" onClick={() => props.onEditPayment(p)}>
                            <Pencil />
                          </button>
                        </td>
                      </tr>
                    ))}
                </Fragment>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted small" style={{ textAlign: 'center', padding: 24 }}>
                    Ninguém nesta situação.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <div className="row wrap">
            <button className="btn btn-sm" onClick={() => props.onEdit(charge)}>
              <Pencil /> Editar / incluir pessoas
            </button>
            <button className="btn btn-sm" onClick={exportCSV}>
              <Download /> Exportar planilha
            </button>
          </div>
          <div className="row">
            <button className="btn btn-sm btn-ghost" onClick={toggleArchive}>
              {charge.archived ? <ArchiveRestore /> : <Archive />} {charge.archived ? 'Reativar' : 'Arquivar'}
            </button>
            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--danger)' }} onClick={del}>
              <Trash2 /> Excluir
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ---------------- Pagamentos ----------------
function Payments({
  data,
  onEdit,
  byMethod,
}: {
  data: PageProps['data'];
  onEdit: (p: Payment) => void;
  byMethod: ReturnType<typeof cashSummary>['byMethod'];
}) {
  const [method, setMethod] = useState('');
  const [chargeId, setChargeId] = useState('');
  const [month, setMonth] = useState('');
  const [q, setQ] = useState('');
  const memberById = new Map(data.members.map((m) => [m.id, m]));
  const chargeById = new Map(data.charges.map((c) => [c.id, c]));
  const months = [...new Set(data.payments.map((p) => monthKey(p.date)))].sort().reverse();

  const list = data.payments
    .filter(
      (p) =>
        (!method || p.method === method) &&
        (!chargeId || (chargeId === '_avulso' ? !p.chargeId : p.chargeId === chargeId)) &&
        (!month || monthKey(p.date) === month) &&
        (!q || normalize(`${memberById.get(p.memberId)?.name ?? ''} ${p.note ?? ''}`).includes(normalize(q))),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const total = list.reduce((s, p) => s + p.amount, 0);

  const del = async (p: Payment) => {
    const ok = await confirmDialog(
      'Excluir pagamento?',
      `${money(p.amount)} de ${memberById.get(p.memberId)?.name ?? '—'} em ${dateBR(p.date)}.`,
      { ok: 'Excluir' },
    );
    if (ok) run(() => removeItem('payments', p.id), 'Pagamento excluído');
  };

  const exportCSV = () =>
    downloadCSV('pagamentos.csv', [
      ['Data', 'Nome', 'Referente a', 'Forma', 'Valor', 'Observação', 'Registrado por'],
      ...list.map((p) => [
        dateBR(p.date),
        memberById.get(p.memberId)?.name ?? '',
        (p.chargeId && chargeById.get(p.chargeId)?.title) || 'Avulso',
        methodLabel(p.method),
        csvMoney(p.amount),
        p.note ?? '',
        p.createdBy ?? '',
      ]),
    ]);

  return (
    <div className="stack">
      {byMethod.length > 0 && (
        <div className="grid grid-4">
          {byMethod.map((m) => (
            <button
              key={m.id}
              className="card stat"
              style={{ cursor: 'pointer', textAlign: 'left', border: method === m.id ? '1px solid var(--forest-600)' : undefined }}
              onClick={() => setMethod(method === m.id ? '' : m.id)}
            >
              <div style={{ minWidth: 0 }}>
                <span className={`badge method-${m.id}`}>{m.label}</span>
                <div className="stat-value" style={{ fontSize: 22, marginTop: 6 }}>
                  {money(m.total)}
                </div>
                <div className="stat-hint">{m.count} pagamento(s)</div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="card">
        <div className="toolbar">
          <div className="search">
            <Search />
            <input className="input" placeholder="Buscar por nome ou observação…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" value={chargeId} onChange={(e) => setChargeId(e.target.value)}>
            <option value="">Todas as cobranças</option>
            {data.charges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
            <option value="_avulso">Avulsos</option>
          </select>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">Todas as formas</option>
            {['pix', '7me', 'dinheiro', 'cartao', 'outro'].map((m) => (
              <option key={m} value={m}>
                {methodLabel(m as Payment['method'])}
              </option>
            ))}
          </select>
          <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">Todos os meses</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <button className="btn btn-sm" onClick={exportCSV} disabled={!list.length}>
            <Download /> Exportar
          </button>
        </div>
        {list.length === 0 ? (
          <Empty icon={HandCoins} title="Nenhum pagamento encontrado" text="Os pagamentos registrados aparecem aqui." />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Nome</th>
                    <th className="hide-sm">Referente a</th>
                    <th>Forma</th>
                    <th className="num">Valor</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{dateBR(p.date)}</td>
                      <td>
                        {memberById.get(p.memberId)?.name ?? <span className="muted">Removido</span>}
                        {p.note && <div className="tiny">{p.note}</div>}
                      </td>
                      <td className="hide-sm">{(p.chargeId && chargeById.get(p.chargeId)?.title) || <span className="muted">Avulso</span>}</td>
                      <td>
                        <span className={`badge method-${p.method}`}>{methodLabel(p.method)}</span>
                      </td>
                      <td className="num">
                        <b>{money(p.amount)}</b>
                      </td>
                      <td className="actions">
                        <button className="icon-btn" aria-label="Editar" onClick={() => onEdit(p)}>
                          <Pencil />
                        </button>
                        <button className="icon-btn danger" aria-label="Excluir" onClick={() => del(p)}>
                          <Trash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="row-between small muted" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <span>{list.length} pagamento(s)</span>
              <span>
                Total: <b className="up">{money(total)}</b>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- Despesas ----------------
function Expenses({ data, onNew, onEdit }: { data: PageProps['data']; onNew: () => void; onEdit: (e: Expense) => void }) {
  const [month, setMonth] = useState('');
  const [category, setCategory] = useState('');
  const chargeById = new Map(data.charges.map((c) => [c.id, c]));
  const months = [...new Set(data.expenses.map((e) => monthKey(e.date)))].sort().reverse();
  const categories = [...new Set([...data.settings.expenseCategories, ...data.expenses.map((e) => e.category)])];
  const list = data.expenses
    .filter((e) => (!month || monthKey(e.date) === month) && (!category || e.category === category))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const total = list.reduce((s, e) => s + e.amount, 0);

  const del = async (e: Expense) => {
    const ok = await confirmDialog('Excluir despesa?', `${e.description} — ${money(e.amount)}.`, { ok: 'Excluir' });
    if (ok) run(() => removeItem('expenses', e.id), 'Despesa excluída');
  };

  const exportCSV = () =>
    downloadCSV('despesas.csv', [
      ['Data', 'Descrição', 'Categoria', 'Evento', 'Forma', 'Valor', 'Registrado por'],
      ...list.map((e) => [
        dateBR(e.date),
        e.description,
        e.category,
        (e.chargeId && chargeById.get(e.chargeId)?.title) || '',
        methodLabel(e.method),
        csvMoney(e.amount),
        e.createdBy ?? '',
      ]),
    ]);

  return (
    <div className="card">
      <div className="toolbar">
        <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select className="select" value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">Todos os meses</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
        <span className="grow" />
        <button className="btn btn-sm" onClick={exportCSV} disabled={!list.length}>
          <Download /> Exportar
        </button>
        <button className="btn btn-sm btn-primary" onClick={onNew}>
          <Plus /> Nova despesa
        </button>
      </div>
      {list.length === 0 ? (
        <Empty icon={ArrowUpCircle} title="Nenhuma despesa registrada" text="Registre gastos como inscrições, transporte e materiais." />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th className="hide-sm">Categoria</th>
                  <th className="hide-sm">Forma</th>
                  <th className="num">Valor</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((e) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{dateBR(e.date)}</td>
                    <td>
                      {e.description}
                      {e.chargeId && chargeById.get(e.chargeId) && <div className="tiny">{chargeById.get(e.chargeId)!.title}</div>}
                    </td>
                    <td className="hide-sm">{e.category}</td>
                    <td className="hide-sm">
                      <span className={`badge method-${e.method}`}>{methodLabel(e.method)}</span>
                    </td>
                    <td className="num">
                      <b className="down">{money(e.amount)}</b>
                    </td>
                    <td className="actions">
                      <button className="icon-btn" aria-label="Editar" onClick={() => onEdit(e)}>
                        <Pencil />
                      </button>
                      <button className="icon-btn danger" aria-label="Excluir" onClick={() => del(e)}>
                        <Trash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row-between small muted" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <span>{list.length} despesa(s)</span>
            <span>
              Total: <b className="down">{money(total)}</b>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Charge, Expense, Payment, PaymentMethod } from '../types';
import type { Data } from '../data/store';
import { save } from '../data/store';
import { METHODS, amountFor, chargeBalances } from '../lib/finance';
import { money, moneyInput, normalize, parseMoney, today, uid } from '../lib/format';
import { Field, Modal, MoneyInput, UnitChip, UnitLogo, run } from './ui';

function MethodPicker(props: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  return (
    <div className="chips">
      {METHODS.map((m) => (
        <button type="button" key={m.id} className={`chip ${props.value === m.id ? 'on' : ''}`} onClick={() => props.onChange(m.id)}>
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ============ Pagamento ============
export function PaymentForm(props: {
  data: Data;
  payment?: Payment;
  preset?: { memberId?: string; chargeId?: string };
  onClose: () => void;
}) {
  const { data, payment } = props;
  const openCharges = data.charges.filter((c) => !c.archived || c.id === payment?.chargeId);
  const [memberId, setMemberId] = useState(payment?.memberId ?? props.preset?.memberId ?? '');
  const [chargeId, setChargeId] = useState<string>(
    payment ? payment.chargeId ?? '' : props.preset?.chargeId ?? (openCharges.length === 1 ? openCharges[0].id : ''),
  );
  const [method, setMethod] = useState<PaymentMethod>(payment?.method ?? 'pix');
  const [date, setDate] = useState(payment?.date ?? today());
  const [note, setNote] = useState(payment?.note ?? '');
  const [busy, setBusy] = useState(false);

  const charge = data.charges.find((c) => c.id === chargeId);
  const balance = useMemo(() => {
    if (!charge || !memberId) return null;
    return chargeBalances(charge, data.members, data.payments.filter((p) => p.id !== payment?.id)).find(
      (b) => b.member.id === memberId,
    );
  }, [charge, memberId, data.members, data.payments, payment?.id]);

  const [amount, setAmount] = useState(() => {
    if (payment) return moneyInput(payment.amount);
    return '';
  });

  // pessoas da cobrança escolhida aparecem primeiro
  const members = useMemo(() => {
    const list = data.members.filter((m) => m.active || m.id === memberId);
    const inCharge = new Set(charge?.memberIds ?? []);
    return [...list].sort(
      (a, b) => Number(inCharge.has(b.id)) - Number(inCharge.has(a.id)) || a.name.localeCompare(b.name, 'pt-BR'),
    );
  }, [data.members, charge, memberId]);

  const cents = parseMoney(amount);
  const valid = !!memberId && cents > 0 && !!date;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const ok = await run(
      () =>
        save('payments', {
          id: payment?.id ?? uid(),
          memberId,
          chargeId: chargeId || null,
          amount: cents,
          method,
          date,
          note: note.trim(),
          createdAt: payment?.createdAt ?? Date.now(),
          createdBy: payment?.createdBy,
        }),
      payment ? 'Pagamento atualizado' : `Pagamento de ${money(cents)} registrado`,
    );
    setBusy(false);
    if (ok) props.onClose();
  };

  return (
    <Modal
      title={payment ? 'Editar pagamento' : 'Registrar pagamento'}
      onClose={props.onClose}
      footer={
        <>
          <button className="btn" onClick={props.onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!valid || busy} onClick={submit}>
            {payment ? 'Salvar' : 'Registrar pagamento'}
          </button>
        </>
      }
    >
      {data.members.length === 0 ? (
        <div className="notice warn">Cadastre os membros primeiro (menu Membros) para registrar pagamentos.</div>
      ) : (
        <div className="form-grid">
          <Field label="Referente a" full>
            <select className="select" value={chargeId} onChange={(e) => setChargeId(e.target.value)}>
              <option value="">Avulso (sem cobrança específica)</option>
              {openCharges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Quem pagou" full>
            <select className="select" value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Selecione…</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {charge && !charge.memberIds.includes(m.id) ? ' (não está nesta cobrança)' : ''}
                </option>
              ))}
            </select>
          </Field>
          {balance && (
            <div className="full notice info" style={{ alignItems: 'center' }}>
              <div className="grow">
                Devido {money(balance.due)} · Já pago {money(balance.paid)} · <b>Falta {money(balance.remaining)}</b>
              </div>
              {balance.remaining > 0 && (
                <button type="button" className="btn btn-sm" onClick={() => setAmount(moneyInput(balance.remaining))}>
                  Quitar
                </button>
              )}
            </div>
          )}
          <Field label="Valor">
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="Data do pagamento">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Forma de pagamento" full>
            <MethodPicker value={method} onChange={setMethod} />
          </Field>
          <Field label="Observação (opcional)" full>
            <input
              className="input"
              placeholder="Ex.: comprovante enviado no WhatsApp, 2ª parcela…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>
      )}
    </Modal>
  );
}

// ============ Despesa ============
export function ExpenseForm(props: { data: Data; expense?: Expense; onClose: () => void }) {
  const { data, expense } = props;
  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? moneyInput(expense.amount) : '');
  const [category, setCategory] = useState(expense?.category ?? data.settings.expenseCategories[0] ?? 'Outros');
  const [method, setMethod] = useState<PaymentMethod>(expense?.method ?? 'pix');
  const [chargeId, setChargeId] = useState(expense?.chargeId ?? '');
  const [date, setDate] = useState(expense?.date ?? today());
  const [busy, setBusy] = useState(false);
  const cents = parseMoney(amount);
  const valid = description.trim() && cents > 0 && date;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const ok = await run(
      () =>
        save('expenses', {
          id: expense?.id ?? uid(),
          description: description.trim(),
          amount: cents,
          category,
          method,
          chargeId: chargeId || null,
          date,
          createdAt: expense?.createdAt ?? Date.now(),
          createdBy: expense?.createdBy,
        }),
      expense ? 'Despesa atualizada' : 'Despesa registrada',
    );
    setBusy(false);
    if (ok) props.onClose();
  };

  return (
    <Modal
      title={expense ? 'Editar despesa' : 'Nova despesa'}
      onClose={props.onClose}
      footer={
        <>
          <button className="btn" onClick={props.onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!valid || busy} onClick={submit}>
            Salvar
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Descrição" full>
          <input
            className="input"
            autoFocus
            placeholder="Ex.: Ônibus para o Campori"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Valor">
          <MoneyInput value={amount} onChange={setAmount} />
        </Field>
        <Field label="Data">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Categoria">
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {[...new Set([...data.settings.expenseCategories, category])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Evento relacionado">
          <select className="select" value={chargeId} onChange={(e) => setChargeId(e.target.value)}>
            <option value="">Nenhum</option>
            {data.charges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pago com" full>
          <MethodPicker value={method} onChange={setMethod} />
        </Field>
      </div>
    </Modal>
  );
}

// ============ Cobrança ============
export function ChargeForm(props: { data: Data; charge?: Charge; onClose: (saved?: Charge) => void }) {
  const { data, charge } = props;
  const [title, setTitle] = useState(charge?.title ?? '');
  const [amount, setAmount] = useState(charge ? moneyInput(charge.amount) : '');
  const [dueDate, setDueDate] = useState(charge?.dueDate ?? '');
  const [notes, setNotes] = useState(charge?.notes ?? '');
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(charge?.memberIds ?? data.members.filter((m) => m.active).map((m) => m.id)),
  );
  const [custom, setCustom] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(charge?.customAmounts ?? {}).map(([k, v]) => [k, moneyInput(v)])),
  );
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  const cents = parseMoney(amount);
  const valid = title.trim() && cents >= 0 && !Number.isNaN(cents) && selected.size > 0;
  const unitById = new Map(data.units.map((u) => [u.id, u]));
  const candidates = data.members
    .filter((m) => m.active || selected.has(m.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const visible = candidates.filter((m) => !q || normalize(m.name).includes(normalize(q)));

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const setMany = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
    });

  const expected = [...selected].reduce((s, id) => {
    const c = parseMoney(custom[id] ?? '');
    return s + (Number.isNaN(c) ? cents || 0 : c);
  }, 0);

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const customAmounts: Record<string, number> = {};
    for (const [id, v] of Object.entries(custom)) {
      const c = parseMoney(v);
      if (selected.has(id) && !Number.isNaN(c) && c !== cents) customAmounts[id] = c;
    }
    const item: Charge = {
      id: charge?.id ?? uid(),
      title: title.trim(),
      amount: cents,
      dueDate: dueDate || undefined,
      memberIds: [...selected],
      customAmounts,
      notes: notes.trim(),
      archived: charge?.archived ?? false,
      createdAt: charge?.createdAt ?? Date.now(),
    };
    const ok = await run(() => save('charges', item), charge ? 'Cobrança atualizada' : 'Cobrança criada');
    setBusy(false);
    if (ok) props.onClose(item);
  };

  return (
    <Modal
      wide
      title={charge ? 'Editar cobrança' : 'Nova cobrança'}
      onClose={() => props.onClose()}
      footer={
        <>
          <span className="small muted grow">
            {selected.size} pessoa(s) · Total previsto <b>{money(expected)}</b>
          </span>
          <button className="btn" onClick={() => props.onClose()}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!valid || busy} onClick={submit}>
            Salvar cobrança
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <div className="form-grid">
          <Field label="Nome da cobrança" full>
            <input
              className="input"
              autoFocus
              placeholder="Ex.: Campori 2027, Mensalidade de março, Camiseta do clube"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field label="Valor por pessoa">
            <MoneyInput value={amount} onChange={setAmount} />
          </Field>
          <Field label="Vencimento (opcional)">
            <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label="Observações (opcional)" full>
            <input
              className="input"
              placeholder="Ex.: pode ser parcelado em até 3x"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        <div>
          <div className="row-between wrap" style={{ marginBottom: 8 }}>
            <b className="small">Quem deve pagar</b>
            <div className="chips">
              <button type="button" className="chip" onClick={() => setMany(candidates.map((m) => m.id), true)}>
                Todos
              </button>
              <button type="button" className="chip" onClick={() => setSelected(new Set())}>
                Nenhum
              </button>
              {data.activeUnits.map((u) => {
                const ids = candidates.filter((m) => m.unitId === u.id).map((m) => m.id);
                if (!ids.length) return null;
                return (
                  <button type="button" key={u.id} className="chip" onClick={() => setMany(ids, true)}>
                    <UnitLogo unit={u} size={20} />+ {u.name}
                  </button>
                );
              })}
            </div>
          </div>
          {candidates.length === 0 ? (
            <div className="notice warn">Nenhum membro cadastrado. Cadastre os membros primeiro no menu Membros.</div>
          ) : (
            <>
              <div className="search" style={{ marginBottom: 8 }}>
                <Search />
                <input className="input" placeholder="Buscar pessoa…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="check-list">
                {visible.map((m) => (
                  <label key={m.id} className="check-row">
                    <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} />
                    <span className="grow">{m.name}</span>
                    <span className="hide-sm small">
                      <UnitChip unit={m.unitId ? unitById.get(m.unitId) : undefined} />
                    </span>
                    {selected.has(m.id) && (
                      <div className="input-money" style={{ width: 130 }} onClick={(e) => e.preventDefault()}>
                        <input
                          className="input"
                          style={{ height: 34 }}
                          inputMode="decimal"
                          placeholder={moneyInput(cents || 0)}
                          title="Valor diferente para esta pessoa (desconto, bolsa…)"
                          value={custom[m.id] ?? ''}
                          onChange={(e) => setCustom({ ...custom, [m.id]: e.target.value.replace(/[^\d.,]/g, '') })}
                        />
                      </div>
                    )}
                  </label>
                ))}
              </div>
              <p className="tiny" style={{ marginTop: 6 }}>
                Dica: para dar desconto ou bolsa a alguém, digite um valor diferente ao lado do nome.
                {charge && ` Valor padrão atual: ${money(amountFor(charge, ''))}.`}
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

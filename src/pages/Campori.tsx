import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, ClipboardList, ListChecks, Pencil, Plus, Search, Tent, Trash2 } from 'lucide-react';
import type { CampActivity } from '../types';
import { removeItem, save } from '../data/store';
import { dateBR, normalize, today, uid } from '../lib/format';
import { Bar, Field, Modal, UnitChip, confirmDialog, run, toast } from '../components/ui';
import type { PageProps } from './types';

export const CAMP_CATEGORIES = [
  'Atividade oficial',
  'Treinamento',
  'Inscrição e documentação',
  'Uniformes',
  'Barracas e equipamentos',
  'Alimentação e cozinha',
  'Transporte',
  'Programação e ensaios',
  'Classes e especialidades',
  'Arrecadação',
  'Outros',
];

const CATEGORY_TONE: Record<string, string> = {
  'Atividade oficial': 'tone-amber',
  Treinamento: 'tone-blue',
};

type View = 'pendentes' | 'concluidas' | 'todas';
type Phase = 'preparacao' | 'evento';

const PHASES: Record<Phase, { title: string; subtitle: string; empty: string; icon: typeof Tent }> = {
  preparacao: {
    title: 'Preparação',
    subtitle: 'O que precisa ser feito até o Campori',
    empty: 'Ex.: inscrições, uniformes, barracas, transporte, treinamentos…',
    icon: ClipboardList,
  },
  evento: {
    title: 'No Campori',
    subtitle: 'O que precisa ser feito durante o Campori',
    empty: 'Ex.: montar o acampamento, atividades oficiais, escalas de cozinha e limpeza, desfile, inspeção…',
    icon: Tent,
  },
};

function daysUntil(iso: string) {
  const t = new Date(iso + 'T00:00:00').getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((t - now.getTime()) / 86400000);
}

export default function Campori({ data }: PageProps) {
  const [form, setForm] = useState<{ item?: CampActivity; phase?: Phase } | null>(null);
  const [view, setView] = useState<View>('pendentes');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const unitById = new Map(data.units.map((u) => [u.id, u]));
  const now = today();

  const all = data.campori;
  const done = all.filter((a) => a.done).length;
  const late = all.filter((a) => !a.done && a.dueDate && a.dueDate < now).length;
  const pct = all.length ? Math.round((done / all.length) * 100) : 0;
  const { eventName, eventDate } = data.settings;
  const days = eventDate ? daysUntil(eventDate) : null;

  const list = useMemo(
    () =>
      all
        .filter(
          (a) =>
            (view === 'todas' || (view === 'concluidas' ? a.done : !a.done)) &&
            (!category || a.category === category) &&
            (!q || normalize(`${a.title} ${a.description ?? ''} ${a.responsible ?? ''}`).includes(normalize(q))),
        )
        .sort((a, b) =>
          a.done !== b.done
            ? Number(a.done) - Number(b.done)
            : a.done
              ? (b.doneAt ?? 0) - (a.doneAt ?? 0)
              : (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.createdAt - b.createdAt,
        ),
    [all, view, category, q],
  );

  const categories = [...new Set([...CAMP_CATEGORIES, ...all.map((a) => a.category)])];

  const toggle = (a: CampActivity) =>
    run(
      () =>
        save('campori', {
          ...a,
          done: !a.done,
          doneAt: !a.done ? Date.now() : undefined,
          doneBy: !a.done ? data.userEmail : undefined,
        }),
      a.done ? 'Atividade reaberta' : '✅ Atividade concluída',
    );

  const del = async (a: CampActivity) => {
    if (await confirmDialog('Excluir atividade?', `"${a.title}" irá para a lixeira.`, { ok: 'Excluir' }))
      run(() => removeItem('campori', a.id), 'Atividade excluída');
  };

  const phaseOf = (a: CampActivity): Phase => a.phase ?? 'preparacao';
  const stats = (ph: Phase) => {
    const items = all.filter((a) => phaseOf(a) === ph);
    return { total: items.length, done: items.filter((a) => a.done).length };
  };

  const renderItem = (a: CampActivity) => {
    const isLate = !a.done && !!a.dueDate && a.dueDate < now;
    const unit = a.unitId ? unitById.get(a.unitId) : undefined;
    return (
      <div key={a.id} className={`camp-item ${a.done ? 'done' : ''}`}>
        <button
          className="camp-check"
          onClick={() => toggle(a)}
          aria-label={a.done ? 'Marcar como pendente' : 'Marcar como concluída'}
          title={a.done ? 'Marcar como pendente' : 'Marcar como concluída'}
        >
          {a.done ? <CheckCircle2 /> : <Circle />}
        </button>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="camp-title">{a.title}</div>
          {a.description && <div className="small muted camp-desc">{a.description}</div>}
          <div className="camp-meta">
            <span className={`badge ${CATEGORY_TONE[a.category] ?? 'neutral'}`}>{a.category}</span>
            {unit && <UnitChip unit={unit} />}
            {a.responsible && <span>👤 {a.responsible}</span>}
            {a.dueDate && !a.done && (
              <span className={isLate ? 'down' : ''}>
                <CalendarClock size={13} style={{ verticalAlign: -2 }} /> {isLate ? 'Atrasada · ' : phaseOf(a) === 'evento' ? 'Dia ' : 'Até '}
                {dateBR(a.dueDate)}
              </span>
            )}
            {a.done && a.doneAt && <span className="up">Concluída em {new Date(a.doneAt).toLocaleDateString('pt-BR')}</span>}
          </div>
        </div>
        <div className="row" style={{ gap: 2 }}>
          <button className="icon-btn" aria-label="Editar" title="Editar atividade" onClick={() => setForm({ item: a })}>
            <Pencil />
          </button>
          <button className="icon-btn danger" aria-label="Excluir atividade" title="Excluir atividade" onClick={() => del(a)}>
            <Trash2 />
          </button>
        </div>
      </div>
    );
  };

  const renderSection = (ph: Phase) => {
    const info = PHASES[ph];
    const st = stats(ph);
    const items = list.filter((a) => phaseOf(a) === ph);
    const Icon = info.icon;
    return (
      <div className="card camp-section" key={ph}>
        <div className="camp-section-head">
          <div className={`camp-section-icon ${ph}`}>
            <Icon />
          </div>
          <div className="grow" style={{ minWidth: 0 }}>
            <h2 className="camp-section-title">{info.title}</h2>
            <p className="small muted">{info.subtitle}</p>
          </div>
          <span className="camp-section-count" title="Concluídas / total">
            {st.done}/{st.total}
          </span>
          <button className="btn btn-sm" onClick={() => setForm({ phase: ph })}>
            <Plus /> Adicionar
          </button>
        </div>
        {st.total > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <Bar pct={(st.done / st.total) * 100} color={ph === 'evento' ? 'var(--info)' : undefined} />
          </div>
        )}
        {items.length === 0 ? (
          <div className="camp-empty small muted">
            {st.total === 0 ? info.empty : view === 'pendentes' ? 'Tudo concluído nesta etapa! 🎉' : 'Nenhuma atividade com esse filtro.'}
          </div>
        ) : (
          <div className="camp-list">{items.map(renderItem)}</div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Atividades Campori</h1>
          <p className="page-sub">
            Preparação e programação do {eventName || 'Campori'}
            {days !== null && days >= 0 && ` · faltam ${days} dia${days === 1 ? '' : 's'}`}.
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-primary" onClick={() => setForm({})}>
            <Plus /> Nova atividade
          </button>
        </div>
      </div>

      <div className="card card-pad camp-progress" style={{ marginBottom: 18 }}>
        <div className="camp-progress-main">
          <div className="camp-pct">{pct}%</div>
          <div className="grow">
            <div className="row-between small" style={{ marginBottom: 8 }}>
              <b>
                {done} de {all.length} atividade(s) concluída(s)
              </b>
              {late > 0 && (
                <span className="down">
                  <AlertTriangle size={14} style={{ verticalAlign: -2 }} /> {late} atrasada(s)
                </span>
              )}
            </div>
            <Bar lg pct={pct} />
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="toolbar" style={{ borderBottom: 0 }}>
          <div className="search">
            <Search />
            <input className="input" placeholder="Buscar atividade ou responsável…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <div className="segmented">
            <button className={view === 'pendentes' ? 'on' : ''} onClick={() => setView('pendentes')}>
              Pendentes ({all.length - done})
            </button>
            <button className={view === 'concluidas' ? 'on' : ''} onClick={() => setView('concluidas')}>
              Concluídas ({done})
            </button>
            <button className={view === 'todas' ? 'on' : ''} onClick={() => setView('todas')}>
              Todas
            </button>
          </div>
        </div>
      </div>

      <div className="stack">
        {renderSection('preparacao')}
        {renderSection('evento')}
      </div>

      {form && <ActivityForm data={data} item={form.item} phase={form.phase} onClose={() => setForm(null)} />}
    </div>
  );
}

function ActivityForm({
  data,
  item,
  phase: presetPhase,
  onClose,
}: {
  data: PageProps['data'];
  item?: CampActivity;
  phase?: Phase;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(item?.phase ?? presetPhase ?? 'preparacao');
  const [title, setTitle] = useState(item?.title ?? '');
  const [description, setDescription] = useState(item?.description ?? '');
  const [category, setCategory] = useState(item?.category ?? CAMP_CATEGORIES[0]);
  const [responsible, setResponsible] = useState(item?.responsible ?? '');
  const [unitId, setUnitId] = useState(item?.unitId ?? '');
  const [dueDate, setDueDate] = useState(item?.dueDate ?? '');
  const [done, setDone] = useState(item?.done ?? false);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    if (!item) return;
    if (await confirmDialog('Excluir atividade?', `"${item.title}" será excluída e ficará na lixeira por segurança.`, { ok: 'Excluir' })) {
      const ok = await run(() => removeItem('campori', item.id), 'Atividade excluída');
      if (ok) onClose();
    }
  };

  const submit = async () => {
    if (!title.trim()) return toast('Dê um nome para a atividade', true);
    setBusy(true);
    const becameDone = done && !item?.done;
    const ok = await run(
      () =>
        save('campori', {
          id: item?.id ?? uid(),
          title: title.trim(),
          description: description.trim(),
          category,
          phase,
          responsible: responsible.trim(),
          unitId: unitId || null,
          dueDate: dueDate || undefined,
          done,
          doneAt: done ? (becameDone ? Date.now() : item?.doneAt) : undefined,
          doneBy: done ? (becameDone ? data.userEmail : item?.doneBy) : undefined,
          createdAt: item?.createdAt ?? Date.now(),
          createdBy: item?.createdBy ?? data.userEmail,
        }),
      item ? 'Atividade atualizada' : 'Atividade criada',
    );
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal
      title={item ? 'Editar atividade' : phase === 'evento' ? 'Nova atividade — No Campori' : 'Nova atividade — Preparação'}
      onClose={onClose}
      footer={
        <>
          {item && (
            <button className="btn btn-danger-soft" style={{ marginRight: 'auto' }} onClick={remove}>
              <Trash2 /> Excluir atividade
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={busy || !title.trim()} onClick={submit}>
            {item ? 'Salvar' : 'Criar atividade'}
          </button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Atividade" full>
          <input
            className="input"
            autoFocus
            placeholder="Ex.: Conferir barracas e lonas"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Quando" full>
          <div className="segmented">
            <button type="button" className={phase === 'preparacao' ? 'on' : ''} onClick={() => setPhase('preparacao')}>
              <ClipboardList /> Preparação (antes)
            </button>
            <button type="button" className={phase === 'evento' ? 'on' : ''} onClick={() => setPhase('evento')}>
              <Tent /> No Campori (durante)
            </button>
          </div>
        </Field>
        <Field label="Detalhes (opcional)" full>
          <textarea
            className="textarea"
            placeholder="O que precisa ser feito, materiais, observações…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Categoria">
          <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {[...new Set([...CAMP_CATEGORIES, category])].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label={phase === 'evento' ? 'Dia (opcional)' : 'Prazo (opcional)'}>
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <Field label="Responsável (opcional)">
          <input className="input" placeholder="Nome de quem cuida" value={responsible} onChange={(e) => setResponsible(e.target.value)} />
        </Field>
        <Field label="Unidade (opcional)">
          <select className="select" value={unitId} onChange={(e) => setUnitId(e.target.value)}>
            <option value="">Clube todo</option>
            {data.activeUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <label className="check-row full" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
          <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
          <ListChecks size={18} /> Atividade concluída
        </label>
      </div>
    </Modal>
  );
}

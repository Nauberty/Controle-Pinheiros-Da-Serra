import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, ListChecks, Pencil, Plus, Search, Tent, Trash2 } from 'lucide-react';
import type { CampActivity } from '../types';
import { removeItem, save } from '../data/store';
import { dateBR, normalize, today, uid } from '../lib/format';
import { Bar, Empty, Field, Modal, UnitChip, confirmDialog, run, toast } from '../components/ui';
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

function daysUntil(iso: string) {
  const t = new Date(iso + 'T00:00:00').getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((t - now.getTime()) / 86400000);
}

export default function Campori({ data }: PageProps) {
  const [form, setForm] = useState<{ item?: CampActivity } | null>(null);
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

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Atividades Campori</h1>
          <p className="page-sub">
            Tudo o que precisa ser feito até o {eventName || 'Campori'}
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

      <div className="card">
        <div className="toolbar">
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

        {list.length === 0 ? (
          <Empty
            icon={all.length && view === 'pendentes' ? CheckCircle2 : Tent}
            title={
              !all.length ? 'Nenhuma atividade criada' : view === 'pendentes' ? 'Tudo concluído! 🎉' : 'Nenhuma atividade encontrada'
            }
            text={!all.length ? 'Crie a lista de tarefas para o Campori: inscrições, uniformes, barracas, transporte…' : undefined}
            action={
              !all.length && (
                <button className="btn btn-primary" onClick={() => setForm({})}>
                  <Plus /> Criar primeira atividade
                </button>
              )
            }
          />
        ) : (
          <div className="camp-list">
            {list.map((a) => {
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
                          <CalendarClock size={13} style={{ verticalAlign: -2 }} /> {isLate ? 'Atrasada · ' : 'Até '}
                          {dateBR(a.dueDate)}
                        </span>
                      )}
                      {a.done && a.doneAt && (
                        <span className="up">Concluída em {new Date(a.doneAt).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 2 }}>
                    <button className="icon-btn" aria-label="Editar" onClick={() => setForm({ item: a })}>
                      <Pencil />
                    </button>
                    <button className="icon-btn danger" aria-label="Excluir atividade" title="Excluir atividade" onClick={() => del(a)}>
                      <Trash2 />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {form && <ActivityForm data={data} item={form.item} onClose={() => setForm(null)} />}
    </div>
  );
}

function ActivityForm({ data, item, onClose }: { data: PageProps['data']; item?: CampActivity; onClose: () => void }) {
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
      title={item ? 'Editar atividade' : 'Nova atividade do Campori'}
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
        <Field label="Prazo (opcional)">
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

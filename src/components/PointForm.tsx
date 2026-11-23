import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { PointEntry } from '../types';
import type { Data } from '../data/store';
import { save } from '../data/store';
import { today, uid } from '../lib/format';
import { Field, Modal, UnitLogo, run } from './ui';

const QUICK = [5, 10, 20, 50, 100];

export default function PointForm(props: { data: Data; entry?: PointEntry; presetUnit?: string; onClose: () => void }) {
  const { data, entry } = props;
  const [unitIds, setUnitIds] = useState<string[]>(entry ? [entry.unitId] : props.presetUnit ? [props.presetUnit] : []);
  const [kind, setKind] = useState<'gain' | 'loss'>(entry && entry.points < 0 ? 'loss' : 'gain');
  const [value, setValue] = useState(entry ? String(Math.abs(entry.points)) : '');
  const [category, setCategory] = useState(entry?.category ?? data.settings.pointCategories[0] ?? 'Outros');
  const [description, setDescription] = useState(entry?.description ?? '');
  const [date, setDate] = useState(entry?.date ?? today());
  const [busy, setBusy] = useState(false);

  const n = Math.abs(parseInt(value, 10));
  const valid = unitIds.length > 0 && n > 0 && !!date;

  const toggleUnit = (id: string) => {
    if (entry) return setUnitIds([id]); // ao editar, apenas uma unidade
    setUnitIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    const points = kind === 'gain' ? n : -n;
    const ok = await run(
      () =>
        Promise.all(
          unitIds.map((unitId) =>
            save('points', {
              id: entry?.id ?? uid(),
              unitId,
              points,
              category,
              description: description.trim(),
              date,
              createdAt: entry?.createdAt ?? Date.now(),
              createdBy: entry?.createdBy,
            }),
          ),
        ),
      entry ? 'Lançamento atualizado' : `${kind === 'gain' ? '+' : '-'}${n} pontos lançados`,
    );
    setBusy(false);
    if (ok) props.onClose();
  };

  return (
    <Modal
      title={entry ? 'Editar lançamento' : 'Lançar pontos'}
      onClose={props.onClose}
      footer={
        <>
          <button className="btn" onClick={props.onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={!valid || busy} onClick={submit}>
            {entry ? 'Salvar alterações' : 'Lançar pontos'}
          </button>
        </>
      }
    >
      <div className="stack" style={{ gap: 16 }}>
        <Field label={entry ? 'Unidade' : 'Unidade(s) — pode escolher mais de uma'}>
          <div className="chips">
            {data.activeUnits.map((u) => (
              <button
                type="button"
                key={u.id}
                className={`chip ${unitIds.includes(u.id) ? 'on' : ''}`}
                onClick={() => toggleUnit(u.id)}
              >
                <UnitLogo unit={u} size={22} />
                {u.name}
              </button>
            ))}
            {!entry && data.activeUnits.length > 1 && (
              <button
                type="button"
                className="chip"
                onClick={() =>
                  setUnitIds(unitIds.length === data.activeUnits.length ? [] : data.activeUnits.map((u) => u.id))
                }
              >
                {unitIds.length === data.activeUnits.length ? 'Limpar' : 'Todas'}
              </button>
            )}
          </div>
        </Field>

        <div className="form-grid">
          <Field label="Tipo">
            <div className="segmented">
              <button type="button" className={kind === 'gain' ? 'on gain' : ''} onClick={() => setKind('gain')}>
                <Plus /> Ganhou
              </button>
              <button type="button" className={kind === 'loss' ? 'on loss' : ''} onClick={() => setKind('loss')}>
                <Minus /> Perdeu
              </button>
            </div>
          </Field>
          <Field label="Pontos">
            <input
              className="input"
              inputMode="numeric"
              placeholder="Ex.: 10"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        </div>
        <div className="chips">
          {QUICK.map((q) => (
            <button type="button" key={q} className={`chip ${n === q ? 'on' : ''}`} onClick={() => setValue(String(q))}>
              {kind === 'gain' ? '+' : '−'}
              {q}
            </button>
          ))}
        </div>

        <div className="form-grid">
          <Field label="Categoria">
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {[...new Set([...data.settings.pointCategories, category])].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Data">
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Descrição (opcional)" full>
            <input
              className="input"
              placeholder="Ex.: Todos com uniforme completo na reunião"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

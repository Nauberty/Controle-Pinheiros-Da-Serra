import { useMemo, useState } from 'react';
import { Crown, Download, Pencil, Plus, Search, Trash2, Trophy } from 'lucide-react';
import type { PointEntry } from '../types';
import { removeItem } from '../data/store';
import { byCategory, ranking } from '../lib/points';
import { dateBR, monthKey, monthLabel, normalize, signed } from '../lib/format';
import { downloadCSV } from '../lib/download';
import { Bar, Empty, UnitChip, confirmDialog, run } from '../components/ui';
import PointForm from '../components/PointForm';
import type { PageProps } from './types';

export default function Pontuacao({ data }: PageProps) {
  const [form, setForm] = useState<{ entry?: PointEntry; unit?: string } | null>(null);
  const [unitFilter, setUnitFilter] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [q, setQ] = useState('');

  const rank = useMemo(() => ranking(data.activeUnits, data.points), [data.activeUnits, data.points]);
  const max = Math.max(1, ...rank.map((r) => Math.abs(r.total)));
  const unitById = new Map(data.units.map((u) => [u.id, u]));

  const months = useMemo(
    () => [...new Set(data.points.map((p) => monthKey(p.date)))].sort().reverse(),
    [data.points],
  );
  const categories = [...new Set([...data.settings.pointCategories, ...data.points.map((p) => p.category)])];

  const filtered = useMemo(
    () =>
      data.points
        .filter(
          (p) =>
            (!unitFilter || p.unitId === unitFilter) &&
            (!catFilter || p.category === catFilter) &&
            (!monthFilter || monthKey(p.date) === monthFilter) &&
            (!q || normalize(`${p.description} ${p.category}`).includes(normalize(q))),
        )
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [data.points, unitFilter, catFilter, monthFilter, q],
  );
  const filteredTotal = filtered.reduce((s, p) => s + p.points, 0);
  const catBreakdown = useMemo(
    () => byCategory(unitFilter ? data.points.filter((p) => p.unitId === unitFilter) : data.points),
    [data.points, unitFilter],
  );
  const catMax = Math.max(1, ...catBreakdown.map((c) => Math.abs(c.total)));

  const del = async (p: PointEntry) => {
    const ok = await confirmDialog(
      'Excluir lançamento?',
      `${signed(p.points)} pontos para ${unitById.get(p.unitId)?.name ?? 'unidade'} em ${dateBR(p.date)}. Essa ação não pode ser desfeita.`,
      { ok: 'Excluir' },
    );
    if (ok) run(() => removeItem('points', p.id), 'Lançamento excluído');
  };

  const exportCSV = () =>
    downloadCSV('pontuacao-unidades.csv', [
      ['Data', 'Unidade', 'Pontos', 'Categoria', 'Descrição', 'Lançado por'],
      ...filtered.map((p) => [dateBR(p.date), unitById.get(p.unitId)?.name ?? '', p.points, p.category, p.description, p.createdBy ?? '']),
    ]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Pontuação das Unidades</h1>
          <p className="page-sub">Ranking atualizado automaticamente a cada lançamento.</p>
        </div>
        <div className="head-actions">
          <button className="btn" onClick={exportCSV} disabled={!filtered.length}>
            <Download /> Exportar
          </button>
          <button className="btn btn-primary" onClick={() => setForm({})}>
            <Plus /> Lançar pontos
          </button>
        </div>
      </div>

      <div className="rank-grid" style={{ marginBottom: 22 }}>
        {rank.map((r) => (
          <div
            key={r.unit.id}
            className="card rank-card"
            style={{ ['--unit' as string]: r.unit.color, cursor: 'pointer' }}
            onClick={() => setUnitFilter(unitFilter === r.unit.id ? '' : r.unit.id)}
            title="Clique para filtrar o histórico"
          >
            <div className="row-between">
              <span className={`rank-pos ${r.position === 1 && r.total > 0 ? 'first' : ''}`}>
                {r.position === 1 && r.total > 0 && <Crown size={14} />}
                {r.position}º lugar
              </span>
              <button
                className="icon-btn"
                aria-label={`Lançar pontos para ${r.unit.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setForm({ unit: r.unit.id });
                }}
              >
                <Plus />
              </button>
            </div>
            <div className="rank-name">
              <span className="dot" />
              {r.unit.name}
            </div>
            <div className="rank-points">
              {r.total}
              <small>pts</small>
            </div>
            <div style={{ marginTop: 12 }}>
              <Bar pct={(Math.max(0, r.total) / max) * 100} color={r.unit.color} />
            </div>
            <div className="rank-meta">
              <span className="up">+{r.gained}</span>
              <span className="down">{r.lost}</span>
              <span>· 30 dias: {signed(r.last30)}</span>
            </div>
            {unitFilter === r.unit.id && <div className="tiny" style={{ marginTop: 6 }}>Filtrando histórico ✓</div>}
          </div>
        ))}
      </div>

      <div className="grid split">
        <div className="card" style={{ minWidth: 0 }}>
          <div className="toolbar">
            <div className="search">
              <Search />
              <input className="input" placeholder="Buscar na descrição…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="select" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
              <option value="">Todas as unidades</option>
              {data.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            <select className="select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select className="select" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="">Todos os meses</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <Empty
              icon={Trophy}
              title={data.points.length ? 'Nenhum lançamento encontrado' : 'Nenhum ponto lançado ainda'}
              text={data.points.length ? 'Ajuste os filtros acima.' : 'Comece lançando os pontos da última reunião.'}
              action={
                !data.points.length && (
                  <button className="btn btn-primary" onClick={() => setForm({})}>
                    <Plus /> Lançar pontos
                  </button>
                )
              }
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Unidade</th>
                    <th>Categoria</th>
                    <th className="hide-sm">Descrição</th>
                    <th className="num">Pontos</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{dateBR(p.date)}</td>
                      <td>
                        <UnitChip unit={unitById.get(p.unitId)} />
                      </td>
                      <td>{p.category}</td>
                      <td className="hide-sm muted">{p.description || '—'}</td>
                      <td className="num">
                        <span className={`pts ${p.points >= 0 ? 'up' : 'down'}`}>{signed(p.points)}</span>
                      </td>
                      <td className="actions">
                        <button className="icon-btn" aria-label="Editar" onClick={() => setForm({ entry: p })}>
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
          )}
          {filtered.length > 0 && (
            <div className="row-between small muted" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <span>{filtered.length} lançamento(s)</span>
              <span>
                Saldo do filtro: <b className={filteredTotal >= 0 ? 'up' : 'down'}>{signed(filteredTotal)} pts</b>
              </span>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <Trophy /> Por categoria
            </div>
            <span className="tiny">{unitFilter ? unitById.get(unitFilter)?.name : 'Todas as unidades'}</span>
          </div>
          <div className="card-body">
            {catBreakdown.length === 0 ? (
              <p className="muted small">Sem lançamentos.</p>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                {catBreakdown.map((c) => (
                  <div key={c.category}>
                    <div className="row-between small" style={{ marginBottom: 5 }}>
                      <span>{c.category}</span>
                      <b className={c.total >= 0 ? 'up' : 'down'}>{signed(c.total)}</b>
                    </div>
                    <Bar
                      pct={(Math.abs(c.total) / catMax) * 100}
                      color={c.total >= 0 ? 'var(--forest-600)' : 'var(--danger)'}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {form && <PointForm data={data} entry={form.entry} presetUnit={form.unit} onClose={() => setForm(null)} />}
    </div>
  );
}

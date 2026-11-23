import { useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpCircle,
  CalendarClock,
  Download,
  ShieldAlert,
  Crown,
  HandCoins,
  Plus,
  Receipt,
  Trophy,
  Wallet,
} from 'lucide-react';
import { navigate } from '../lib/router';
import { ranking } from '../lib/points';
import { cashSummary, chargeSummary, methodLabel } from '../lib/finance';
import { dateShort, money, signed } from '../lib/format';
import { Bar, Empty, Stat, UnitLogo } from '../components/ui';
import PointForm from '../components/PointForm';
import { daysSinceBackup } from '../lib/backup';
import { downloadBackup } from './Configuracoes';
import { PaymentForm } from '../components/FinanceForms';
import type { PageProps } from './types';

function daysUntil(iso: string) {
  const target = new Date(iso + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export default function Dashboard({ data }: PageProps) {
  const [pointForm, setPointForm] = useState(false);
  const [payForm, setPayForm] = useState(false);

  const rank = useMemo(() => ranking(data.activeUnits, data.points), [data.activeUnits, data.points]);
  const max = Math.max(1, ...rank.map((r) => r.total));
  const cash = useMemo(
    () => cashSummary(data.payments, data.expenses, data.charges, data.members),
    [data.payments, data.expenses, data.charges, data.members],
  );
  const charges = data.charges
    .filter((c) => !c.archived)
    .map((c) => ({ charge: c, s: chargeSummary(c, data.members, data.payments) }));
  const unitById = new Map(data.units.map((u) => [u.id, u]));
  const memberById = new Map(data.members.map((m) => [m.id, m]));

  const activity = [
    ...data.points.map((p) => ({ kind: 'point' as const, at: p.createdAt, date: p.date, p })),
    ...data.payments.map((p) => ({ kind: 'pay' as const, at: p.createdAt, date: p.date, p })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 8);

  const { eventName, eventDate } = data.settings;
  const [, setTick] = useState(0);
  const backupDays = daysSinceBackup();
  const hasData = data.members.length + data.points.length + data.payments.length > 0;
  const backupDue = data.mode === 'local' && data.isExecutive && hasData && (backupDays === null || backupDays >= 7);
  const days = eventDate ? daysUntil(eventDate) : null;

  return (
    <div className="page">
      <div className="hero">
        <img src="./logo.png" alt="" />
        <div>
          <h1>{data.settings.clubName}</h1>
          <p>Clube de Desbravadores · Painel da diretoria</p>
        </div>
        {days !== null && days >= 0 && (
          <div className="countdown">
            <b>{days === 0 ? 'É hoje!' : `${days} dia${days === 1 ? '' : 's'}`}</b>
            <span>{days === 0 ? eventName : `para o ${eventName}`}</span>
          </div>
        )}
      </div>

      {backupDue && (
        <div className="notice warn" style={{ marginBottom: 22, alignItems: 'center' }}>
          <ShieldAlert />
          <div className="grow">
            <b>Faça um backup.</b>{' '}
            {backupDays === null ? 'Ainda não há nenhum backup neste aparelho.' : `O último backup foi há ${backupDays} dias.`} No modo local, os dados
            ficam só neste navegador.
          </div>
          <button
            className="btn btn-sm btn-primary"
            onClick={() => {
              downloadBackup();
              setTick((t) => t + 1);
            }}
          >
            <Download /> Baixar backup agora
          </button>
        </div>
      )}

      {data.isExecutive && (
        <div className="grid grid-4" style={{ marginBottom: 22 }}>
          <Stat icon={ArrowDownCircle} label="Entradas" value={money(cash.income)} />
          <Stat icon={ArrowUpCircle} tone="red" label="Saídas" value={money(cash.out)} />
          <Stat icon={Wallet} tone="blue" label="Saldo em caixa" value={money(cash.balance)} />
          <Stat icon={CalendarClock} tone="amber" label="A receber" value={money(cash.toReceive)} />
        </div>
      )}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* Ranking */}
        <div className={`card ${data.isExecutive ? '' : 'span-2'}`}>
          <div className="card-head">
            <div className="card-title">
              <Trophy /> Ranking das unidades
            </div>
            <button className="btn btn-sm" onClick={() => setPointForm(true)}>
              <Plus /> Pontos
            </button>
          </div>
          <div className="card-body">
            <div className="list">
              {rank.map((r) => (
                <div key={r.unit.id} className="list-item" style={{ ['--unit' as string]: r.unit.color }}>
                  <div
                    className="avatar"
                    style={{
                      background: r.position === 1 && r.total > 0 ? '#fdf3d7' : 'var(--surface-2)',
                      color: r.position === 1 && r.total > 0 ? '#b8860b' : 'var(--text-2)',
                      fontFamily: 'var(--display)',
                      fontSize: 16,
                    }}
                  >
                    {r.position === 1 && r.total > 0 ? <Crown /> : `${r.position}º`}
                  </div>
                  <div className="grow">
                    <div className="row-between" style={{ marginBottom: 6 }}>
                      <span className="unit-chip">
                        <UnitLogo unit={r.unit} size={30} />
                        <b style={{ fontWeight: 600 }}>{r.unit.name}</b>
                      </span>
                      <span className="pts">{r.total} pts</span>
                    </div>
                    <Bar pct={(Math.max(0, r.total) / max) * 100} color={r.unit.color} />
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('pontuacao')}>
              Ver histórico completo <ArrowRight />
            </button>
          </div>
        </div>

        {/* Cobranças (somente diretoria executiva) */}
        {data.isExecutive && (
        <div className="card">
          <div className="card-head">
            <div className="card-title">
              <Receipt /> Cobranças em andamento
            </div>
            <button className="btn btn-sm" onClick={() => setPayForm(true)}>
              <Plus /> Pagamento
            </button>
          </div>
          <div className="card-body">
            {charges.length === 0 ? (
              <Empty
                icon={Receipt}
                title="Nenhuma cobrança ativa"
                text="Crie a cobrança do Campori na Tesouraria."
                action={
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('tesouraria')}>
                    Ir para Tesouraria
                  </button>
                }
              />
            ) : (
              <div className="stack" style={{ gap: 20 }}>
                {charges.map(({ charge, s }) => (
                  <div key={charge.id}>
                    <div className="row-between" style={{ marginBottom: 6 }}>
                      <b>{charge.title}</b>
                      <span className="small">
                        <b>{money(s.received)}</b> <span className="muted">de {money(s.expected)}</span>
                      </span>
                    </div>
                    <Bar lg pct={s.pct} />
                    <div className="legend" style={{ marginTop: 8 }}>
                      <span>
                        <i style={{ background: 'var(--success)' }} />
                        {s.pago} pagos
                      </span>
                      <span>
                        <i style={{ background: 'var(--warning)' }} />
                        {s.parcial} parciais
                      </span>
                      <span>
                        <i style={{ background: 'var(--danger)' }} />
                        {s.pendente} pendentes
                      </span>
                      <span className="grow" style={{ textAlign: 'right' }}>
                        falta <b className="down">{money(s.remaining)}</b>
                      </span>
                    </div>
                  </div>
                ))}
                {cash.byMethod.length > 0 && (
                  <div className="row wrap" style={{ gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <span className="small muted">Recebido por forma:</span>
                    {cash.byMethod.map((m) => (
                      <span key={m.id} className={`badge method-${m.id}`}>
                        {m.label} · {money(m.total)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        )}

        {/* Atividade recente */}
        <div className="card span-2">
          <div className="card-head">
            <div className="card-title">
              <CalendarClock /> Últimos lançamentos
            </div>
          </div>
          <div className="card-body">
            {activity.length === 0 ? (
              <p className="muted small">Os lançamentos de pontos e pagamentos aparecerão aqui.</p>
            ) : (
              <div className="list">
                {activity.map((a) =>
                  a.kind === 'point' ? (
                    <div key={'p' + a.p.id} className="list-item">
                      <div className={`avatar ${a.p.points >= 0 ? 'tone-green' : 'tone-red'}`}>
                        <Trophy />
                      </div>
                      <div className="grow">
                        <div>
                          <b style={{ fontWeight: 600 }}>{unitById.get(a.p.unitId)?.name ?? 'Unidade'}</b>{' '}
                          <span className="muted">· {a.p.category}</span>
                        </div>
                        <div className="tiny">
                          {dateShort(a.date)}
                          {a.p.description && ` · ${a.p.description}`}
                        </div>
                      </div>
                      <span className={`pts ${a.p.points >= 0 ? 'up' : 'down'}`}>{signed(a.p.points)}</span>
                    </div>
                  ) : (
                    <div key={'m' + a.p.id} className="list-item">
                      <div className="avatar tone-blue">
                        <HandCoins />
                      </div>
                      <div className="grow">
                        <div>
                          <b style={{ fontWeight: 600 }}>{memberById.get(a.p.memberId)?.name ?? '—'}</b>{' '}
                          <span className="muted">
                            · {(a.p.chargeId && data.charges.find((c) => c.id === a.p.chargeId)?.title) || 'Avulso'}
                          </span>
                        </div>
                        <div className="tiny">
                          {dateShort(a.date)} · {methodLabel(a.p.method)}
                        </div>
                      </div>
                      <b className="up">{money(a.p.amount)}</b>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {pointForm && <PointForm data={data} onClose={() => setPointForm(false)} />}
      {payForm && <PaymentForm data={data} onClose={() => setPayForm(false)} />}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { CloudOff, Cloud, Download, KeyRound, Plus, Save, Shield, Trash2, Upload, X } from 'lucide-react';
import type { Access, AccessRole, DB, Settings, Unit } from '../types';
import { COLLECTIONS } from '../types';
import { replaceAll, save, snapshot } from '../data/store';
import { cloudEnabled, grantAccess, revokeAccess, setAccessRole, watchAccess } from '../data/cloud';
import { downloadFile } from '../lib/download';
import { today, uid } from '../lib/format';
import { Field, confirmDialog, run, toast } from '../components/ui';
import type { PageProps } from './types';

export default function Configuracoes({ data, user }: PageProps) {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-sub">Unidades, categorias, acesso da diretoria e backup.</p>
        </div>
      </div>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="stack">
          <ClubCard data={data} />
          <UnitsCard data={data} />
          <SyncCard data={data} />
        </div>
        <div className="stack">
          <CategoriesCard data={data} kind="pointCategories" title="Categorias de pontuação" />
          <CategoriesCard data={data} kind="expenseCategories" title="Categorias de despesas" />
          {cloudEnabled && user && <AccessCard currentEmail={user.email ?? ''} />}
          <BackupCard data={data} />
        </div>
      </div>
    </div>
  );
}

const saveSettings = (s: Settings, msg = 'Configurações salvas') => run(() => save('settings', s), msg);

function ClubCard({ data }: { data: PageProps['data'] }) {
  const [clubName, setClubName] = useState(data.settings.clubName);
  const [eventName, setEventName] = useState(data.settings.eventName);
  const [eventDate, setEventDate] = useState(data.settings.eventDate);
  const dirty =
    clubName !== data.settings.clubName || eventName !== data.settings.eventName || eventDate !== data.settings.eventDate;
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Clube e evento em destaque</div>
      </div>
      <div className="card-body form-grid">
        <Field label="Nome do clube" full>
          <input className="input" value={clubName} onChange={(e) => setClubName(e.target.value)} />
        </Field>
        <Field label="Evento (contagem regressiva)">
          <input className="input" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Campori" />
        </Field>
        <Field label="Data do evento">
          <input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </Field>
        <div className="full">
          <button
            className="btn btn-primary btn-sm"
            disabled={!dirty || !clubName.trim()}
            onClick={() => saveSettings({ ...data.settings, clubName: clubName.trim(), eventName: eventName.trim() || 'Campori', eventDate })}
          >
            <Save /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function UnitsCard({ data }: { data: PageProps['data'] }) {
  const [edits, setEdits] = useState<Record<string, Partial<Unit>>>({});
  const get = (u: Unit) => ({ ...u, ...edits[u.id] });
  const set = (id: string, patch: Partial<Unit>) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));
  const changed = Object.keys(edits);

  const saveAll = () =>
    run(async () => {
      for (const id of changed) {
        const u = data.units.find((x) => x.id === id);
        if (u) await save('units', { ...get(u), name: get(u).name.trim() || u.name });
      }
      setEdits({});
    }, 'Unidades salvas');

  const add = () =>
    run(
      () =>
        save('units', {
          id: uid(),
          name: `Unidade ${data.units.length + 1}`,
          color: '#6b7a70',
          order: Math.max(0, ...data.units.map((u) => u.order)) + 1,
          active: true,
        }),
      'Unidade criada',
    );

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Unidades</div>
        <button className="btn btn-sm btn-ghost" onClick={add}>
          <Plus /> Nova unidade
        </button>
      </div>
      <div className="card-body stack" style={{ gap: 10 }}>
        {data.units.map((raw) => {
          const u = get(raw);
          return (
            <div key={u.id} className="row" style={{ opacity: u.active ? 1 : 0.55 }}>
              <input
                type="color"
                className="color-input"
                value={u.color}
                onChange={(e) => set(u.id, { color: e.target.value })}
                aria-label="Cor da unidade"
              />
              <input className="input grow" value={u.name} onChange={(e) => set(u.id, { name: e.target.value })} />
              <label className="row small" style={{ gap: 6, whiteSpace: 'nowrap' }}>
                <input
                  type="checkbox"
                  checked={u.active}
                  onChange={(e) => set(u.id, { active: e.target.checked })}
                  style={{ accentColor: 'var(--forest-600)' }}
                />
                Ativa
              </label>
            </div>
          );
        })}
        <p className="tiny">Desmarque “Ativa” para tirar uma unidade do ranking sem apagar o histórico.</p>
        <div>
          <button className="btn btn-primary btn-sm" disabled={!changed.length} onClick={saveAll}>
            <Save /> Salvar unidades
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoriesCard({
  data,
  kind,
  title,
}: {
  data: PageProps['data'];
  kind: 'pointCategories' | 'expenseCategories';
  title: string;
}) {
  const [value, setValue] = useState('');
  const list = data.settings[kind];
  const add = () => {
    const v = value.trim();
    if (!v || list.includes(v)) return;
    saveSettings({ ...data.settings, [kind]: [...list, v] }, 'Categoria adicionada');
    setValue('');
  };
  const remove = (c: string) => saveSettings({ ...data.settings, [kind]: list.filter((x) => x !== c) }, 'Categoria removida');
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">{title}</div>
      </div>
      <div className="card-body stack" style={{ gap: 12 }}>
        <div className="chips">
          {list.map((c) => (
            <span key={c} className="chip" style={{ cursor: 'default' }}>
              {c}
              <button className="icon-btn" style={{ width: 20, height: 20 }} onClick={() => remove(c)} aria-label={`Remover ${c}`}>
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="row">
          <input
            className="input"
            placeholder="Nova categoria"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
          />
          <button className="btn" onClick={add} disabled={!value.trim()}>
            <Plus /> Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}

function SyncCard({ data }: { data: PageProps['data'] }) {
  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          {data.mode === 'cloud' ? <Cloud /> : <CloudOff />} Armazenamento dos dados
        </div>
      </div>
      <div className="card-body">
        {data.mode === 'cloud' ? (
          <div className="notice info">
            <Cloud />
            <div>
              <b>Online e compartilhado.</b> Todos os membros da diretoria com acesso veem os mesmos dados, em tempo real. Funciona
              também sem internet: as alterações são enviadas quando a conexão voltar.
            </div>
          </div>
        ) : (
          <div className="notice warn">
            <CloudOff />
            <div>
              <b>Modo local.</b> Os dados estão salvos <u>somente neste navegador</u>. Para que toda a diretoria use os mesmos dados,
              configure o banco online gratuito (passo a passo no arquivo <code>docs/CONFIGURAR-FIREBASE.md</code> do repositório). Até
              lá, faça backups com frequência. Os logins e os níveis de acesso (diretoria executiva e regular) passam a valer no
              modo online.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ROLE_INFO: Record<AccessRole, { label: string; text: string }> = {
  executiva: { label: 'Diretoria executiva', text: 'Acesso total: pontuação, membros, tesouraria e configurações.' },
  regular: { label: 'Diretoria regular', text: 'Pontuação e controle de membros. Não vê a tesouraria.' },
};

function AccessCard({ currentEmail }: { currentEmail: string }) {
  const [list, setList] = useState<Access[]>([]);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<AccessRole>('regular');
  useEffect(() => watchAccess(setList, () => {}), []);
  const me = currentEmail.toLowerCase();
  const sorted = [...list].sort(
    (a, b) => Number(b.role === 'executiva') - Number(a.role === 'executiva') || (a.name || a.id).localeCompare(b.name || b.id),
  );

  const add = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast('Digite um e-mail válido', true);
    const ok = await run(() => grantAccess(email, name, role), 'Acesso liberado');
    if (ok) {
      setEmail('');
      setName('');
    }
  };
  const remove = async (a: Access) => {
    if (a.id === me) return toast('Você não pode remover o seu próprio acesso.', true);
    if (await confirmDialog('Remover acesso?', `${a.name || a.id} não conseguirá mais ver nem alterar os dados.`, { ok: 'Remover' }))
      run(() => revokeAccess(a.id), 'Acesso removido');
  };
  const changeRole = (a: Access, r: AccessRole) => {
    if (a.id === me) return toast('Peça a outra pessoa da diretoria executiva para mudar o seu nível.', true);
    run(() => setAccessRole(a, r), `${a.name || a.id}: ${ROLE_INFO[r].label}`);
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">
          <Shield /> Diretoria com acesso
        </div>
      </div>
      <div className="card-body stack" style={{ gap: 12 }}>
        <div className="grid" style={{ gap: 8 }}>
          {(Object.keys(ROLE_INFO) as AccessRole[]).map((r) => (
            <div key={r} className="small">
              <span className={`role-badge ${r}`}>{ROLE_INFO[r].label}</span> <span className="muted">{ROLE_INFO[r].text}</span>
            </div>
          ))}
        </div>
        <div className="list">
          {sorted.map((a) => {
            const r: AccessRole = a.role === 'executiva' ? 'executiva' : 'regular';
            return (
              <div key={a.id} className="list-item" style={{ padding: '8px 0' }}>
                <div className={`avatar ${r === 'executiva' ? 'tone-amber' : 'tone-blue'}`}>
                  <KeyRound />
                </div>
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>
                    {a.name || a.id} {a.id === me && <span className="tiny">(você)</span>}
                  </div>
                  {a.name && <div className="tiny">{a.id}</div>}
                </div>
                <select
                  className="select"
                  style={{ width: 'auto', height: 34 }}
                  value={r}
                  disabled={a.id === me}
                  onChange={(e) => changeRole(a, e.target.value as AccessRole)}
                >
                  <option value="executiva">Executiva</option>
                  <option value="regular">Regular</option>
                </select>
                <button className="icon-btn danger" onClick={() => remove(a)} aria-label="Remover acesso">
                  <Trash2 />
                </button>
              </div>
            );
          })}
        </div>
        <div className="form-grid">
          <input className="input" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <div className="segmented full">
            <button className={role === 'regular' ? 'on' : ''} onClick={() => setRole('regular')}>
              Diretoria regular
            </button>
            <button className={role === 'executiva' ? 'on' : ''} onClick={() => setRole('executiva')}>
              Diretoria executiva
            </button>
          </div>
        </div>
        <button className="btn btn-sm" onClick={add}>
          <Plus /> Liberar acesso
        </button>
        <p className="tiny">
          Depois de liberar, crie o login dessa pessoa no Firebase (Authentication → Adicionar usuário) com o mesmo e-mail.
        </p>
      </div>
    </div>
  );
}

function BackupCard({ data }: { data: PageProps['data'] }) {
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJSON = () => {
    const payload = { app: 'controle-pinheiros-da-serra', version: 1, exportedAt: new Date().toISOString(), data: snapshot() };
    downloadFile(`backup-pinheiros-da-serra-${today()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    toast('Backup baixado');
  };

  const importJSON = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const db: DB = parsed.data ?? parsed;
      if (!COLLECTIONS.every((c) => Array.isArray(db[c] ?? []))) throw new Error('arquivo inválido');
      const counts = `${db.members?.length ?? 0} membros, ${db.points?.length ?? 0} lançamentos de pontos, ${db.payments?.length ?? 0} pagamentos`;
      const ok = await confirmDialog(
        'Restaurar backup?',
        `O backup contém ${counts}. TODOS os dados atuais serão substituídos por ele. Recomendamos baixar um backup atual antes.`,
        { ok: 'Substituir dados' },
      );
      if (ok) await run(() => replaceAll(db), 'Backup restaurado');
    } catch (e) {
      toast('Não foi possível ler o arquivo: ' + (e as Error).message, true);
    }
  };

  return (
    <div className="card">
      <div className="card-head">
        <div className="card-title">Backup</div>
      </div>
      <div className="card-body stack" style={{ gap: 12 }}>
        <p className="small muted">
          Baixe uma cópia de segurança de todos os dados. O arquivo também serve para levar os dados do modo local para o modo online.
        </p>
        <div className="row wrap">
          <button className="btn" onClick={exportJSON}>
            <Download /> Baixar backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload /> Restaurar backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJSON(f);
              e.target.value = '';
            }}
          />
        </div>
        <p className="tiny">
          {data.members.length} membros · {data.points.length} lançamentos de pontos · {data.payments.length} pagamentos ·{' '}
          {data.expenses.length} despesas
        </p>
      </div>
    </div>
  );
}

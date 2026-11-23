import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { LayoutDashboard, LogOut, Settings as SettingsIcon, Trophy, Users, Wallet, type LucideIcon } from 'lucide-react';
import { connect, disconnect, useData } from './data/store';
import { createLocalBackend } from './data/localBackend';
import { cloudEnabled, createCloudBackend, getMyAccess, logout, watchAuth } from './data/cloud';
import { COLLECTIONS, REGULAR_COLLECTIONS } from './types';
import { requestPersistentStorage } from './lib/backup';
import { ConfirmHost, Toasts } from './components/ui';
import Login from './components/Login';
import Dashboard from './pages/Dashboard';
import Pontuacao from './pages/Pontuacao';
import Tesouraria from './pages/Tesouraria';
import Membros from './pages/Membros';
import Configuracoes from './pages/Configuracoes';
import { navigate, type Route } from './lib/router';


const NAV: { id: Route; label: string; short: string; icon: LucideIcon; executive?: boolean }[] = [
  { id: 'painel', label: 'Painel', short: 'Painel', icon: LayoutDashboard, executive: true },
  { id: 'pontuacao', label: 'Pontuação', short: 'Pontos', icon: Trophy },
  { id: 'tesouraria', label: 'Tesouraria', short: 'Caixa', icon: Wallet, executive: true },
  { id: 'membros', label: 'Controle de Membros', short: 'Membros', icon: Users, executive: true },
  { id: 'configuracoes', label: 'Configurações', short: 'Ajustes', icon: SettingsIcon, executive: true },
];

function readRoute(): Route {
  const h = window.location.hash.replace('#/', '') as Route;
  return NAV.some((n) => n.id === h) ? h : 'painel';
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!cloudEnabled);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!cloudEnabled) {
      requestPersistentStorage(); // evita que o navegador apague os dados locais
      connect(createLocalBackend());
      return;
    }
    return watchAuth(async (u) => {
      setDenied(false);
      if (!u) {
        disconnect();
        setUser(null);
        setAuthReady(true);
        return;
      }
      try {
        const access = await getMyAccess(u.email ?? '');
        if (!access) {
          setDenied(true);
        } else {
          const role = access.role ?? 'regular';
          const allowed = role === 'executiva' ? COLLECTIONS : REGULAR_COLLECTIONS;
          connect(createCloudBackend(allowed), u.email ?? undefined, role);
        }
      } catch {
        setDenied(true);
      }
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  if (!authReady)
    return (
      <div className="splash">
        <div className="loader" />
      </div>
    );
  if (cloudEnabled && !user) return <Login />;
  if (denied)
    return (
      <div className="splash">
        <div className="login-card" style={{ marginTop: 70 }}>
          <img src="./logo.png" alt="" />
          <h1>Acesso pendente</h1>
          <p className="muted" style={{ margin: '12px 0 20px' }}>
            O e-mail <b>{user?.email}</b> ainda não foi liberado. Peça a alguém da diretoria executiva para liberar seu acesso em
            Configurações → Diretoria com acesso.
          </p>
          <button className="btn" onClick={() => logout()}>
            Sair
          </button>
        </div>
      </div>
    );

  return <Shell route={route} user={user} />;
}

function Shell({ route: wanted, user }: { route: Route; user: User | null }) {
  const data = useData();
  const nav = NAV.filter((n) => !n.executive || data.isExecutive);
  // diretoria regular não abre telas exclusivas da executiva
  const route = nav.some((n) => n.id === wanted) ? wanted : nav[0].id;
  const Page = { painel: Dashboard, pontuacao: Pontuacao, tesouraria: Tesouraria, membros: Membros, configuracoes: Configuracoes }[route];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <img src="./logo.png" alt="Logo Pinheiros da Serra" />
          <div>
            <div className="brand-name">{data.settings.clubName}</div>
            <div className="brand-sub">Clube de Desbravadores</div>
          </div>
        </div>
        <nav className="nav">
          {nav.map((n) => (
            <button key={n.id} className={`nav-item ${route === n.id ? 'active' : ''}`} onClick={() => navigate(n.id)}>
              <n.icon />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="sync-pill">
            <span className={`sync-dot ${data.mode === 'cloud' ? 'on' : ''}`} />
            {data.mode === 'cloud' ? 'Sincronizado online' : 'Modo local (este navegador)'}
          </span>
          {user && (
            <>
              <span className="user" title={user.email ?? ''}>
                {user.email}
                <br />
                <span style={{ color: 'var(--sand-300)' }}>
                  Diretoria {data.isExecutive ? 'executiva' : 'regular'}
                </span>
              </span>
              <button className="link-btn" onClick={() => logout()}>
                <LogOut size={14} /> Sair
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <img src="./logo.png" alt="" />
          <div className="grow">
            <div className="brand-name">{data.settings.clubName}</div>
          </div>
          <span className={`sync-dot ${data.mode === 'cloud' ? 'on' : ''}`} title={data.mode === 'cloud' ? 'Online' : 'Local'} />
          {user && (
            <button className="icon-btn" style={{ color: '#fff' }} onClick={() => logout()} aria-label="Sair">
              <LogOut />
            </button>
          )}
        </header>

        {data.error ? (
          <div className="page">
            <div className="notice danger">{data.error}</div>
            {user && (
              <button className="btn" style={{ marginTop: 16 }} onClick={() => logout()}>
                <LogOut /> Sair
              </button>
            )}
          </div>
        ) : !data.ready ? (
          <div className="page" style={{ paddingTop: 80 }}>
            <div className="loader dark" />
          </div>
        ) : (
          <Page data={data} user={user} />
        )}
      </main>

      <nav className="bottom-nav">
        {nav.map((n) => (
          <button key={n.id} className={route === n.id ? 'active' : ''} onClick={() => navigate(n.id)}>
            <n.icon />
            {n.short}
          </button>
        ))}
      </nav>

      <Toasts />
      <ConfirmHost />
    </div>
  );
}

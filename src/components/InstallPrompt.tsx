import { useEffect, useState } from 'react';
import { Download, PlusSquare, Share } from 'lucide-react';
import { Modal } from './ui';

// Evento do Chrome/Android que permite abrir a janela oficial de instalação
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // guardamos para mostrar no nosso aviso
    deferred = e as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

const KEY = 'pinheiros-da-serra:install-dismissed';
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
const isMobile = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent) || window.matchMedia('(pointer: coarse)').matches;
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function recentlyDismissed() {
  try {
    const t = Number(localStorage.getItem(KEY));
    return t > 0 && Date.now() - t < 3 * 86400000; // pergunta de novo depois de 3 dias
  } catch {
    return false;
  }
}

/** Aviso exibido logo após o login, no celular, para instalar o app na tela inicial. */
export default function InstallPrompt() {
  const [, force] = useState(0);
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    const l = () => force((n) => n + 1);
    listeners.add(l);
    if (isMobile() && !isStandalone() && !recentlyDismissed()) {
      // no Android espera o navegador liberar a instalação; no iPhone mostra as instruções
      const t = setTimeout(() => setOpen(true), isIOS() ? 800 : 1500);
      return () => {
        clearTimeout(t);
        listeners.delete(l);
      };
    }
    return () => void listeners.delete(l);
  }, []);

  if (guide && !isStandalone())
    return (
      <div className="install-guide" onClick={() => setGuide(false)} role="status">
        <div className="install-guide-box">
          {/CriOS/i.test(navigator.userAgent) ? (
            <>
              Toque em <b>Compartilhar</b> <Share size={15} /> na barra de endereço
            </>
          ) : (
            <>
              Toque em <b>⋯</b> e depois em <b>Compartilhar</b> <Share size={15} />
            </>
          )}
          <br />
          depois em <b>Adicionar à Tela de Início</b>
        </div>
        <div className="install-guide-arrow">↓</div>
      </div>
    );
  if (!open || isStandalone()) return null;
  const ios = isIOS();
  const iosChrome = ios && /CriOS/i.test(navigator.userAgent);
  if (!ios && !deferred) return null; // navegador não permite instalar (ou já instalado)

  const later = () => {
    try {
      localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === 'dismissed') later();
    else setOpen(false);
  };

  return (
    <Modal
      title="Instalar o app no celular"
      onClose={later}
      footer={
        <>
          <button className="btn" onClick={later}>
            Agora não
          </button>
          {!ios && (
            <button className="btn btn-primary" onClick={install}>
              <Download /> Instalar
            </button>
          )}
          {ios && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setOpen(false);
                setGuide(true);
                setTimeout(() => setGuide(false), 12000);
              }}
            >
              Mostrar onde tocar
            </button>
          )}
        </>
      }
    >
      <div className="install-prompt">
        <img src="./icon-192.png" alt="" />
        <div>
          <b>Pinheiros da Serra na sua tela inicial</b>
          <p className="small muted">Abra o sistema com um toque, em tela cheia, como um aplicativo.</p>
        </div>
      </div>
      {ios && (
        <ol className="install-steps">
          {iosChrome ? (
            <li>
              Toque no botão <b>Compartilhar</b> <Share size={16} /> na barra de endereço do Chrome.
            </li>
          ) : (
            <li>
              Toque nos <b>três pontinhos ⋯</b> ao lado do endereço do site e depois em <b>Compartilhar</b> <Share size={16} />.
              <div className="tiny">Em iPhones com iOS mais antigo, o botão Compartilhar já aparece direto na barra de baixo.</div>
            </li>
          )}
          <li>
            Role para baixo e toque em <b>Adicionar à Tela de Início</b> <PlusSquare size={16} />.
          </li>
          <li>
            Deixe <b>“Abrir como App Web”</b> ligado (se aparecer) e toque em <b>Adicionar</b>.
          </li>
        </ol>
      )}
    </Modal>
  );
}

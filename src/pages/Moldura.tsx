import { useCallback, useEffect, useRef, useState } from "react";
import lockupAsset from "@/assets/logo-amarela-quadrada.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { BASE_MOLDURAS } from "@/lib/molduraCounter";

const LOCKUP_SRC = lockupAsset.url;
const MMARK_SRC = "/marca/moldura-mmark.png";
const EXEMPLO_SRC = "/marca/moldura-exemplo.png";
const AMARELA_V_SRC = "/marca/moldura-amarela-v.png";
const FOOTER_LOGO_SRC = "/marca/moldura-footer-logo.png";

type FormatKey = "feed" | "story";
type ArtKey = "faixa" | "leve";
type ExampleFit = { zoom: number; x: number; y: number };

type ExampleFitMap = Record<FormatKey, ExampleFit>;

const EXAMPLE_FIT_STORAGE_KEY = "moldura_exemplo_fit_v4";
const DEFAULT_EXAMPLE_FIT: ExampleFitMap = {
  feed: { zoom: 0.9, x: 0, y: 0.08 },
  story: { zoom: 1.04, x: 0, y: 0.03 },
};

const FORMATS: Record<FormatKey, { w: number; h: number; cx: number; cy: number; r: number }> = {
  feed: { w: 1080, h: 1080, cx: 540, cy: 540, r: 420 },
  story: { w: 1080, h: 1920, cx: 540, cy: 640, r: 400 },
};

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Não foi possível carregar o recurso: ${src}`));
    img.src = src;
  });
}

/** Identificador anônimo do visitante (mesma chave do analytics da LP principal). */
function getMolduraVisitorId() {
  const KEY = "rota399_visitor_id";
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return stored;
    const novo = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(KEY, novo);
    return novo;
  } catch {
    return `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

const molduraSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

/** Registra eventos da página /moldura em page_analytics_events. */
async function trackMoldura(eventType: "pageview" | "moldura_download", metadata?: Record<string, unknown>) {
  try {
    await supabase.from("page_analytics_events").insert([{
      session_id: molduraSessionId,
      visitor_id: getMolduraVisitorId(),
      event_type: eventType,
      page_path: "/moldura",
      component_name: "Moldura",
      component_action: eventType === "moldura_download" ? "download" : "view",
      referrer: document.referrer || null,
      device_type: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop",
      screen_width: window.innerWidth,
      screen_height: window.innerHeight,
      metadata: (metadata ?? {}) as never,
    }]);
  } catch {
    /* best effort */
  }
}


function drawRoundedRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

const Moldura = () => {
  const stageRef = useRef<HTMLCanvasElement>(null);
  const heroRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const assetsRef = useRef<{
    lockup?: HTMLImageElement;
    mmark?: HTMLImageElement;
    amarelaV?: HTMLImageElement;
    exemplo?: HTMLImageElement;
  }>({});
  const stateRef = useRef({
    img: null as HTMLImageElement | null,
    format: "feed" as FormatKey,
    art: "faixa" as ArtKey,
    scale: 1,
    minScale: 1,
    offX: 0,
    offY: 0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });
  // Enquadramento da foto enviada, salvo por formato (avatar/feed e story são independentes)
  const userFitsRef = useRef<Partial<Record<FormatKey, { scale: number; minScale: number; offX: number; offY: number }>>>({});

  const [format, setFormat] = useState<FormatKey>("feed");
  const [art, setArt] = useState<ArtKey>("faixa");
  const [zoom, setZoom] = useState(100);
  const [hasImg, setHasImg] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [assetsReady, setAssetsReady] = useState(false);

  // Ajuste manual (modo admin) do enquadramento da foto de exemplo
  const [adminMode] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (params.has("admin")) {
      // mantém o modo admin ativo neste navegador
      try {
        localStorage.setItem("moldura_admin", params.get("admin") === "0" ? "0" : "1");
      } catch {
        /* ignore */
      }
      return params.get("admin") !== "0";
    }
    try {
      return localStorage.getItem("moldura_admin") === "1";
    } catch {
      return false;
    }
  });
  const [exFit, setExFit] = useState<ExampleFitMap>(() => {
    if (typeof window === "undefined") return DEFAULT_EXAMPLE_FIT;
    try {
      const raw = localStorage.getItem(EXAMPLE_FIT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          feed: { ...DEFAULT_EXAMPLE_FIT.feed, ...(parsed?.feed || {}) },
          story: { ...DEFAULT_EXAMPLE_FIT.story, ...(parsed?.story || {}) },
        };
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_EXAMPLE_FIT;
  });
  const exFitRef = useRef(exFit);
  exFitRef.current = exFit;
  const [exFitSaved, setExFitSaved] = useState(true);
  const [exFitSaving, setExFitSaving] = useState(false);
  const [exFitSaveError, setExFitSaveError] = useState("");

  const drawFrame = useCallback(
    (c: CanvasRenderingContext2D, cx: number, cy: number, r: number, artKey: ArtKey, showPlate = true) => {
      const assets = assetsRef.current;
      if (artKey === "faixa") {
        c.save();
        c.beginPath();
        c.arc(cx, cy, r + 14, 0, Math.PI * 2);
        c.lineWidth = 20;
        c.strokeStyle = "#006731";
        c.stroke();
        c.restore();

        c.save();
        c.beginPath();
        c.arc(cx, cy, r + 28, 0, Math.PI * 2);
        c.lineWidth = 4;
        c.strokeStyle = "#F8DC00";
        c.stroke();
        c.restore();

        const lockup = assets.lockup;
        if (lockup && showPlate) {
          // faixa branca (lente) ocupando o terço inferior do círculo, recortada pelo círculo
          c.save();
          c.beginPath();
          c.arc(cx, cy, r, 0, Math.PI * 2);
          c.clip();
          c.beginPath();
          c.ellipse(cx, cy + r * 0.9, r * 1.18, r * 0.62, 0, 0, Math.PI * 2);
          c.fillStyle = "#006731";
          c.fill();
          c.restore();

          // marca contida na área da faixa
          const areaTop = cy + r * 0.36;
          const areaBottom = cy + r * 0.93;
          const areaH = areaBottom - areaTop;
          const areaW = r * 1.3;
          let imgW = areaW;
          let imgH = imgW * (lockup.height / lockup.width);
          if (imgH > areaH) {
            imgH = areaH;
            imgW = imgH * (lockup.width / lockup.height);
          }
          c.drawImage(lockup, cx - imgW / 2, areaTop + (areaH - imgH) / 2, imgW, imgH);
        }
      } else {
        c.save();
        c.beginPath();
        c.arc(cx, cy, r + 10, 0, Math.PI * 2);
        c.lineWidth = 9;
        c.strokeStyle = "#006731";
        c.stroke();
        c.restore();

        if (showPlate) {
          const mark = assets.mmark;
          const badgeR = r * 0.2;
          const angle = (45 * Math.PI) / 180;
          const bx = cx + Math.cos(angle) * (r * 0.64);
          const by = cy + Math.sin(angle) * (r * 0.64);
          c.save();
          c.shadowColor = "rgba(0,0,0,0.2)";
          c.shadowBlur = 10;
          c.shadowOffsetY = 3;
          c.beginPath();
          c.arc(bx, by, badgeR, 0, Math.PI * 2);
          c.fillStyle = "#FFFFFF";
          c.fill();
          c.restore();
          if (mark) {
            const mw = badgeR * 1.25;
            const mh = mw * (mark.height / mark.width);
            c.drawImage(mark, bx - mw / 2, by - mh / 2, mw, mh);
          }
        }
      }
    },
    [],
  );

  const render = useCallback(() => {
    const stage = stageRef.current;
    const ctx = stage?.getContext("2d");
    if (!stage || !ctx) return;
    const st = stateRef.current;
    const f = FORMATS[st.format];
    ctx.clearRect(0, 0, stage.width, stage.height);

    if (st.format === "story") {
      const grad = ctx.createLinearGradient(0, 0, 0, stage.height);
      grad.addColorStop(0, "#00552A");
      grad.addColorStop(1, "#006731");
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = "#F7F6EF";
    }
    ctx.fillRect(0, 0, stage.width, stage.height);

    if (st.img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(f.cx, f.cy, f.r, 0, Math.PI * 2);
      ctx.clip();
      const iw = st.img.width * st.scale;
      const ih = st.img.height * st.scale;
      ctx.drawImage(st.img, f.cx - iw / 2 + st.offX, f.cy - ih / 2 + st.offY, iw, ih);
      ctx.restore();
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.arc(f.cx, f.cy, f.r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = st.format === "story" ? "rgba(255,255,255,0.18)" : "#E3DFD1";
      ctx.fill();
      const ex = assetsRef.current.exemplo;
      if (ex) {
        const fit = exFitRef.current[st.format];
        const s = ((f.r * 2) / Math.min(ex.width, ex.height)) * fit.zoom;
        const w = ex.width * s;
        const h = ex.height * s;
        ctx.drawImage(ex, f.cx - w / 2 + f.r * fit.x, f.cy - h / 2 + f.r * fit.y, w, h);
      }
      ctx.restore();
    }

    drawFrame(ctx, f.cx, f.cy, f.r, st.art, st.format !== "story");

    const logo = assetsRef.current.amarelaV;
    if (st.format === "story" && logo) {
      const logoW = stage.width * 0.5;
      const logoH = logoW * (logo.height / logo.width);
      ctx.drawImage(logo, (stage.width - logoW) / 2, stage.height - logoH - 70, logoW, logoH);
    }
  }, [drawFrame]);

  const renderHero = useCallback(() => {
    const hero = heroRef.current;
    const hctx = hero?.getContext("2d");
    if (!hero || !hctx) return;
    hctx.clearRect(0, 0, 440, 440);
    hctx.save();
    hctx.beginPath();
    hctx.arc(220, 220, 168, 0, Math.PI * 2);
    hctx.clip();
    hctx.fillStyle = "#E3DFD1";
    hctx.fill();
    const ex = assetsRef.current.exemplo;
    if (ex) {
      const fit = exFitRef.current.feed;
      const s = (336 / Math.min(ex.width, ex.height)) * fit.zoom;
      const w = ex.width * s;
      const h = ex.height * s;
      hctx.drawImage(ex, 220 - w / 2 + 168 * fit.x, 220 - h / 2 + 168 * fit.y, w, h);
    }
    hctx.restore();
    drawFrame(hctx, 220, 220, 168, "faixa");
  }, [drawFrame]);

  const setCanvasSize = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const f = FORMATS[stateRef.current.format];
    stage.width = f.w;
    stage.height = f.h;
    const displayW = 300;
    stage.style.width = `${displayW}px`;
    stage.style.height = `${Math.round(f.h * (displayW / f.w))}px`;
  }, []);

  const fitImage = useCallback(() => {
    const st = stateRef.current;
    if (!st.img) return;
    const f = FORMATS[st.format];
    const diameter = f.r * 2;
    st.minScale = Math.max(diameter / st.img.width, diameter / st.img.height);
    st.scale = st.minScale;
    st.offX = 0;
    st.offY = 0;
    setZoom(100);
  }, []);

  const [avatarCount, setAvatarCount] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const carregar = async () => {
      const { data, error } = await supabase.rpc("get_moldura_avatares_count");
      if (!active || error) return;
      setAvatarCount(Number(data ?? 0) + BASE_MOLDURAS);
    };
    void carregar();
    const id = window.setInterval(() => void carregar(), 30000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    document.title = "Sou Moro 22 | Moldura oficial de perfil";
    void trackMoldura("pageview");
    setCanvasSize();
    Promise.allSettled([
      loadImg(LOCKUP_SRC).then((i) => (assetsRef.current.lockup = i)),
      loadImg(MMARK_SRC).then((i) => (assetsRef.current.mmark = i)),
      loadImg(AMARELA_V_SRC).then((i) => (assetsRef.current.amarelaV = i)),
      loadImg(EXEMPLO_SRC).then((i) => (assetsRef.current.exemplo = i)),
    ]).then(() => {
      setAssetsReady(true);
      render();
      renderHero();
    });
  }, [render, renderHero, setCanvasSize]);

  useEffect(() => {
    let active = true;
    const loadPublishedFit = async () => {
      // Preserve o ajuste já aprovado no navegador do admin para que ele possa
      // publicá-lo; visitantes sempre recebem a configuração global.
      if (adminMode) {
        try {
          if (localStorage.getItem(EXAMPLE_FIT_STORAGE_KEY)) return;
        } catch {
          /* segue com a configuração publicada */
        }
      }
      const { data } = await supabase
        .from("moldura_config")
        .select("feed_zoom,feed_x,feed_y,story_zoom,story_x,story_y")
        .eq("id", "default")
        .maybeSingle();
      if (!active || !data) return;
      setExFit({
        feed: { zoom: data.feed_zoom, x: data.feed_x, y: data.feed_y },
        story: { zoom: data.story_zoom, x: data.story_x, y: data.story_y },
      });
      setExFitSaved(true);
    };
    void loadPublishedFit();
    return () => {
      active = false;
    };
  }, [adminMode]);

  useEffect(() => {
    render();
    renderHero();
  }, [exFit, render, renderHero]);

  useEffect(() => {
    if (assetsReady) renderHero();
  }, [assetsReady, renderHero]);

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        stateRef.current.img = img;
        userFitsRef.current = {};
        setHasImg(true);
        fitImage();
        render();
      };
      img.src = String(e.target?.result || "");
    };
    reader.readAsDataURL(file);
  };

  const changeFormat = (f: FormatKey) => {
    const st = stateRef.current;
    if (st.img) {
      userFitsRef.current[st.format] = { scale: st.scale, minScale: st.minScale, offX: st.offX, offY: st.offY };
    }
    stateRef.current.format = f;
    setFormat(f);
    setCanvasSize();
    const saved = userFitsRef.current[f];
    if (st.img && saved) {
      st.scale = saved.scale;
      st.minScale = saved.minScale;
      st.offX = saved.offX;
      st.offY = saved.offY;
      setZoom(Math.round((saved.scale / saved.minScale) * 100));
    } else {
      fitImage();
    }
    render();
  };

  const changeArt = (a: ArtKey) => {
    stateRef.current.art = a;
    setArt(a);
    render();
  };

  const onZoom = (pct: number) => {
    setZoom(pct);
    stateRef.current.scale = stateRef.current.minScale * (pct / 100);
    render();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = stateRef.current;
    if (!st.img) return;
    st.dragging = true;
    st.lastX = e.clientX;
    st.lastY = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const st = stateRef.current;
    if (!st.dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const sf = e.currentTarget.width / rect.width;
    st.offX += (e.clientX - st.lastX) * sf;
    st.offY += (e.clientY - st.lastY) * sf;
    st.lastX = e.clientX;
    st.lastY = e.clientY;
    render();
  };

  const stopDrag = () => {
    stateRef.current.dragging = false;
  };

  const download = async () => {
    const stage = stageRef.current;
    if (!stage || !stateRef.current.img) return;
    const fileName = `moro-moldura-${stateRef.current.format}.png`;
    void trackMoldura("moldura_download", { format: stateRef.current.format }).then(() => {
      setAvatarCount((c) => (c == null ? c : c + 1));
    });

    const ua = navigator.userAgent || "";
    const isIOS =
      /iP(hone|ad|od)/.test(ua) ||
      (navigator.platform === "MacIntel" && (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints > 1);
    const isAndroid = /Android/i.test(ua);
    // Navegadores embutidos (Instagram, Facebook, TikTok, Messenger...) bloqueiam o download direto
    const isInApp = /(Instagram|FBAN|FBAV|FB_IAB|Messenger|Line|Twitter|TikTok|Snapchat|Pinterest|LinkedIn|WhatsApp|GSA)/i.test(ua);
    const supportsDownloadAttr = "download" in document.createElement("a");

    const toBlob = () =>
      new Promise<Blob | null>((resolve) => {
        try {
          if (stage.toBlob) stage.toBlob((b) => resolve(b), "image/png");
          else resolve(null);
        } catch {
          resolve(null);
        }
      });

    const dataUrlToBlob = (dataUrl: string) => {
      const [head, body] = dataUrl.split(",");
      const mime = /:(.*?);/.exec(head)?.[1] || "image/png";
      const bin = atob(body);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    };

    const triggerDownload = (href: string, revoke?: () => void) => {
      const link = document.createElement("a");
      link.download = fileName;
      link.setAttribute("download", fileName);
      link.target = "_self";
      link.rel = "noopener";
      link.href = href;
      link.style.display = "none";
      document.body.appendChild(link);
      try {
        link.click();
      } catch {
        link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      }
      window.setTimeout(() => {
        document.body.removeChild(link);
        revoke?.();
      }, 2000);
    };

    try {
      let blob = await toBlob();
      let dataUrl = "";
      if (!blob) {
        dataUrl = stage.toDataURL("image/png");
        try {
          blob = dataUrlToBlob(dataUrl);
        } catch {
          blob = null;
        }
      }

      const isMobile = isIOS || isAndroid || isInApp;

      // 1) Mobile (iOS, Android/Samsung e navegadores embutidos): compartilhamento
      // nativo salva direto na galeria/fotos e é o caminho mais confiável.
      if (blob && isMobile) {
        const nav = navigator as Navigator & {
          canShare?: (data: { files: File[] }) => boolean;
          share?: (data: { files: File[]; title?: string }) => Promise<void>;
        };
        try {
          const file = new File([blob], fileName, { type: "image/png" });
          if (nav.share && nav.canShare?.({ files: [file] })) {
            await nav.share({ files: [file], title: "Sou Moro 22" });
            setIosHint(false);
            return;
          }
        } catch (err) {
          if ((err as DOMException)?.name === "AbortError") return;
        }
      }

      // 2) Download clássico (desktop e Android com Chrome/Samsung Internet)
      if (blob && supportsDownloadAttr && !isIOS && !isInApp) {
        const url = URL.createObjectURL(blob);
        triggerDownload(url, () => URL.revokeObjectURL(url));
        if (isAndroid) setIosHint(true);
        return;
      }

      // 3) Fallback universal: mostra a imagem para salvar com toque longo
      const href = blob ? URL.createObjectURL(blob) : dataUrl || stage.toDataURL("image/png");
      setIosHint(true);
      setFallbackUrl(href);
      if (supportsDownloadAttr && !isIOS) triggerDownload(href);
    } catch {
      try {
        const fallback = stage.toDataURL("image/png");
        setIosHint(true);
        setFallbackUrl(fallback);
      } catch {
        /* ignore */
      }
    }
  };

  const btn =
    "inline-block rounded-full px-7 py-4 text-sm font-semibold uppercase tracking-wide transition-transform hover:-translate-y-px";
  const btnPrimary = `${btn} bg-[#006731] text-white shadow-[0_6px_18px_rgba(0,103,49,0.28)] disabled:opacity-50 disabled:hover:translate-y-0`;
  const btnSecondary = `${btn} border-[1.5px] border-[#006731] bg-transparent text-[#006731]`;

  return (
    <div className="min-h-screen bg-[#F7F6EF] text-[#10200F]" style={{ fontFamily: "'Inter',system-ui,sans-serif" }}>
      <header className="flex items-center gap-2.5 border-b border-[#E1DFD2] bg-white px-5 py-3.5">
        <img src={MMARK_SRC} alt="" className="w-[30px]" />
        <div>
          <div className="text-[15px] font-semibold uppercase tracking-[0.06em] text-[#006731]" style={{ fontFamily: "'Oswald',system-ui,sans-serif" }}>
            Sou Moro 22
          </div>
          <div className="text-[10px] font-medium uppercase tracking-[0.04em] text-[#566253]">Governador · 22 · Paraná</div>
        </div>
      </header>

      <section className="px-5 pb-6 pt-9 text-center">
        <div className="mx-auto max-w-[480px]">
          <div className="mb-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#97B832]" style={{ fontFamily: "'Oswald',sans-serif" }}>
            Governador · 22 · Paraná 2026
          </div>
          <h1 className="mb-3.5 text-[32px] font-bold uppercase leading-[1.08] text-[#006731]" style={{ fontFamily: "'Oswald',sans-serif" }}>
            Coloque sua
            <br />
            moldura do Moro
          </h1>
          <p className="mb-3.5 text-[15px] italic text-[#006731]" style={{ fontFamily: "'Oswald',sans-serif" }}>
            "Paraná, a nossa fortaleza."
          </p>
          <p className="mx-auto mb-6 max-w-[360px] text-[15px] text-[#566253]">
            Mostre seu apoio direto no perfil. Envie a foto, ajuste o enquadramento e baixe — leva 10 segundos, direto do celular.
          </p>
          <canvas ref={heroRef} width={440} height={440} className="mx-auto mb-7 h-[220px] w-[220px]" />
          <button
            className={btnPrimary}
            onClick={() => {
              editorRef.current?.scrollIntoView({ behavior: "smooth" });
              setTimeout(() => fileRef.current?.click(), 400);
            }}
          >
            Colocar minha moldura
          </button>
        </div>
      </section>

      <section className="px-5 pb-9 pt-2">
        <div className="mx-auto max-w-[480px]">
          <h2 className="mb-5 text-center text-[13px] uppercase tracking-[0.14em] text-[#006731]" style={{ fontFamily: "'Oswald',sans-serif" }}>
            Como funciona
          </h2>
          <div className="grid gap-4">
            {[
              ["01", "Envie sua foto", "Escolha a foto que você já usa no seu perfil."],
              ["02", "Ajuste o enquadramento", "Arraste e dê zoom até ficar do seu jeito."],
              ["03", "Baixe e publique", "Salve a imagem e troque sua foto nas redes."],
            ].map(([n, t, d]) => (
              <div key={n} className="flex items-start gap-3.5 rounded-[18px] border border-[#E1DFD2] bg-white p-4">
                <div className="min-w-[30px] text-[22px] font-bold text-[#97B832]" style={{ fontFamily: "'Oswald',sans-serif" }}>
                  {n}
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold uppercase text-[#006731]" style={{ fontFamily: "'Oswald',sans-serif" }}>
                    {t}
                  </h3>
                  <p className="text-[13.5px] text-[#566253]">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={editorRef} className="px-5 pb-12 pt-2">
        <div className="mx-auto max-w-[480px]">
          <div className="rounded-[24px] border border-[#E1DFD2] bg-white px-[18px] pb-6 pt-[22px]">
            <p className="mb-1 text-center text-[15px] font-bold uppercase text-[#006731]" style={{ fontFamily: "'Oswald',sans-serif" }}>
              Monte sua foto
            </p>
            <p className="mb-5 text-center text-xs text-[#566253]">
              🔒 Nenhuma foto é enviada para servidor. Tudo acontece no seu aparelho.
            </p>

            <div className="mb-4 flex rounded-full bg-[#F0EEE2] p-1">
              {(["feed", "story"] as FormatKey[]).map((f) => (
                <button
                  key={f}
                  onClick={() => changeFormat(f)}
                  className={`flex-1 rounded-full px-2 py-2.5 text-[13px] font-semibold ${
                    format === f ? "bg-[#006731] text-white" : "text-[#566253]"
                  }`}
                >
                  {f === "feed" ? "Feed / Perfil" : "Story / Status"}
                </button>
              ))}
            </div>

            <div className="mb-4 flex justify-center rounded-2xl bg-[#EFEDE0] py-4">
              <canvas
                ref={stageRef}
                className="max-w-full cursor-grab touch-none rounded-[10px] active:cursor-grabbing"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={stopDrag}
                onPointerLeave={stopDrag}
                onPointerCancel={stopDrag}
              />
            </div>

            {!hasImg && (
              <p className="px-2.5 py-7 text-center text-[13px] text-[#566253]">
                Nenhuma foto selecionada ainda. Escolha uma foto para começar a ajustar.
              </p>
            )}

            {adminMode && !hasImg && (
              <div className="mb-4 rounded-2xl border-2 border-dashed border-[#006731] bg-white p-4">
                <p className="mb-3 text-center text-[13px] font-bold uppercase text-[#006731]">
                  Admin · enquadrar foto de modelo ({format === "feed" ? "Feed / Perfil" : "Story / Status"})
                </p>
                {([
                  ["Zoom", "zoom", 0.8, 2.5, 0.01],
                  ["Horizontal", "x", -1, 1, 0.01],
                  ["Vertical", "y", -1, 1, 0.01],
                ] as const).map(([label, key, min, max, step]) => (
                  <div key={key} className="mb-3">
                    <div className="mb-1 flex justify-between text-xs text-[#566253]">
                      <span>{label}</span>
                      <span>{exFit[format][key].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={exFit[format][key]}
                      onChange={(e) =>
                        {
                          setExFit((p) => ({ ...p, [format]: { ...p[format], [key]: Number(e.target.value) } }));
                          setExFitSaved(false);
                        }
                      }
                      className="w-full accent-[#006731]"
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setExFit((p) => ({ ...p, [format]: DEFAULT_EXAMPLE_FIT[format] }));
                      setExFitSaved(false);
                    }}
                    className="flex-1 rounded-full border-2 border-[#006731] px-3 py-2 text-xs font-semibold text-[#006731]"
                  >
                    Restaurar padrão
                  </button>
                  <button
                    disabled={exFitSaving}
                    onClick={async () => {
                      setExFitSaving(true);
                      setExFitSaveError("");
                      try {
                        localStorage.setItem(EXAMPLE_FIT_STORAGE_KEY, JSON.stringify(exFitRef.current));
                        const current = exFitRef.current;
                        const { error } = await supabase
                          .from("moldura_config")
                          .update({
                            feed_zoom: current.feed.zoom,
                            feed_x: current.feed.x,
                            feed_y: current.feed.y,
                            story_zoom: current.story.zoom,
                            story_x: current.story.x,
                            story_y: current.story.y,
                            updated_at: new Date().toISOString(),
                          })
                          .eq("id", "default");
                        if (error) throw error;
                        setExFitSaved(true);
                      } catch {
                        setExFitSaveError("Não foi possível publicar. Entre no painel administrativo e tente novamente.");
                      } finally {
                        setExFitSaving(false);
                      }
                    }}
                    className="flex-1 rounded-full bg-[#006731] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {exFitSaving ? "Publicando..." : exFitSaved ? "Publicado ✓" : "Salvar e publicar"}
                  </button>
                </div>
                {exFitSaveError && <p className="mt-2 text-center text-[11px] font-semibold text-red-700">{exFitSaveError}</p>}
                <p className="mt-2 text-center text-[11px] text-[#566253]">
                  Ajuste independente por formato. Salvar publica o enquadramento para todos os visitantes.
                </p>
              </div>
            )}

            {hasImg && (
              <div>
                <div className="mb-[18px] flex items-center gap-2.5">
                  <span className="text-base text-[#566253]">−</span>
                  <input
                    type="range"
                    min={100}
                    max={300}
                    value={zoom}
                    onChange={(e) => onZoom(Number(e.target.value))}
                    className="flex-1 accent-[#006731]"
                  />
                  <span className="text-base text-[#566253]">+</span>
                </div>
                <p className="-mt-2 mb-[18px] text-center text-xs text-[#566253]">Arraste a foto para reposicionar</p>
              </div>
            )}

            <p className="mb-2 mt-1 text-center text-[13px] font-bold uppercase text-[#006731]" style={{ fontFamily: "'Oswald',sans-serif" }}>
              Escolha sua arte
            </p>
            <div className="mb-[18px] flex gap-2.5">
              <button
                onClick={() => changeArt("faixa")}
                className={`flex-1 rounded-[14px] border-2 bg-white px-1.5 py-2.5 text-center ${
                  art === "faixa" ? "border-[#006731]" : "border-[#E1DFD2]"
                }`}
              >
                <svg viewBox="0 0 60 60" className="mb-1.5 block h-auto w-full">
                  <circle cx="30" cy="30" r="24" fill="none" stroke="#006731" strokeWidth="5" />
                  <circle cx="30" cy="30" r="26.5" fill="none" stroke="#F8DC00" strokeWidth="1.5" />
                </svg>
                <span className="text-xs font-semibold">Faixa</span>
              </button>
              <button
                onClick={() => changeArt("leve")}
                className={`flex-1 rounded-[14px] border-2 bg-white px-1.5 py-2.5 text-center ${
                  art === "leve" ? "border-[#006731]" : "border-[#E1DFD2]"
                }`}
              >
                <svg viewBox="0 0 60 60" className="mb-1.5 block h-auto w-full">
                  <circle cx="30" cy="30" r="26" fill="none" stroke="#006731" strokeWidth="3" />
                </svg>
                <span className="text-xs font-semibold">Leve</span>
              </button>
            </div>

            <div className="flex gap-2.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <button className={`${btnSecondary} flex-1 text-center`} onClick={() => fileRef.current?.click()}>
                Escolher foto
              </button>
              <button className={`${btnPrimary} flex-1 text-center`} onClick={download} disabled={!hasImg}>
                Baixar imagem
              </button>
            </div>
            {iosHint && (
              <p className="mt-3 rounded-[12px] bg-[#FFF7CC] px-3.5 py-2.5 text-xs leading-relaxed text-[#4A3B00]">
                Se a imagem não salvou automaticamente, toque e segure sobre a imagem abaixo e escolha
                <strong> “Salvar imagem” </strong> (Android/Samsung) ou <strong>“Salvar em Fotos”</strong> (iPhone).
              </p>
            )}
            {fallbackUrl && (
              <div className="mt-3">
                <img
                  src={fallbackUrl}
                  alt="Sua arte pronta para salvar"
                  className="mx-auto w-full max-w-[320px] rounded-[12px] border border-[#00673120]"
                />
                <a
                  href={fallbackUrl}
                  download={`moro-moldura-${format}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-center text-xs font-semibold text-[#006731] underline"
                >
                  Abrir imagem em nova aba
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="bg-[#006731] px-5 py-8 text-center text-xs text-[#CFE0C6]">
        <div className="mx-auto max-w-[480px]">
          <img src={FOOTER_LOGO_SRC} alt="Moro 22 Governador" className="mx-auto mb-3.5 w-[200px]" loading="lazy" />
          <p className="my-1">
            <a
              className="font-semibold text-white no-underline"
              href="https://oficialsergiomoro.com.br/"
              target="_blank"
              rel="noopener noreferrer"
            >
              oficialsergiomoro.com.br
            </a>
          </p>
          <div className="mb-1.5 mt-4 flex justify-center gap-3.5">
            {[
              ["IG", "https://www.instagram.com/sf_moro/", "Instagram"],
              ["FB", "https://www.facebook.com/sf.moro/", "Facebook"],
              ["X", "https://x.com/SF_Moro", "X"],
              ["YT", "https://www.youtube.com/@sf_moro", "YouTube"],
              ["TT", "https://www.tiktok.com/@sergiomoro_", "TikTok"],
            ].map(([l, href, label]) => (
              <a
                key={l}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/10 text-[13px] font-semibold text-white no-underline"
              >
                {l}
              </a>
            ))}
          </div>
          <hr className="my-5 border-0 border-t border-white/15" />
          <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#9FC194]">
            <strong className="text-[#CFE0C6]">PROPAGANDA ELEITORAL</strong>
            <br />
            Coligação: Fortaleza Paraná — Partidos: PL – NOVO – PODEMOS
            <br />
            CNPJ de campanha: 68.456.168/0001-40
            <br />
            <br />
            Este site não coleta, armazena nem envia suas fotos para nenhum servidor. Todo o processamento acontece no seu próprio aparelho.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Moldura;
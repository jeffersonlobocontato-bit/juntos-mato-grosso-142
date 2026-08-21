import { useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
// Portado do módulo "Cruzamento Moro" da plataforma Politiza IA (politiza.ia.br)
import { DATA_CRUZAMENTO_WELLINGTON } from '@/data/cruzamentoWellington';


const TIPO_STYLES: Record<string, { bg: string; border: string; label: string; labelColor: string }> = {
  agreement: { bg: 'rgba(27,175,122,0.12)', border: '#1baf7a', label: 'AGREEMENT', labelColor: '#1baf7a' },
  partial_agreement: { bg: 'rgba(74,148,236,0.12)', border: '#4a94ec', label: 'PARTIAL AGREEMENT', labelColor: '#4a94ec' },
  dissonance: { bg: 'rgba(227,73,72,0.12)', border: '#e34948', label: 'DISSONANCE', labelColor: '#e34948' },
  silence: { bg: 'rgba(237,161,0,0.12)', border: '#eda100', label: 'SILENCE', labelColor: '#eda100' },
};

function Bar({ seg, v, max }: { seg: string; v: number; max: number }) {
  const pct = Math.max(2, (v / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#b8c0cc', marginBottom: 3 }}>
        <span>{seg}</span>
        <span style={{ fontWeight: 600, color: '#e8ecf1' }}>{v.toFixed(1)}%</span>
      </div>
      <div style={{ height: 8, background: '#1c2430', borderRadius: 5, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #2a78d6, #4a94ec)', borderRadius: 5 }} />
      </div>
    </div>
  );
}

function AbaConteudo({ aba }: { aba: any }) {
  const max = Math.max(...aba.barras.map((b: any) => b.v), aba.media || 0) * 1.05;
  const estilo = TIPO_STYLES[aba.classificacao];
  return (
    <div>
      <div style={{ background: '#151b24', border: '1px solid #232c3a', borderRadius: 12, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 12, letterSpacing: 0.5, color: '#7a8699', marginBottom: 14, textTransform: 'uppercase' }}>
          Wellington Fagundes por segmento {aba.media ? `— média estadual: ${aba.media}%` : ''}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: aba.barras.length > 4 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: '4px 32px' }}>
          {aba.barras.map((b: any) => (
            <Bar key={b.seg} seg={b.seg} v={b.v} max={max} />
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 12 }}>
        <div style={{ background: '#151b24', border: '1px solid #232c3a', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, color: '#7a8699', marginBottom: 8, textTransform: 'uppercase' }}>Tema qualitativo associado</div>
          <div style={{ fontSize: 14, color: '#c7cfda', fontStyle: 'italic', lineHeight: 1.5 }}>{aba.tema}</div>
        </div>
        <div style={{ background: estilo.bg, border: `1px solid ${estilo.border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, color: estilo.labelColor, marginBottom: 4, fontWeight: 700 }}>{estilo.label} — Leitura cruzada</div>
          <div style={{ fontSize: 12, color: '#9aa4b2', marginBottom: 10, fontStyle: 'italic' }}>{aba.classificacaoNota}</div>
          <div style={{ fontSize: 14, color: '#e8ecf1', lineHeight: 1.55 }}>{aba.leitura}</div>
        </div>
        <div style={{ background: '#151b24', border: '1px solid #232c3a', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, color: '#7a8699', marginBottom: 8, textTransform: 'uppercase' }}>Gap identificado</div>
          <div style={{ fontSize: 13.5, color: '#b8c0cc', lineHeight: 1.5 }}>{aba.gap}</div>
        </div>
        <div style={{ background: 'rgba(42,120,214,0.10)', border: '1px solid #2a78d6', borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, color: '#4a94ec', marginBottom: 8, fontWeight: 700 }}>IMPLICAÇÃO ESTRATÉGICA</div>
          <div style={{ fontSize: 14, color: '#e8ecf1', lineHeight: 1.55 }}>{aba.implicacao}</div>
        </div>
      </div>
    </div>
  );
}

function TagCloud({ termos }: { termos: { termo: string; peso: number; valencia: string }[] }) {
  const cores: Record<string, string> = { positiva: '#1baf7a', negativa: '#e34948', neutra: '#7a8699' };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 14px', alignItems: 'center', justifyContent: 'center', padding: '8px 4px' }}>
      {termos.map((t, i) => (
        <span key={i} style={{ fontSize: 11 + t.peso * 2.6, fontWeight: t.peso >= 4 ? 700 : 500, color: cores[t.valencia], lineHeight: 1.2, opacity: 0.55 + t.peso * 0.09 }}>
          {t.termo}
        </span>
      ))}
    </div>
  );
}

function ListaPriorizacao({ items, tipo }: { items: any[]; tipo: 'obrigatorio' | 'possivel' | 'irrelevante' }) {
  const estilos = {
    obrigatorio: { bg: 'rgba(27,175,122,0.08)', border: '#1baf7a' },
    possivel: { bg: 'rgba(237,161,0,0.08)', border: '#eda100' },
    irrelevante: { bg: 'rgba(122,134,153,0.08)', border: '#4a5568' },
  };
  const e = estilos[tipo];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 10 }}>
      {items.map((it, i) => (
        <div key={i} style={{ background: e.bg, border: `1px solid ${e.border}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e8ecf1', marginBottom: 6 }}>{it.tema}</div>
          <div style={{ fontSize: 12.5, color: '#b8c0cc', lineHeight: 1.5, marginBottom: 6 }}>{it.justificativa || it.risco}</div>
          <div style={{ fontSize: 11.5, color: '#7a8699' }}>Alvo: {it.alvo}</div>
        </div>
      ))}
    </div>
  );
}

function InsightsMarketing() {
  const d = DATA_CRUZAMENTO_WELLINGTON.insightsMarketing;
  return (
    <div>
      <div style={{ background: 'rgba(237,161,0,0.08)', border: '1px solid #eda100', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#c7cfda', lineHeight: 1.5 }}>
        ⚠ {d.avisoMetodologico}
      </div>
      <div style={{ background: '#151b24', border: '1px solid #232c3a', borderRadius: 12, padding: 20, marginBottom: 18 }}>
        <div style={{ fontSize: 11, letterSpacing: 0.5, color: '#7a8699', marginBottom: 10, textTransform: 'uppercase' }}>Mapa de ênfase temática (não é frequência real)</div>
        <TagCloud termos={d.mapaEnfase as any} />
      </div>
      <div style={{ fontSize: 12, letterSpacing: 0.5, color: '#1baf7a', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>Temas obrigatórios</div>
      <ListaPriorizacao items={d.obrigatorios} tipo="obrigatorio" />
      <div style={{ fontSize: 12, letterSpacing: 0.5, color: '#eda100', fontWeight: 700, marginBottom: 8, marginTop: 18, textTransform: 'uppercase' }}>Temas que podem ser importantes (testar antes de escalar)</div>
      <ListaPriorizacao items={d.possiveis} tipo="possivel" />
      <div style={{ fontSize: 12, letterSpacing: 0.5, color: '#7a8699', fontWeight: 700, marginBottom: 8, marginTop: 18, textTransform: 'uppercase' }}>Temas irrelevantes / baixa prioridade</div>
      <ListaPriorizacao items={d.irrelevantes} tipo="irrelevante" />
    </div>
  );
}

function SinteseGeral() {
  const s = DATA_CRUZAMENTO_WELLINGTON.sintese;
  const Bloco = ({ titulo, items, cor }: { titulo: string; items: string[]; cor: string }) => (
    <div style={{ background: '#151b24', border: '1px solid #232c3a', borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 12, letterSpacing: 0.5, color: cor, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>{titulo}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {items.map((it, i) => (
          <li key={i} style={{ fontSize: 13.5, color: '#c7cfda', lineHeight: 1.6, marginBottom: 6 }}>{it}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <div>
      <div style={{ fontSize: 11, letterSpacing: 0.5, color: '#7a8699', marginBottom: 14, textTransform: 'uppercase' }}>
        Matriz de convergência — O'Cathain, Murphy & Nicholl (2010)
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
        <Bloco titulo="Agreement" items={s.agreement} cor={TIPO_STYLES.agreement.labelColor} />
        <Bloco titulo="Partial Agreement" items={s.partial_agreement} cor={TIPO_STYLES.partial_agreement.labelColor} />
        <Bloco titulo="Dissonance" items={s.dissonance} cor={TIPO_STYLES.dissonance.labelColor} />
        <Bloco titulo="Silence" items={s.silence} cor={TIPO_STYLES.silence.labelColor} />
        <Bloco titulo="Recomendações para próxima rodada qualitativa" items={s.recomendacoes} cor="#9aa4b2" />
      </div>
    </div>
  );
}

function AnaliseQualitativaIsolada() {
  const q = (DATA_CRUZAMENTO_WELLINGTON as any).analiseQualitativaIsolada;
  if (!q) return <div style={{ color: '#7a8699', fontSize: 13 }}>Análise qualitativa isolada indisponível.</div>;

  const Card = ({ titulo, cor, children }: { titulo: string; cor?: string; children: React.ReactNode }) => (
    <div style={{ background: '#151b24', border: '1px solid #232c3a', borderRadius: 12, padding: 18, marginBottom: 14, breakInside: 'avoid' }}>
      <div style={{ fontSize: 11, letterSpacing: 0.5, color: cor || '#7a8699', marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>{titulo}</div>
      {children}
    </div>
  );

  return (
    <div>
      <div style={{ fontSize: 13, color: '#9aa4b2', lineHeight: 1.5, marginBottom: 16, fontStyle: 'italic' }}>{q.descricao}</div>
      <div style={{ columnCount: 2, columnGap: 14 }} className="quali-columns">


      {q.fichaMetodologica && (
        <Card titulo="Ficha metodológica e lacunas">
          <div style={{ fontSize: 13, color: '#e8ecf1', marginBottom: 8 }}>{q.fichaMetodologica.cobertura}</div>
          <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
            {q.fichaMetodologica.lacunas.map((l: string, i: number) => (
              <li key={i} style={{ fontSize: 12.5, color: '#b8c0cc', lineHeight: 1.55, marginBottom: 5 }}>{l}</li>
            ))}
          </ul>
          <div style={{ fontSize: 12.5, color: '#eda100', fontStyle: 'italic' }}>{q.fichaMetodologica.recomendacao}</div>
        </Card>
      )}

      {q.diagnosticoMacro && (
        <Card titulo="Diagnóstico macro — Brasil x Paraná">
          <div style={{ fontSize: 14, color: '#e8ecf1', marginBottom: 8, lineHeight: 1.55 }}>{q.diagnosticoMacro.achado}</div>
          <div style={{ fontSize: 12.5, color: '#1baf7a', marginBottom: 6 }}>Força do achado: {q.diagnosticoMacro.forcaDoAchado}</div>
          <div style={{ fontSize: 12.5, color: '#b8c0cc' }}>{q.diagnosticoMacro.leituraLula}</div>
        </Card>
      )}

      {q.tipologiaDireitaParanaense && (
        <Card titulo="Tipologia da direita paranaense">
          {q.tipologiaDireitaParanaense.map((t: any, i: number) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#e8ecf1' }}>{t.subtipo}</div>
              <div style={{ fontSize: 12.5, color: '#b8c0cc', lineHeight: 1.5 }}>{t.descricao}</div>
            </div>
          ))}
        </Card>
      )}

      {q.ratinhoEixoGravitacional && (
        <Card titulo="Ratinho como eixo gravitacional">
          <div style={{ fontSize: 13.5, color: '#e8ecf1', marginBottom: 8, lineHeight: 1.55 }}>{q.ratinhoEixoGravitacional.leitura}</div>
          <div style={{ fontSize: 12.5, color: '#eda100', lineHeight: 1.5 }}>{q.ratinhoEixoGravitacional.limiteDoEfeitoHalo}</div>
        </Card>
      )}

      {q.moroLeituraFechada && (
        <Card titulo="Moro — leitura fechada da quali" cor="#4a94ec">
          <div style={{ fontSize: 12.5, color: '#1baf7a', marginBottom: 8 }}>Força: {(q.moroLeituraFechada.forca || []).join(', ')}</div>
          <div style={{ fontSize: 13, color: '#e34948', marginBottom: 10, lineHeight: 1.5 }}>{q.moroLeituraFechada.vulnerabilidadeCentral}</div>
          {q.moroLeituraFechada.autocriticaDoRelatorio && (
            <div style={{ background: 'rgba(74,148,236,0.10)', border: '1px solid #4a94ec', borderRadius: 8, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#4a94ec', fontWeight: 700, marginBottom: 4 }}>AUTOCRÍTICA DO PRÓPRIO RELATÓRIO</div>
              <div style={{ fontSize: 12.5, color: '#c7cfda', lineHeight: 1.5 }}>{q.moroLeituraFechada.autocriticaDoRelatorio}</div>
            </div>
          )}
          <div style={{ fontSize: 12.5, color: '#b8c0cc', marginBottom: 6 }}>{q.moroLeituraFechada.segmentacaoInterna}</div>
          <div style={{ fontSize: 12.5, color: '#b8c0cc' }}>{q.moroLeituraFechada.condicionanteMaisCritico}</div>
        </Card>
      )}

      {q.achadoMoroDeltanSubstituicao && (
        <Card titulo={q.achadoMoroDeltanSubstituicao.titulo} cor="#eda100">
          <div style={{ fontSize: 13, color: '#e8ecf1', marginBottom: 8, lineHeight: 1.55 }}>{q.achadoMoroDeltanSubstituicao.achado}</div>
          <div style={{ fontSize: 12.5, color: '#b8c0cc', lineHeight: 1.5 }}>{q.achadoMoroDeltanSubstituicao.implicacao}</div>
        </Card>
      )}

      {q.outrosPlayers && (
        <Card titulo="Outros players">
          {Object.entries(q.outrosPlayers).map(([k, v]: [string, any]) => (
            <div key={k} style={{ fontSize: 12.5, color: '#b8c0cc', marginBottom: 8, lineHeight: 1.5 }}>
              <b style={{ color: '#e8ecf1', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}:</b> {v}
            </div>
          ))}
        </Card>
      )}

      {q.pautasEstaduaisTestadas && (
        <Card titulo="Pautas estaduais testadas">
          {Object.entries(q.pautasEstaduaisTestadas).map(([k, v]: [string, any]) => (
            <div key={k} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#e8ecf1', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</div>
              <div style={{ fontSize: 12.5, color: '#b8c0cc', lineHeight: 1.5 }}>{v}</div>
            </div>
          ))}
        </Card>
      )}

      {q.tensaoInternaNaoResolvida && (
        <div style={{ background: 'rgba(227,73,72,0.08)', border: '1px solid #e34948', borderRadius: 12, padding: 18, breakInside: 'avoid' }}>
          <div style={{ fontSize: 11, letterSpacing: 0.5, color: '#e34948', marginBottom: 8, fontWeight: 700 }}>{q.tensaoInternaNaoResolvida.titulo}</div>
          <div style={{ fontSize: 13.5, color: '#e8ecf1', marginBottom: 8, lineHeight: 1.55 }}>{q.tensaoInternaNaoResolvida.achado}</div>
          <div style={{ fontSize: 12.5, color: '#c7cfda', lineHeight: 1.5 }}>{q.tensaoInternaNaoResolvida.implicacao}</div>
        </div>
      )}
      </div>
    </div>
  );
}

export default function CruzamentoQualiQuantiWellington() {
  const [ativa, setAtiva] = useState<string>(DATA_CRUZAMENTO_WELLINGTON.abas[0]?.id ?? 'sintese');
  const abaAtual = DATA_CRUZAMENTO_WELLINGTON.abas.find((a) => a.id === ativa);

  return (
    <div style={{ background: '#0c1117', borderRadius: 12, padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 4, fontSize: 11, letterSpacing: 1, color: '#7a8699', textTransform: 'uppercase' }}>
          Inteligência Wellington 2026 · Cruzamento Quali-Quanti
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 22, color: '#e8ecf1', margin: '4px 0 6px', fontWeight: 700 }}>Wellington Fagundes — Quanti x Quali por segmento</h2>
          <button
            onClick={async () => {
              const url = `${window.location.origin}/admin/cruzamento-wellington`;
              const ok = await (async () => {
                try {
                  if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(url);
                    return true;
                  }
                } catch {}
                try {
                  const ta = document.createElement('textarea');
                  ta.value = url;
                  ta.style.position = 'fixed';
                  ta.style.opacity = '0';
                  document.body.appendChild(ta);
                  ta.focus();
                  ta.select();
                  const done = document.execCommand('copy');
                  document.body.removeChild(ta);
                  return done;
                } catch {
                  return false;
                }
              })();
              if (ok) {
                toast.success('Link copiado', { description: 'Apenas usuários com acesso autorizado poderão visualizar.' });
              } else {
                window.prompt('Copie o link abaixo:', url);
              }
            }}

            style={{ flexShrink: 0, padding: '8px 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, border: '1px solid #2fa85a', background: '#0f2a1c', color: '#7ee0a1', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            title="Copiar link de acesso desta aba"
          >
            <LinkIcon size={14} /> Copiar link de acesso
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: '#7a8699', marginBottom: 14, lineHeight: 1.5 }}>
          Quanti: {DATA_CRUZAMENTO_WELLINGTON.fontes.quanti}<br />
          Quali: {DATA_CRUZAMENTO_WELLINGTON.fontes.quali}
        </div>


        <details style={{ marginBottom: 20, background: '#151b24', border: '1px solid #232c3a', borderRadius: 10, padding: '10px 16px' }}>
          <summary style={{ cursor: 'pointer', fontSize: 12.5, color: '#9aa4b2', fontWeight: 600 }}>Limitações metodológicas deste cruzamento</summary>
          <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
            {DATA_CRUZAMENTO_WELLINGTON.limitacoes.map((l, i) => (
              <li key={i} style={{ fontSize: 12.5, color: '#8b96a5', lineHeight: 1.55, marginBottom: 6 }}>{l}</li>
            ))}
          </ul>
        </details>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 18, borderBottom: '1px solid #232c3a' }}>
          <button onClick={() => setAtiva('qualitativa')} style={{ flexShrink: 0, padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', background: ativa === 'qualitativa' ? '#2a78d6' : '#151b24', color: ativa === 'qualitativa' ? '#fff' : '#b8c0cc' }}>
            Qualitativa
          </button>
          {DATA_CRUZAMENTO_WELLINGTON.abas.map((a) => (
            <button key={a.id} onClick={() => setAtiva(a.id)} style={{ flexShrink: 0, padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', background: ativa === a.id ? '#2a78d6' : '#151b24', color: ativa === a.id ? '#fff' : '#b8c0cc' }}>
              {a.label}
            </button>
          ))}
          <button onClick={() => setAtiva('marketing')} style={{ flexShrink: 0, padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', background: ativa === 'marketing' ? '#2a78d6' : '#151b24', color: ativa === 'marketing' ? '#fff' : '#b8c0cc' }}>
            Insights Marketing
          </button>
          <button onClick={() => setAtiva('sintese')} style={{ flexShrink: 0, padding: '8px 14px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer', background: ativa === 'sintese' ? '#2a78d6' : '#151b24', color: ativa === 'sintese' ? '#fff' : '#b8c0cc' }}>
            Síntese Geral
          </button>
        </div>

        {ativa === 'qualitativa' ? <AnaliseQualitativaIsolada /> : ativa === 'sintese' ? <SinteseGeral /> : ativa === 'marketing' ? <InsightsMarketing /> : abaAtual && <AbaConteudo aba={abaAtual} />}
      </div>
    </div>
  );
}

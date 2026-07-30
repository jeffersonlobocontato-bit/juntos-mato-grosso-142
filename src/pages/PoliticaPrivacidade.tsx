import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { useEffect } from "react";

const PoliticaPrivacidade = () => {
  useEffect(() => {
    document.title = "Política de Privacidade | Juntos Paraná 399";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header showSuggestionButton={false} />
      <main className="max-w-3xl mx-auto px-4 py-16 prose prose-sm sm:prose-base">
        <h1>Política de Privacidade</h1>
        <p className="text-muted-foreground">Última atualização: 30 de julho de 2026</p>

        <h2>1. Quem somos</h2>
        <p>
          Esta plataforma (juntosparana399.com.br) é operada por Juntos Paraná 399,
          em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD).
        </p>
        <p>
          <strong>Encarregado de Dados (DPO):</strong> sergiomoro@juntosparana399.com.br
        </p>

        <h2>2. Quais dados coletamos</h2>
        <ul>
          <li><strong>Nome</strong> — identificar a sugestão/opinião enviada</li>
          <li><strong>Telefone</strong> — validar autenticidade do envio e evitar fraude</li>
          <li><strong>Cidade/município</strong> — segmentar propostas por região do Paraná</li>
          <li><strong>Opinião/proposta enviada</strong> — finalidade central da plataforma</li>
          <li><strong>Áudio</strong> (quando enviado) — transcrição da opinião em texto</li>
          <li><strong>Geolocalização</strong> (quando autorizada) — associar sugestão à região</li>
          <li><strong>Dados de navegação</strong> — analytics e melhoria da plataforma (mediante consentimento)</li>
        </ul>
        <p>Não coletamos dados sensíveis (raça, saúde, orientação sexual, religião, etc.).</p>

        <h2>3. Com quem compartilhamos dados</h2>
        <ul>
          <li><strong>Meta (Facebook/Instagram)</strong> — via Conversions API, apenas mediante seu consentimento específico para publicidade. Dados enviados de forma criptografada (hash).</li>
          <li><strong>Google Analytics</strong> — dados de navegação, apenas mediante consentimento.</li>
          <li><strong>Supabase</strong> — nosso provedor de banco de dados e infraestrutura.</li>
          <li><strong>Mapbox</strong> — exibição de mapas, sem dados pessoais identificáveis.</li>
        </ul>
        <p>Não vendemos seus dados a terceiros.</p>

        <h2>4. Transferência internacional de dados</h2>
        <p>
          Alguns provedores acima (Meta, Google, Supabase) podem processar dados fora do Brasil,
          incluindo Estados Unidos, com base em mecanismos de garantia previstos no art. 33 da LGPD.
        </p>

        <h2>5. Cookies e rastreamento</h2>
        <p>
          Usamos cookies essenciais (sempre ativos), de analytics e de publicidade — estes dois
          últimos apenas após seu consentimento explícito, configurável a qualquer momento pelo
          banner exibido no site.
        </p>

        <h2>6. Seus direitos (art. 18 da LGPD)</h2>
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio,
          eliminação, portabilidade e revogação do consentimento sobre seus dados a qualquer momento,
          pelo contato: sergiomoro@juntosparana399.com.br.
        </p>

        <h2>7. Retenção e segurança</h2>
        <p>
          Mantemos seus dados pelo tempo necessário à finalidade da coleta ou conforme exigido por
          lei, com medidas técnicas de controle de acesso e restrição por linha no banco de dados.
        </p>

        <h2>8. Alterações desta política</h2>
        <p>Podemos atualizar esta política periodicamente. A data da última atualização está sempre no topo desta página.</p>
      </main>
      <Footer />
    </div>
  );
};

export default PoliticaPrivacidade;

import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";
import { useEffect } from "react";

const TermosDeUso = () => {
  useEffect(() => {
    document.title = "Termos de Uso | Juntos Paraná 399";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header showSuggestionButton={false} />
      <main className="max-w-3xl mx-auto px-4 py-16 prose prose-sm sm:prose-base">
        <h1>Termos de Uso</h1>

        <h2>1. Aceitação</h2>
        <p>
          Ao utilizar esta plataforma e enviar sua opinião, proposta ou sugestão, você concorda
          com estes Termos de Uso e com a{" "}
          <a href="/politica-privacidade">Política de Privacidade</a>.
        </p>

        <h2>2. Finalidade da plataforma</h2>
        <p>
          Esta plataforma tem como finalidade coletar sugestões e opiniões da população para
          subsidiar a construção de um plano de governo. O envio é voluntário.
        </p>

        <h2>3. Regras de envio</h2>
        <ul>
          <li>Você declara que as informações enviadas são verdadeiras e de sua autoria.</li>
          <li>É proibido o envio automatizado (bots, scripts) de opiniões, propostas ou cadastros.</li>
          <li>
            Reservamo-nos o direito de moderar, recusar ou remover conteúdo ofensivo,
            discriminatório, ilegal ou que viole direitos de terceiros.
          </li>
        </ul>

        <h2>4. Propriedade e uso do conteúdo enviado</h2>
        <p>
          Ao enviar sua opinião/proposta, você concede à plataforma o direito de utilizá-la, de
          forma agregada ou individual (conforme sua escolha de consentimento), para fins de
          análise e construção do plano de governo, incluindo eventual divulgação pública das
          propostas.
        </p>

        <h2>5. Limitação de responsabilidade</h2>
        <p>A plataforma não garante que todas as sugestões enviadas serão incorporadas ao plano de governo final.</p>

        <h2>6. Foro</h2>
        <p>Fica eleito o foro da comarca de Curitiba/PR para dirimir eventuais controvérsias.</p>
      </main>
      <Footer />
    </div>
  );
};

export default TermosDeUso;

import { MapPin, Mail, Phone, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <MapPin className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display font-bold text-2xl text-background">Rota 399</h3>
                <p className="text-sm text-background/60">Iniciativa Popular</p>
              </div>
            </div>
            <p className="text-background/70 max-w-md leading-relaxed mb-6">
              Uma iniciativa popular para construir colaborativamente um Plano de Governo 
              para o Paraná, ouvindo todos os 399 municípios.
            </p>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-bold text-lg text-background mb-4">Links Rápidos</h4>
            <ul className="space-y-3">
              <li>
                <a href="#sobre" className="text-background/70 hover:text-background transition-colors">
                  Sobre a Iniciativa
                </a>
              </li>
              <li>
                <a href="#mapa" className="text-background/70 hover:text-background transition-colors">
                  Mapa do Paraná
                </a>
              </li>
              <li>
                <a href="#indicadores" className="text-background/70 hover:text-background transition-colors">
                  Indicadores
                </a>
              </li>
              <li>
                <Link to="/dashboard" className="text-background/70 hover:text-background transition-colors">
                  Dashboard Completo
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-lg text-background mb-4">Contato</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-background/70">
                <Mail className="w-5 h-5 flex-shrink-0" />
                <span>contato@rota399.org.br</span>
              </li>
              <li className="flex items-center gap-3 text-background/70">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span>(41) 99999-0399</span>
              </li>
              <li className="flex items-start gap-3 text-background/70">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Curitiba - PR</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/50">
            © 2024 Rota 399 - Iniciativa Popular. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="text-background/50 hover:text-background/70 transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="text-background/50 hover:text-background/70 transition-colors">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import { MapPin, Mail, Phone, Instagram, Facebook, Linkedin, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

const socialNetworks = [
  { name: "Instagram", icon: Instagram, href: "https://instagram.com/juntosmatogrosso142", color: "hover:bg-gradient-to-br hover:from-[#833AB4] hover:via-[#FD1D1D] hover:to-[#F77737]" },
  { name: "Facebook", icon: Facebook, href: "https://facebook.com/juntosmatogrosso142", color: "hover:bg-[#1877F2]" },
  { name: "Twitter/X", icon: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ), href: "https://twitter.com/juntosmatogrosso142", color: "hover:bg-foreground hover:text-background" },
  { name: "LinkedIn", icon: Linkedin, href: "https://linkedin.com/company/juntosmatogrosso142", color: "hover:bg-[#0A66C2]" },
  { name: "YouTube", icon: Youtube, href: "https://youtube.com/@juntosmatogrosso142", color: "hover:bg-[#FF0000]" },
  { name: "TikTok", icon: () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  ), href: "https://tiktok.com/@juntosmatogrosso142", color: "hover:bg-foreground hover:text-background" },
];

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
                <h3 className="font-display font-bold text-2xl text-background">Juntos Mato Grosso 142</h3>
                <p className="text-sm text-background/60">Plano de Governo Colaborativo</p>
              </div>
            </div>
            <p className="text-background/70 max-w-md leading-relaxed mb-6">
              Uma iniciativa para construir colaborativamente um Plano de Governo 
              para Mato Grosso, ouvindo quem vive os 142 municípios.
            </p>
            
            {/* Social Networks */}
            <div>
              <p className="text-sm font-medium text-background mb-3">Siga-nos nas redes:</p>
              <div className="flex flex-wrap gap-2">
                {socialNetworks.map((social) => {
                  const IconComponent = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-10 h-10 rounded-lg bg-background/10 flex items-center justify-center transition-all duration-300 ${social.color} hover:text-white`}
                      title={social.name}
                    >
                      <IconComponent className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
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
                  Mapa de Mato Grosso
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
                <span>contato@juntosmatogrosso142.com.br</span>
              </li>
              <li className="flex items-center gap-3 text-background/70">
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span>[PENDENTE: telefone de contato MT]</span>
              </li>
              <li className="flex items-start gap-3 text-background/70">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>Cuiabá - MT</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/50">
            © 2026 Juntos Mato Grosso 142. Todos os direitos reservados.
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

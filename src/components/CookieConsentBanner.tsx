import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { getStoredConsent, saveConsent, applyConsent } from "@/lib/cookieConsent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);

  useEffect(() => {
    const existing = getStoredConsent();
    if (existing) {
      applyConsent(existing);
    } else {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const accept = () => {
    saveConsent({ analytics: true, ads: true });
    setVisible(false);
  };

  const reject = () => {
    saveConsent({ analytics: false, ads: false });
    setVisible(false);
  };

  const savePreferences = () => {
    saveConsent({ analytics, ads });
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] p-4 flex justify-center">
      <Card className="w-full max-w-2xl p-5 shadow-lg border-primary/20">
        {!configuring ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="text-sm text-muted-foreground flex-1">
              Usamos cookies para melhorar sua experiência e medir o desempenho de campanhas. Veja nossa{" "}
              <a href="/politica-privacidade" className="underline text-primary">
                Política de Privacidade
              </a>
              .
            </p>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setConfiguring(true)}>
                Configurar
              </Button>
              <Button variant="outline" size="sm" onClick={reject}>
                Recusar
              </Button>
              <Button size="sm" onClick={accept}>
                Aceitar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold">Preferências de cookies</h3>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked disabled />
              Essenciais (sempre ativos)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={analytics} onCheckedChange={(v) => setAnalytics(!!v)} />
              Analytics (Google Analytics)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={ads} onCheckedChange={(v) => setAds(!!v)} />
              Publicidade (Meta Pixel/CAPI)
            </label>
            <Button size="sm" onClick={savePreferences}>
              Salvar preferências
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

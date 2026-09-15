import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ADMIN_MODULES } from '@/config/adminModules';
import { useModuleVisibility } from '@/hooks/useModuleVisibility';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

/**
 * Aba lateral para o administrador escolher quais módulos ficam
 * disponíveis para os demais usuários da plataforma.
 */
const ModuleVisibilityPanel = () => {
  const { visibilityMap, isModuleVisible, isLoading } = useModuleVisibility();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const totalAtivos = ADMIN_MODULES.filter((m) => isModuleVisible(m.key)).length;

  const toggle = async (key: string, visible: boolean) => {
    setSaving(key);
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('module_visibility')
      .upsert(
        { module_key: key, visible, updated_by: authData.user?.id ?? null },
        { onConflict: 'module_key' }
      );
    setSaving(null);

    if (error) {
      toast.error('Não foi possível salvar essa alteração.');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['module-visibility'] });
    toast.success(visible ? 'Ferramenta liberada' : 'Ferramenta ocultada');
  };

  const setAll = async (visible: boolean) => {
    setSaving('all');
    const { data: authData } = await supabase.auth.getUser();
    const rows = ADMIN_MODULES.map((m) => ({
      module_key: m.key,
      visible,
      updated_by: authData.user?.id ?? null,
    }));
    const { error } = await supabase
      .from('module_visibility')
      .upsert(rows, { onConflict: 'module_key' });
    setSaving(null);

    if (error) {
      toast.error('Não foi possível salvar as alterações.');
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['module-visibility'] });
    toast.success(visible ? 'Todas as ferramentas liberadas' : 'Todas as ferramentas ocultadas');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">Ferramentas visíveis</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Ferramentas visíveis</SheetTitle>
          <SheetDescription>
            Escolha o que os demais usuários podem ver. O que estiver desligado some do painel deles
            — administradores continuam com acesso a tudo.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-2 py-3 border-b border-border">
          <span className="text-xs text-muted-foreground">
            {totalAtivos} de {ADMIN_MODULES.length} liberadas
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={saving === 'all'}
              onClick={() => setAll(true)}
            >
              <Eye className="w-4 h-4 mr-1" />
              Liberar tudo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={saving === 'all'}
              onClick={() => setAll(false)}
            >
              <EyeOff className="w-4 h-4 mr-1" />
              Ocultar tudo
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <ul className="divide-y divide-border py-2">
              {ADMIN_MODULES.map((m) => {
                const visible = visibilityMap[m.key] !== false;
                return (
                  <li key={m.key} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.href}</p>
                    </div>
                    <Switch
                      checked={visible}
                      disabled={saving === m.key || saving === 'all'}
                      onCheckedChange={(checked) => toggle(m.key, checked)}
                      aria-label={`Mostrar ${m.title} para outros usuários`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default ModuleVisibilityPanel;

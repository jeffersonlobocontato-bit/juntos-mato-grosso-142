import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ProposalTimechip } from './ProposalTimechip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, FileText, MapPin, Layers } from 'lucide-react';

interface Proposal {
  id: string;
  titulo: string;
  status: string;
  etapa: number;
  eixo_nome?: string;
  municipio_nome?: string;
  updated_at: string;
}

interface ProposalStatusEditorProps {
  proposal: Proposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho', description: 'Proposta em elaboração inicial' },
  { value: 'em_analise', label: 'Em Análise', description: 'Proposta em revisão e análise técnica' },
  { value: 'aprovada', label: 'Aprovada', description: 'Proposta aprovada para implementação' },
];

export const ProposalStatusEditor = ({
  proposal,
  open,
  onOpenChange,
  onSuccess,
}: ProposalStatusEditorProps) => {
  const [newStatus, setNewStatus] = useState<string>(proposal?.status || 'rascunho');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when proposal changes
  if (proposal && newStatus !== proposal.status && !isSubmitting) {
    setNewStatus(proposal.status);
    setNotes('');
  }

  const handleSubmit = async () => {
    if (!proposal) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('propostas_tecnicas')
        .update({
          status: newStatus as 'rascunho' | 'em_analise' | 'aprovada',
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (error) throw error;

      toast.success('Status atualizado com sucesso! Timer zerado.');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating proposal status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!proposal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Atualizar Status
          </SheetTitle>
          <SheetDescription>
            Atualize o status da proposta para zerar o timer de acompanhamento.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Proposal info */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm line-clamp-2">{proposal.titulo}</h4>
            
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {proposal.eixo_nome && (
                <span className="flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  {proposal.eixo_nome}
                </span>
              )}
              {proposal.municipio_nome && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {proposal.municipio_nome}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Última atualização:</span>
              <ProposalTimechip updatedAt={proposal.updated_at} showLabel size="sm" />
            </div>
          </div>

          {/* Status selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Novo Status</Label>
            <RadioGroup value={newStatus} onValueChange={setNewStatus} className="space-y-2">
              {STATUS_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                    newStatus === option.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-0.5" />
                  <div className="space-y-1">
                    <Label htmlFor={option.value} className="font-medium cursor-pointer">
                      {option.label}
                      {option.value === proposal.status && (
                        <span className="ml-2 text-xs text-muted-foreground">(atual)</span>
                      )}
                    </Label>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre esta atualização..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <SheetFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar e Zerar Timer'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

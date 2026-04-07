import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, MapPin, Layers, Mail, Phone, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  celular: string | null;
  cargo: string | null;
  created_at: string;
}

interface RoleUsersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleLabel: string;
  users: UserProfile[];
  eixos?: Record<string, string[]>;
  municipios?: Record<string, string[]>;
}

export function RoleUsersModal({
  open,
  onOpenChange,
  roleLabel,
  users,
  eixos = {},
  municipios = {},
}: RoleUsersModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            <Users className="h-5 w-5" />
            {roleLabel} ({users.length})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {users.map(u => {
            const userEixos = eixos[u.id] || [];
            const userMunicipios = municipios[u.id] || [];

            return (
              <Card key={u.id} className="border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="font-semibold text-sm">{u.full_name || "Sem nome"}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {u.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {u.email}
                          </span>
                        )}
                        {u.celular && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {u.celular}
                          </span>
                        )}
                        {u.cargo && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" /> {u.cargo}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cadastrado em {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>

                      {userEixos.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          <Layers className="h-3 w-3 text-muted-foreground" />
                          {userEixos.map(e => (
                            <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                          ))}
                        </div>
                      )}
                      {userMunicipios.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {userMunicipios.map(m => (
                            <Badge key={m} variant="outline" className="text-xs">{m}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado com esta função.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

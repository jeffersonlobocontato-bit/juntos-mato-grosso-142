import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Shield, UserCheck, MapPin, Briefcase, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import AdminPieChart from '@/components/admin/AdminPieChart';

type AppRole = 'admin' | 'lider_tematico' | 'curador_municipal' | 'especialista';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  lider_tematico: 'Líder Temático',
  curador_municipal: 'Curador Municipal',
  especialista: 'Especialista',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive text-destructive-foreground',
  lider_tematico: 'bg-primary text-primary-foreground',
  curador_municipal: 'bg-accent text-accent-foreground',
  especialista: 'bg-secondary text-secondary-foreground',
};

const AdminUsuarios = () => {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<AppRole | ''>('');

  // Fetch all profiles
  const { data: profiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['admin-profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch all user roles
  const { data: userRoles, isLoading: rolesLoading } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Add role mutation
  const addRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast({ title: 'Role adicionada com sucesso!' });
      setSelectedUserId(null);
      setNewRole('');
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao adicionar role', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      toast({ title: 'Role removida com sucesso!' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro ao remover role', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    navigate('/admin');
    return null;
  }

  const getUserRoles = (userId: string): AppRole[] => {
    return userRoles?.filter(r => r.user_id === userId).map(r => r.role as AppRole) || [];
  };

  // Calculate stats
  const totalUsers = profiles?.length || 0;
  const adminCount = userRoles?.filter(r => r.role === 'admin').length || 0;
  const leaderCount = userRoles?.filter(r => r.role === 'lider_tematico').length || 0;
  const curatorCount = userRoles?.filter(r => r.role === 'curador_municipal').length || 0;
  const specialistCount = userRoles?.filter(r => r.role === 'especialista').length || 0;

  // Chart data
  const roleDistributionData = [
    { name: 'Administradores', value: adminCount },
    { name: 'Líderes Temáticos', value: leaderCount },
    { name: 'Curadores Municipais', value: curatorCount },
    { name: 'Especialistas', value: specialistCount },
  ].filter(item => item.value > 0);

  const usersWithRolesCount = new Set(userRoles?.map(r => r.user_id)).size;
  const usersWithoutRoles = totalUsers - usersWithRolesCount;

  const userStatusData = [
    { name: 'Com roles', value: usersWithRolesCount },
    { name: 'Sem roles', value: usersWithoutRoles },
  ].filter(item => item.value > 0);

  const handleAddRole = () => {
    if (selectedUserId && newRole) {
      addRoleMutation.mutate({ userId: selectedUserId, role: newRole });
    }
  };

  const isLoading = profilesLoading || rolesLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
              <p className="text-muted-foreground">Gerencie usuários e suas permissões</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{adminCount}</p>
                  <p className="text-sm text-muted-foreground">Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{leaderCount}</p>
                  <p className="text-sm text-muted-foreground">Líderes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-2xl font-bold">{curatorCount}</p>
                  <p className="text-sm text-muted-foreground">Curadores</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Briefcase className="h-8 w-8 text-secondary-foreground" />
                <div>
                  <p className="text-2xl font-bold">{specialistCount}</p>
                  <p className="text-sm text-muted-foreground">Especialistas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts */}
        <motion.div 
          className="grid md:grid-cols-2 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AdminPieChart 
            title="Distribuição por Role" 
            data={roleDistributionData}
          />
          <AdminPieChart 
            title="Status dos Usuários" 
            data={userStatusData}
          />
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Usuários Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : profiles?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum usuário cadastrado
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>Adicionar Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles?.map((profile) => {
                      const roles = getUserRoles(profile.id);
                      return (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">
                            {profile.full_name || 'Sem nome'}
                          </TableCell>
                          <TableCell>{profile.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {roles.length === 0 ? (
                                <span className="text-muted-foreground text-sm">Sem roles</span>
                              ) : (
                                roles.map((role) => (
                                  <Badge 
                                    key={role} 
                                    className={`${ROLE_COLORS[role]} cursor-pointer`}
                                    onClick={() => {
                                      if (confirm(`Remover role "${ROLE_LABELS[role]}"?`)) {
                                        removeRoleMutation.mutate({ userId: profile.id, role });
                                      }
                                    }}
                                  >
                                    {ROLE_LABELS[role]}
                                    <Trash2 className="h-3 w-3 ml-1" />
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Select
                                value={selectedUserId === profile.id ? newRole : ''}
                                onValueChange={(value) => {
                                  setSelectedUserId(profile.id);
                                  setNewRole(value as AppRole);
                                }}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Selecionar role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(ROLE_LABELS)
                                    .filter(([key]) => !roles.includes(key as AppRole))
                                    .map(([key, label]) => (
                                      <SelectItem key={key} value={key}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              {selectedUserId === profile.id && newRole && (
                                <Button 
                                  size="icon" 
                                  onClick={handleAddRole}
                                  disabled={addRoleMutation.isPending}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default AdminUsuarios;

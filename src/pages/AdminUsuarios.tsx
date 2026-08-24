import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Users, Shield, UserCheck, MapPin, Briefcase, Plus, Trash2, UserPlus, Lock, Bot, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AdminPieChart from '@/components/admin/AdminPieChart';
import TimelineChart from '@/components/admin/TimelineChart';
import { HorizontalBarChart } from '@/components/admin/HorizontalBarChart';
import { EntrevistadorDetailModal } from '@/components/admin/EntrevistadorDetailModal';
import { RoleUsersModal } from '@/components/admin/RoleUsersModal';

type AppRole = 'admin' | 'admin_master' | 'lider_tematico' | 'curador_municipal' | 'especialista';

const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  admin_master: 'Admin Master',
  lider_tematico: 'Entrevistador/Líder',
  curador_municipal: 'Curador Temático',
  especialista: 'Especialista',
};

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive text-destructive-foreground',
  admin_master: 'bg-primary text-primary-foreground',
  lider_tematico: 'bg-blue-600 text-white',
  curador_municipal: 'bg-accent text-accent-foreground',
  especialista: 'bg-secondary text-secondary-foreground',
};

// Roles that can be assigned (not admin_master)
const ASSIGNABLE_ROLES: AppRole[] = ['admin', 'lider_tematico', 'curador_municipal', 'especialista'];

// Roles that require eixo assignment
const ROLES_REQUIRING_EIXOS: AppRole[] = ['lider_tematico', 'especialista'];

// Roles that require municipio assignment
const ROLES_REQUIRING_MUNICIPIOS: AppRole[] = ['curador_municipal'];

const AdminUsuarios = () => {
  const { user, isAdmin, isAdminMaster, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for role management
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<AppRole | ''>('');

  // State for new user form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserData, setNewUserData] = useState({
    full_name: '',
    email: '',
    celular: '',
    cargo: '',
    password: '',
  });
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [selectedEixos, setSelectedEixos] = useState<string[]>([]);
  const [selectedMunicipios, setSelectedMunicipios] = useState<string[]>([]);
  const [selectedHubFunctions, setSelectedHubFunctions] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // State for edit user
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserData, setEditUserData] = useState({
    full_name: '',
    celular: '',
    cargo: '',
  });
  const [editRoles, setEditRoles] = useState<AppRole[]>([]);
  const [editEixos, setEditEixos] = useState<string[]>([]);
  const [editMunicipios, setEditMunicipios] = useState<string[]>([]);
  const [editHubFunctions, setEditHubFunctions] = useState<string[]>([]);
  const [editModules, setEditModules] = useState<string[]>([]);

  // State for entrevistador detail modal
  const [selectedEntrevistadorId, setSelectedEntrevistadorId] = useState<string | null>(null);

  // State for role users modal
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string | null>(null);

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
    enabled: isAdmin || isAdminMaster,
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
    enabled: isAdmin || isAdminMaster,
  });

  // Fetch all eixos
  const { data: eixos } = useQuery({
    queryKey: ['eixos-tematicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eixos_tematicos')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: isAdminMaster,
  });

  // Fetch all municipios
  const { data: municipios } = useQuery({
    queryKey: ['municipios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('municipios')
        .select('id, nome')
        .order('nome');
      if (error) throw error;
      return data;
    },
    enabled: isAdminMaster,
  });

  // Fetch user_municipios relationships
  const { data: userMunicipios } = useQuery({
    queryKey: ['user-municipios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_municipios')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: isAdminMaster,
  });

  // Fetch AI Hub functions
  const { data: aiHubFunctions } = useQuery({
    queryKey: ['ai-hub-functions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_hub_functions')
        .select('*')
        .order('display_name');
      if (error) throw error;
      return data;
    },
    enabled: isAdminMaster,
  });

  // Fetch user AI Hub functions
  const { data: userHubFunctions } = useQuery({
    queryKey: ['user-ai-hub-functions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_ai_hub_functions')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: isAdminMaster,
  });

  // Fetch user modules (acesso a módulos do painel)
  const { data: allUserModules } = useQuery({
    queryKey: ['admin-user-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_modules')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin || isAdminMaster,
  });


  const { data: userEixos } = useQuery({
    queryKey: ['user-eixos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_eixos')
        .select('*');
      if (error) throw error;
      return data;
    },
    enabled: isAdminMaster,
  });

  // Fetch propostas for entrevistador chart
  const { data: propostas, isLoading: loadingPropostas } = useQuery({
    queryKey: ['admin-propostas-entrevistadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('propostas_tecnicas')
        .select('id, titulo, autor_id, entrevistado, status, etapa, tipo_proposta, created_at, eixo_id, tema_id, municipio_id, eixos_tematicos(nome), temas(nome), municipios(nome)');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin || isAdminMaster,
  });

  // Cadastros por entrevistador/líder
  const cadastrosPorEntrevistador = useMemo(() => {
    if (!propostas || !profiles) return [];
    const countMap: Record<string, { name: string; count: number; autorId: string }> = {};
    propostas.forEach(p => {
      if (!p.autor_id) return;
      if (!countMap[p.autor_id]) {
        const profile = profiles.find(pr => pr.id === p.autor_id);
        countMap[p.autor_id] = { name: profile?.full_name || 'Sem nome', count: 0, autorId: p.autor_id };
      }
      countMap[p.autor_id].count++;
    });
    return Object.values(countMap)
      .sort((a, b) => b.count - a.count)
      .map(item => ({
        name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
        fullName: item.name,
        value: item.count,
        autorId: item.autorId,
      }));
  }, [propostas, profiles]);

  const selectedEntrevistadorData = useMemo(() => {
    if (!selectedEntrevistadorId || !propostas) return { nome: '', propostas: [] };
    const item = cadastrosPorEntrevistador.find(e => e.autorId === selectedEntrevistadorId);
    const filtered = propostas
      .filter(p => p.autor_id === selectedEntrevistadorId)
      .map(p => ({
        id: p.id,
        titulo: p.titulo,
        entrevistado: p.entrevistado,
        status: p.status,
        etapa: p.etapa,
        tipo_proposta: p.tipo_proposta,
        created_at: p.created_at,
        eixo_id: p.eixo_id,
        eixo_nome: (p.eixos_tematicos as any)?.nome,
        tema_nome: (p.temas as any)?.nome,
        municipio_nome: (p.municipios as any)?.nome,
      }));
    return { nome: item?.fullName || '', propostas: filtered };
  }, [selectedEntrevistadorId, propostas, cadastrosPorEntrevistador]);

  const createUserMutation = useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      full_name: string;
      celular?: string;
      cargo?: string;
      roles: string[];
      eixo_ids: string[];
      municipio_ids?: string[];
      ai_hub_function_ids?: string[];
      module_keys?: string[];
    }) => {
      const { module_keys, ...payload } = data;
      const { data: result, error } = await supabase.functions.invoke('admin-create-user', {
        body: payload,
      });
      if (error) throw error;
      if (result.error) throw new Error(result.error);

      if (module_keys && module_keys.length > 0 && result?.user?.id) {
        const { error: modError } = await supabase.from('user_modules').insert(
          module_keys.map((key) => ({ user_id: result.user.id, module_key: key }))
        );
        if (modError) throw modError;
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-eixos'] });
      queryClient.invalidateQueries({ queryKey: ['user-municipios'] });
      queryClient.invalidateQueries({ queryKey: ['user-ai-hub-functions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-modules'] });
      toast({ title: 'Usuário criado com sucesso!' });
      resetCreateForm();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: result, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-eixos'] });
      queryClient.invalidateQueries({ queryKey: ['user-municipios'] });
      queryClient.invalidateQueries({ queryKey: ['user-ai-hub-functions'] });
      toast({ title: 'Usuário excluído com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message,
        variant: 'destructive',
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

  const resetCreateForm = () => {
    setShowCreateForm(false);
    setNewUserData({
      full_name: '',
      email: '',
      celular: '',
      cargo: '',
      password: '',
    });
    setSelectedRoles([]);
    setSelectedEixos([]);
    setSelectedMunicipios([]);
    setSelectedHubFunctions([]);
    setSelectedModules([]);
  };

  const openEditUser = (profile: any) => {
    const roles = getUserRolesRaw(profile.id);
    const eixoIds = userEixos?.filter(ue => ue.user_id === profile.id).map(ue => ue.eixo_id) || [];
    const municipioIds = userMunicipios?.filter(um => um.user_id === profile.id).map(um => um.municipio_id) || [];
    const hubFuncIds = userHubFunctions?.filter(uf => uf.user_id === profile.id).map(uf => uf.function_id) || [];
    const moduleKeys = allUserModules?.filter(um => um.user_id === profile.id).map(um => um.module_key) || [];

    setEditingUser(profile);
    setEditUserData({
      full_name: profile.full_name || '',
      celular: profile.celular || '',
      cargo: profile.cargo || '',
    });
    setEditRoles(roles);
    setEditEixos(eixoIds);
    setEditMunicipios(municipioIds);
    setEditHubFunctions(hubFuncIds);
    setEditModules(moduleKeys);
  };

  const getUserRolesRaw = (userId: string): AppRole[] => {
    return userRoles?.filter(r => r.user_id === userId).map(r => r.role as AppRole) || [];
  };

  const editUserMutation = useMutation({
    mutationFn: async () => {
      if (!editingUser) return;
      const userId = editingUser.id;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editUserData.full_name,
          celular: editUserData.celular || null,
          cargo: editUserData.cargo || null,
        })
        .eq('id', userId);
      if (profileError) throw profileError;

      // Sync roles
      const currentRoles = getUserRolesRaw(userId);
      const rolesToAdd = editRoles.filter(r => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter(r => !editRoles.includes(r));

      for (const role of rolesToRemove) {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role);
        if (error) throw error;
      }
      for (const role of rolesToAdd) {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role });
        if (error) throw error;
      }

      // Sync eixos
      const { error: delEixos } = await supabase.from('user_eixos').delete().eq('user_id', userId);
      if (delEixos) throw delEixos;
      if (editEixos.length > 0) {
        const { error: insEixos } = await supabase.from('user_eixos').insert(
          editEixos.map(eixoId => ({ user_id: userId, eixo_id: eixoId }))
        );
        if (insEixos) throw insEixos;
      }

      // Sync municipios
      const { error: delMun } = await supabase.from('user_municipios').delete().eq('user_id', userId);
      if (delMun) throw delMun;
      if (editMunicipios.length > 0) {
        const { error: insMun } = await supabase.from('user_municipios').insert(
          editMunicipios.map(munId => ({ user_id: userId, municipio_id: munId }))
        );
        if (insMun) throw insMun;
      }

      // Sync hub functions
      const { error: delHub } = await supabase.from('user_ai_hub_functions').delete().eq('user_id', userId);
      if (delHub) throw delHub;
      if (editHubFunctions.length > 0) {
        const { error: insHub } = await supabase.from('user_ai_hub_functions').insert(
          editHubFunctions.map(funcId => ({ user_id: userId, function_id: funcId }))
        );
        if (insHub) throw insHub;
      }

      // Sync módulos do painel
      const { error: delMod } = await supabase.from('user_modules').delete().eq('user_id', userId);
      if (delMod) throw delMod;
      if (editModules.length > 0) {
        const { error: insMod } = await supabase.from('user_modules').insert(
          editModules.map(key => ({ user_id: userId, module_key: key }))
        );
        if (insMod) throw insMod;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-eixos'] });
      queryClient.invalidateQueries({ queryKey: ['user-municipios'] });
      queryClient.invalidateQueries({ queryKey: ['user-ai-hub-functions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-user-modules'] });
      queryClient.invalidateQueries({ queryKey: ['user-modules'] });
      toast({ title: 'Usuário atualizado com sucesso!' });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreateUser = () => {
    if (!newUserData.full_name || !newUserData.email || !newUserData.password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome, email e senha',
        variant: 'destructive',
      });
      return;
    }

    if (selectedRoles.length === 0) {
      toast({
        title: 'Função obrigatória',
        description: 'Selecione pelo menos uma função',
        variant: 'destructive',
      });
      return;
    }

    const needsEixos = selectedRoles.some(r => ROLES_REQUIRING_EIXOS.includes(r));
    if (needsEixos && selectedEixos.length === 0) {
      toast({
        title: 'Eixos obrigatórios',
        description: 'Selecione pelo menos um eixo temático',
        variant: 'destructive',
      });
      return;
    }

    const needsMunicipios = selectedRoles.some(r => ROLES_REQUIRING_MUNICIPIOS.includes(r));
    if (needsMunicipios && selectedMunicipios.length === 0) {
      toast({
        title: 'Municípios obrigatórios',
        description: 'Selecione pelo menos um município',
        variant: 'destructive',
      });
      return;
    }

    createUserMutation.mutate({
      email: newUserData.email,
      password: newUserData.password,
      full_name: newUserData.full_name,
      celular: newUserData.celular || undefined,
      cargo: newUserData.cargo || undefined,
      roles: selectedRoles,
      eixo_ids: selectedEixos,
      municipio_ids: needsMunicipios ? selectedMunicipios : undefined,
      ai_hub_function_ids: selectedHubFunctions.length > 0 ? selectedHubFunctions : undefined,
      module_keys: selectedModules,
    });
  };

  const toggleRole = (role: AppRole) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleEixo = (eixoId: string) => {
    setSelectedEixos(prev =>
      prev.includes(eixoId)
        ? prev.filter(e => e !== eixoId)
        : [...prev, eixoId]
    );
  };

  const toggleMunicipio = (municipioId: string) => {
    setSelectedMunicipios(prev =>
      prev.includes(municipioId)
        ? prev.filter(m => m !== municipioId)
        : [...prev, municipioId]
    );
  };

  const toggleHubFunction = (funcId: string) => {
    setSelectedHubFunctions(prev =>
      prev.includes(funcId)
        ? prev.filter(f => f !== funcId)
        : [...prev, funcId]
    );
  };

  const getUserHubFunctions = (userId: string): string[] => {
    return userHubFunctions?.filter(uf => uf.user_id === userId).map(uf => {
      const func = aiHubFunctions?.find(f => f.id === uf.function_id);
      return func?.display_name || '';
    }).filter(Boolean) || [];
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || (!isAdmin && !isAdminMaster)) {
    navigate('/admin');
    return null;
  }

  const getUserRoles = (userId: string): AppRole[] => {
    return userRoles?.filter(r => r.user_id === userId).map(r => r.role as AppRole) || [];
  };

  const getUserEixos = (userId: string): string[] => {
    return userEixos?.filter(ue => ue.user_id === userId).map(ue => {
      const eixo = eixos?.find(e => e.id === ue.eixo_id);
      return eixo?.nome || '';
    }).filter(Boolean) || [];
  };

  // Calculate stats
  const totalUsers = profiles?.length || 0;
  const adminMasterCount = userRoles?.filter(r => r.role === 'admin_master').length || 0;
  const adminCount = userRoles?.filter(r => r.role === 'admin').length || 0;
  const leaderCount = userRoles?.filter(r => r.role === 'lider_tematico').length || 0;
  const curatorCount = userRoles?.filter(r => r.role === 'curador_municipal').length || 0;
  const specialistCount = userRoles?.filter(r => r.role === 'especialista').length || 0;

  // Get users by role for modal
  const getUsersByRole = (role: string | null) => {
    if (!role || !profiles || !userRoles) return [];
    if (role === 'all') return profiles;
    const userIds = userRoles.filter(r => r.role === role).map(r => r.user_id);
    return profiles.filter(p => userIds.includes(p.id));
  };

  const getRoleEixosMap = () => {
    const map: Record<string, string[]> = {};
    userEixos?.forEach(ue => {
      const eixo = eixos?.find(e => e.id === ue.eixo_id);
      if (eixo) {
        if (!map[ue.user_id]) map[ue.user_id] = [];
        map[ue.user_id].push(eixo.nome);
      }
    });
    return map;
  };

  const getRoleMunicipiosMap = () => {
    const map: Record<string, string[]> = {};
    userMunicipios?.forEach(um => {
      const mun = municipios?.find(m => m.id === um.municipio_id);
      if (mun) {
        if (!map[um.user_id]) map[um.user_id] = [];
        map[um.user_id].push(mun.nome);
      }
    });
    return map;
  };

  const roleModalLabel: Record<string, string> = {
    all: 'Todos os Usuários',
    admin_master: 'Admin Master',
    admin: 'Administradores',
    lider_tematico: 'Entrevistadores/Líderes',
    curador_municipal: 'Curadores Temáticos',
    especialista: 'Especialistas',
  };

  // Chart data
  const roleDistributionData = [
    { name: 'Admin Master', value: adminMasterCount },
    { name: 'Administradores', value: adminCount },
    { name: 'Entrevistadores/Líderes', value: leaderCount },
    { name: 'Curadores Temáticos', value: curatorCount },
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
  const needsEixoSelection = selectedRoles.some(r => ROLES_REQUIRING_EIXOS.includes(r));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gestão de Usuários</h1>
                <p className="text-muted-foreground">
                  {isAdminMaster ? 'Cadastre e gerencie usuários e permissões' : 'Visualize usuários e permissões'}
                </p>
              </div>
            </div>
            {isAdminMaster && (
              <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Cadastrar Usuário
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Access Restricted Message for non-admin_master */}
        {!isAdminMaster && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Lock className="h-6 w-6 text-amber-500" />
                  <div>
                    <p className="font-semibold text-foreground">Acesso Limitado</p>
                    <p className="text-muted-foreground text-sm">
                      Apenas usuários com perfil Admin Master podem cadastrar novos usuários e gerenciar eixos de acesso.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Create User Form - Only for admin_master */}
        {isAdminMaster && showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Cadastrar Novo Usuário
                </CardTitle>
                <CardDescription>
                  Preencha os dados do novo usuário, selecione suas funções e eixos de acesso.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Identification Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="full_name">Nome Completo *</Label>
                    <Input
                      id="full_name"
                      value={newUserData.full_name}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Nome completo do usuário"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="celular">Celular</Label>
                    <Input
                      id="celular"
                      type="tel"
                      value={newUserData.celular}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, celular: e.target.value }))}
                      placeholder="(41) 99999-9999"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cargo">Cargo/Função</Label>
                    <Input
                      id="cargo"
                      value={newUserData.cargo}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, cargo: e.target.value }))}
                      placeholder="Ex: Coordenador de Saúde"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="password">Senha Temporária *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Senha que o usuário usará no primeiro acesso"
                    />
                  </div>
                </div>

                {/* Roles Selection */}
                <div>
                  <Label className="mb-3 block">Funções *</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {ASSIGNABLE_ROLES.map((role) => (
                      <div
                        key={role}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedRoles.includes(role)
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => toggleRole(role)}
                      >
                        <Checkbox
                          checked={selectedRoles.includes(role)}
                          onCheckedChange={() => toggleRole(role)}
                        />
                        <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Eixos Selection - Only show if role requires it */}
                {needsEixoSelection && (
                  <div>
                    <Label className="mb-3 block">
                      Eixos Temáticos (acesso permitido) *
                    </Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {eixos?.map((eixo) => (
                        <div
                          key={eixo.id}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedEixos.includes(eixo.id)
                              ? 'border-primary bg-primary/10'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => toggleEixo(eixo.id)}
                        >
                          <Checkbox
                            checked={selectedEixos.includes(eixo.id)}
                            onCheckedChange={() => toggleEixo(eixo.id)}
                          />
                          <span className="text-sm font-medium">{eixo.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Municipios Selection - Only show if curador_municipal role is selected */}
                {selectedRoles.includes('curador_municipal') && (
                  <div>
                    <Label className="mb-3 block">
                      Municípios (acesso permitido) *
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Selecione os municípios que este curador poderá gerenciar.
                    </p>
                    <div className="max-h-60 overflow-y-auto border rounded-lg p-2">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {municipios?.map((municipio) => (
                          <div
                            key={municipio.id}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              selectedMunicipios.includes(municipio.id)
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => toggleMunicipio(municipio.id)}
                          >
                            <Checkbox
                              checked={selectedMunicipios.includes(municipio.id)}
                              onCheckedChange={() => toggleMunicipio(municipio.id)}
                            />
                            <span className="text-xs font-medium truncate">{municipio.nome}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedMunicipios.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedMunicipios.length} município(s) selecionado(s)
                      </p>
                    )}
                  </div>
                )}

                {/* AI Hub Functions Selection */}
                {aiHubFunctions && aiHubFunctions.length > 0 && (
                  <div>
                    <Label className="mb-3 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Funções do HUB de IA (opcional)
                    </Label>
                    <p className="text-sm text-muted-foreground mb-3">
                      Selecione as funções profissionais para acesso aos agentes de IA.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {aiHubFunctions.map((func) => (
                        <div
                          key={func.id}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedHubFunctions.includes(func.id)
                              ? 'border-violet-500 bg-violet-500/10'
                              : 'border-border hover:border-violet-500/50'
                          }`}
                          onClick={() => toggleHubFunction(func.id)}
                        >
                          <Checkbox
                            checked={selectedHubFunctions.includes(func.id)}
                            onCheckedChange={() => toggleHubFunction(func.id)}
                          />
                          <span className="text-sm font-medium">{func.display_name}</span>
                        </div>
                      ))}
                    </div>
                    {selectedHubFunctions.length > 0 && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedHubFunctions.length} função(ões) selecionada(s)
                      </p>
                    )}
                  </div>
                )}

                {/* Módulos do painel */}
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <Label className="flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      Módulos liberados no painel
                    </Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedModules(ADMIN_MODULES.map(m => m.key))}>
                        Selecionar todos
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedModules([])}>
                        Limpar
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Marque os módulos que este usuário poderá acessar. Se nenhum for marcado, valem apenas as permissões por função.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {ADMIN_MODULES.map((mod) => (
                      <div
                        key={mod.key}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedModules.includes(mod.key) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => toggleModule(mod.key)}
                      >
                        <Checkbox
                          checked={selectedModules.includes(mod.key)}
                          onCheckedChange={() => toggleModule(mod.key)}
                        />
                        <span className="text-sm font-medium truncate">{mod.title}</span>
                      </div>
                    ))}
                  </div>
                </div>


                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={resetCreateForm}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? 'Cadastrando...' : 'Cadastrar Usuário'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Cards */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedRoleFilter('all')}>
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
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedRoleFilter('admin_master')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{adminMasterCount}</p>
                  <p className="text-sm text-muted-foreground">Master</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedRoleFilter('admin')}>
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
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedRoleFilter('lider_tematico')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{leaderCount}</p>
                  <p className="text-sm text-muted-foreground">Entrevistadores/Líderes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedRoleFilter('curador_municipal')}>
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
          <Card className="cursor-pointer hover:shadow-md transition-all" onClick={() => setSelectedRoleFilter('especialista')}>
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

        {/* Timeline Chart */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <TimelineChart
            title="Evolução de Cadastros de Usuários"
            series={[
              {
                key: 'usuarios',
                label: 'Usuários Cadastrados',
                color: 'hsl(var(--primary))',
                data: profiles || [],
              },
            ]}
          />
        </motion.div>

        {/* Charts */}
        <motion.div 
          className="grid md:grid-cols-2 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
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

        {/* Cadastros por Entrevistador */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <HorizontalBarChart
            title="Cadastros por Entrevistador/Líder"
            data={cadastrosPorEntrevistador}
            isLoading={loadingPropostas}
            onBarClick={(item) => {
              if ((item as any).autorId) setSelectedEntrevistadorId((item as any).autorId);
            }}
          />
        </motion.div>

        <EntrevistadorDetailModal
          open={!!selectedEntrevistadorId}
          onOpenChange={(open) => { if (!open) setSelectedEntrevistadorId(null); }}
          entrevistadorNome={selectedEntrevistadorData.nome}
          propostas={selectedEntrevistadorData.propostas}
        />


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
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roles</TableHead>
                        {isAdminMaster && <TableHead>Eixos</TableHead>}
                        {isAdminMaster && <TableHead>Funções IA</TableHead>}
                        {isAdminMaster && <TableHead>Adicionar Role</TableHead>}
                        {isAdminMaster && <TableHead>Ações</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profiles?.map((profile) => {
                        const roles = getUserRoles(profile.id);
                        const eixosNomes = isAdminMaster ? getUserEixos(profile.id) : [];
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
                                      className={`${ROLE_COLORS[role]} ${isAdminMaster ? 'cursor-pointer' : ''}`}
                                      onClick={() => {
                                        if (isAdminMaster && confirm(`Remover role "${ROLE_LABELS[role]}"?`)) {
                                          removeRoleMutation.mutate({ userId: profile.id, role });
                                        }
                                      }}
                                    >
                                      {ROLE_LABELS[role]}
                                      {isAdminMaster && <Trash2 className="h-3 w-3 ml-1" />}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </TableCell>
                            {isAdminMaster && (
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {eixosNomes.length === 0 ? (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  ) : (
                                    eixosNomes.map((nome) => (
                                      <Badge key={nome} variant="outline" className="text-xs">
                                        {nome}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {isAdminMaster && (
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {getUserHubFunctions(profile.id).length === 0 ? (
                                    <span className="text-muted-foreground text-sm">-</span>
                                  ) : (
                                    getUserHubFunctions(profile.id).map((nome) => (
                                      <Badge key={nome} variant="outline" className="text-xs border-violet-500/50 text-violet-600">
                                        {nome}
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </TableCell>
                            )}
                            {isAdminMaster && (
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
                                      {ASSIGNABLE_ROLES
                                        .filter((key) => !roles.includes(key))
                                        .map((key) => (
                                          <SelectItem key={key} value={key}>
                                            {ROLE_LABELS[key]}
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
                            )}
                            {isAdminMaster && (
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => openEditUser(profile)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    disabled={deleteUserMutation.isPending || profile.id === user?.id}
                                    onClick={() => {
                                      if (confirm(`Tem certeza que deseja excluir "${profile.full_name || profile.email}"? Esta ação é irreversível.`)) {
                                        deleteUserMutation.mutate(profile.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5" />
                Editar Usuário
              </DialogTitle>
              <DialogDescription>
                Edite os dados de {editingUser?.full_name || editingUser?.email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Profile Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_full_name">Nome Completo</Label>
                  <Input
                    id="edit_full_name"
                    value={editUserData.full_name}
                    onChange={(e) => setEditUserData(prev => ({ ...prev, full_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={editingUser?.email || ''} disabled className="opacity-60" />
                </div>
                <div>
                  <Label htmlFor="edit_celular">Celular</Label>
                  <Input
                    id="edit_celular"
                    value={editUserData.celular}
                    onChange={(e) => setEditUserData(prev => ({ ...prev, celular: e.target.value }))}
                    placeholder="(41) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_cargo">Cargo/Função</Label>
                  <Input
                    id="edit_cargo"
                    value={editUserData.cargo}
                    onChange={(e) => setEditUserData(prev => ({ ...prev, cargo: e.target.value }))}
                  />
                </div>
              </div>

              {/* Roles */}
              <div>
                <Label className="mb-3 block">Funções</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ASSIGNABLE_ROLES.map((role) => (
                    <div
                      key={role}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        editRoles.includes(role)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setEditRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])}
                    >
                      <Checkbox checked={editRoles.includes(role)} onCheckedChange={() => setEditRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])} />
                      <span className="text-sm font-medium">{ROLE_LABELS[role]}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Eixos */}
              {editRoles.some(r => ROLES_REQUIRING_EIXOS.includes(r)) && (
                <div>
                  <Label className="mb-3 block">Eixos Temáticos</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {eixos?.map((eixo) => (
                      <div
                        key={eixo.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          editEixos.includes(eixo.id) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => setEditEixos(prev => prev.includes(eixo.id) ? prev.filter(e => e !== eixo.id) : [...prev, eixo.id])}
                      >
                        <Checkbox checked={editEixos.includes(eixo.id)} onCheckedChange={() => setEditEixos(prev => prev.includes(eixo.id) ? prev.filter(e => e !== eixo.id) : [...prev, eixo.id])} />
                        <span className="text-sm font-medium">{eixo.nome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Municipios */}
              {editRoles.includes('curador_municipal') && (
                <div>
                  <Label className="mb-3 block">Municípios</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {municipios?.map((mun) => (
                        <div
                          key={mun.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                            editMunicipios.includes(mun.id) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => setEditMunicipios(prev => prev.includes(mun.id) ? prev.filter(m => m !== mun.id) : [...prev, mun.id])}
                        >
                          <Checkbox checked={editMunicipios.includes(mun.id)} onCheckedChange={() => setEditMunicipios(prev => prev.includes(mun.id) ? prev.filter(m => m !== mun.id) : [...prev, mun.id])} />
                          <span className="text-xs font-medium truncate">{mun.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Hub Functions */}
              {aiHubFunctions && aiHubFunctions.length > 0 && (
                <div>
                  <Label className="mb-3 flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Funções do HUB de IA
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {aiHubFunctions.map((func) => (
                      <div
                        key={func.id}
                        className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                          editHubFunctions.includes(func.id) ? 'border-violet-500 bg-violet-500/10' : 'border-border hover:border-violet-500/50'
                        }`}
                        onClick={() => setEditHubFunctions(prev => prev.includes(func.id) ? prev.filter(f => f !== func.id) : [...prev, func.id])}
                      >
                        <Checkbox checked={editHubFunctions.includes(func.id)} onCheckedChange={() => setEditHubFunctions(prev => prev.includes(func.id) ? prev.filter(f => f !== func.id) : [...prev, func.id])} />
                        <span className="text-sm font-medium">{func.display_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
                <Button onClick={() => editUserMutation.mutate()} disabled={editUserMutation.isPending}>
                  {editUserMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Role Users Modal */}
        <RoleUsersModal
          open={!!selectedRoleFilter}
          onOpenChange={(open) => { if (!open) setSelectedRoleFilter(null); }}
          roleLabel={roleModalLabel[selectedRoleFilter || ''] || ''}
          users={getUsersByRole(selectedRoleFilter)}
          eixos={getRoleEixosMap()}
          municipios={getRoleMunicipiosMap()}
        />
      </main>
    </div>
  );
};

export default AdminUsuarios;

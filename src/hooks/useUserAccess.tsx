import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface UserEixo {
  eixo_id: string;
  eixo_nome?: string;
}

interface UserMunicipio {
  municipio_id: string;
  municipio_nome?: string;
}

export const useUserAccess = () => {
  const { user, roles, hasRole, isAdmin } = useAuth();
  const [userEixos, setUserEixos] = useState<UserEixo[]>([]);
  const [userMunicipios, setUserMunicipios] = useState<UserMunicipio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAdminMaster = hasRole('admin_master');
  const isLiderTematico = hasRole('lider_tematico');
  const isCuradorMunicipal = hasRole('curador_municipal');
  const isEspecialista = hasRole('especialista');

  useEffect(() => {
    const fetchUserAccess = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Fetch user eixos
        const { data: eixosData } = await supabase
          .from('user_eixos')
          .select('eixo_id, eixos_tematicos(nome)')
          .eq('user_id', user.id);

        if (eixosData) {
          setUserEixos(eixosData.map(e => ({
            eixo_id: e.eixo_id,
            eixo_nome: (e.eixos_tematicos as any)?.nome
          })));
        }

        // Fetch user municipios
        const { data: municipiosData } = await supabase
          .from('user_municipios')
          .select('municipio_id, municipios(nome)')
          .eq('user_id', user.id);

        if (municipiosData) {
          setUserMunicipios(municipiosData.map(m => ({
            municipio_id: m.municipio_id,
            municipio_nome: (m.municipios as any)?.nome
          })));
        }
      } catch (error) {
        console.error('Error fetching user access:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserAccess();
  }, [user]);

  // Helper to check if user can access a specific eixo
  const canAccessEixo = (eixoId: string): boolean => {
    if (isAdmin || isAdminMaster) return true;
    return userEixos.some(e => e.eixo_id === eixoId);
  };

  // Helper to check if user can access a specific municipio
  const canAccessMunicipio = (municipioId: string): boolean => {
    if (isAdmin || isAdminMaster) return true;
    return userMunicipios.some(m => m.municipio_id === municipioId);
  };

  // Check if user can access mensageria
  const canAccessMensageria = isAdmin || isAdminMaster || isLiderTematico;

  // Get eixo IDs for filtering
  const getEixoIds = (): string[] => {
    return userEixos.map(e => e.eixo_id);
  };

  // Get municipio IDs for filtering
  const getMunicipioIds = (): string[] => {
    return userMunicipios.map(m => m.municipio_id);
  };

  // Get access type for dashboard display
  const getAccessType = (): 'full' | 'eixo' | 'municipio' | 'own' | 'public' => {
    if (isAdmin || isAdminMaster) return 'full';
    if (isLiderTematico && userEixos.length > 0) return 'eixo';
    if (isCuradorMunicipal && userMunicipios.length > 0) return 'municipio';
    if (isEspecialista) return 'own';
    return 'public';
  };

  return {
    // States
    isLoading,
    userEixos,
    userMunicipios,
    
    // Role checks
    isAdmin,
    isAdminMaster,
    isLiderTematico,
    isCuradorMunicipal,
    isEspecialista,
    
    // Access helpers
    canAccessEixo,
    canAccessMunicipio,
    canAccessMensageria,
    getEixoIds,
    getMunicipioIds,
    getAccessType,
    
    // User info
    userId: user?.id,
  };
};

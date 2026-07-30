import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, LogIn, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

// Chave pública (site key) do reCAPTCHA v3 — pode ficar no código-fonte.
const RECAPTCHA_SITE_KEY =
  (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined) ||
  '6Ldjc20tAAAAAOmwL6Poc7ieG6BQJyRXTRqt4-0l';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

function loadRecaptchaScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha) return resolve();
    if (!RECAPTCHA_SITE_KEY) return reject(new Error('reCAPTCHA site key não configurada'));
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Falha ao carregar reCAPTCHA'));
    document.head.appendChild(script);
  });
}

async function runLoginSecurityGate(): Promise<{ allowed: boolean; reason?: string }> {
  let token: string | null = null;
  try {
    await loadRecaptchaScript();
    token = await new Promise<string>((resolve, reject) => {
      window.grecaptcha!.ready(() => {
        window
          .grecaptcha!.execute(RECAPTCHA_SITE_KEY!, { action: 'login' })
          .then(resolve)
          .catch(reject);
      });
    });
  } catch (err) {
    // reCAPTCHA indisponível ou não configurado: seguimos apenas com o rate limit por IP.
    console.warn('reCAPTCHA indisponível, aplicando apenas limite por IP');
  }

  try {
    const { data, error } = await supabase.functions.invoke('verify-login-attempt', {
      body: { recaptcha_token: token },
    });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 429) return { allowed: false, reason: 'rate_limited' };
      if (status === 403) return { allowed: false, reason: 'recaptcha_failed' };
      return { allowed: true };
    }
    return data as { allowed: boolean; reason?: string };
  } catch (err) {
    console.error('login security gate failed', err);
    return { allowed: true };
  }
}

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { user, signIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Fetch roles to determine redirect
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .then(({ data }) => {
          const userRoles = data?.map(r => r.role) || [];
          if (userRoles.includes('admin') || userRoles.includes('admin_master')) {
            navigate('/admin');
          } else if (userRoles.includes('lider_tematico')) {
              navigate('/admin');
          } else {
            navigate('/');
          }
        });
    }
  }, [user, navigate]);

  const validateForm = () => {
    try {
      loginSchema.parse({ email, password });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Reforço anti-bot: reCAPTCHA v3 + limite de tentativas por IP, validados no servidor.
      const gate = await runLoginSecurityGate();
      if (!gate.allowed) {
        if (gate.reason === 'rate_limited') {
          toast.error('Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.');
        } else {
          toast.error('Não foi possível validar essa tentativa de login. Tente novamente.');
        }
        setIsLoading(false);
        return;
      }

      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Login realizado com sucesso!');
        const { data: { user: loggedUser } } = await supabase.auth.getUser();
        if (loggedUser) {
          const { data: rolesData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', loggedUser.id);
          const userRoles = rolesData?.map(r => r.role) || [];
          if (userRoles.includes('admin') || userRoles.includes('admin_master') || userRoles.includes('lider_tematico')) {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para o início</span>
        </Link>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <span className="text-3xl font-display font-black text-primary">JuntosParaná</span>
              <span className="text-3xl font-display font-black text-accent">399</span>
            </div>
            <CardTitle className="text-2xl font-display">
              Acessar Painel
            </CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o painel de gestão
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={errors.password ? 'border-destructive pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </span>
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Acesso restrito. Novas contas são criadas por um administrador.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;

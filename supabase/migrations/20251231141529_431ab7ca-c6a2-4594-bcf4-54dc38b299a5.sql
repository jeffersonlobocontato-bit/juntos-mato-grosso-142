-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'lider_tematico', 'curador_municipal', 'especialista');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create thematic axes table
CREATE TABLE public.eixos_tematicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  lider_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create municipalities table
CREATE TABLE public.municipios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo_ibge TEXT UNIQUE,
  regiao TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eixos_tematicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipios ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Eixos temáticos policies (public read, admin write)
CREATE POLICY "Anyone can view eixos"
ON public.eixos_tematicos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage eixos"
ON public.eixos_tematicos FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Municípios policies (public read, admin write)
CREATE POLICY "Anyone can view municipios"
ON public.municipios FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage municipios"
ON public.municipios FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default 8 eixos temáticos
INSERT INTO public.eixos_tematicos (nome, descricao) VALUES
  ('Educação', 'Políticas e propostas para educação pública'),
  ('Saúde', 'Sistema de saúde e bem-estar'),
  ('Segurança Pública', 'Segurança e ordem pública'),
  ('Infraestrutura', 'Obras, transporte e logística'),
  ('Agricultura e Meio Ambiente', 'Agronegócio e sustentabilidade'),
  ('Economia e Turismo', 'Desenvolvimento econômico e turístico'),
  ('Desenvolvimento Social', 'Assistência social e inclusão'),
  ('Tecnologia e Inovação', 'Transformação digital e inovação');
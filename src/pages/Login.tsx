import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMockAuth } from '@/contexts/MockAuthContext';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { z } from 'zod';
import logoTocha from '@/assets/logo-tocha.png';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export default function Login() {
  const navigate = useNavigate();
  const { signIn, loading, isAuthenticated, isAdmin } = useMockAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(isAdmin ? '/admin/dashboard' : '/dashboard');
    }
  }, [isAuthenticated, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validate form
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'email') fieldErrors.email = err.message;
        if (err.path[0] === 'password') fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error);
      return;
    }

    toast.success('Login realizado com sucesso!');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding with Logo */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-primary-foreground">
          {/* Logo da empresa */}
          <div className="mb-8">
            <img 
              src={logoTocha} 
              alt="Tocha - Ilumine sua ideia" 
              className="h-48 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-center mb-3">Sistema UBS HelpDesk</h1>
          <p className="text-lg text-center text-primary-foreground/80 max-w-md">
            Gestão de chamados para Unidades Básicas de Saúde
          </p>
          <div className="mt-10 grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-3xl font-bold">8</p>
              <p className="text-sm text-primary-foreground/70">Unidades</p>
            </div>
            <div>
              <p className="text-3xl font-bold">24h</p>
              <p className="text-sm text-primary-foreground/70">Suporte</p>
            </div>
            <div>
              <p className="text-3xl font-bold">100%</p>
              <p className="text-sm text-primary-foreground/70">Digital</p>
            </div>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-white/5 rounded-full" />
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center justify-center mb-8">
            <img 
              src={logoTocha} 
              alt="Tocha - Ilumine sua ideia" 
              className="h-24 w-auto object-contain mb-3"
            />
            <h1 className="text-xl font-bold">Sistema UBS HelpDesk</h1>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold">Bem-vindo(a)</CardTitle>
              <CardDescription>
                Entre com suas credenciais para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail ou Matrícula</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.email@ubs.gov.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                      disabled={loading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`pl-10 pr-10 ${errors.password ? 'border-destructive' : ''}`}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou continue com</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Entrar com Google
                </Button>
              </form>

              {/* Demo credentials */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">Credenciais de teste:</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Admin:</span> admin@ubs.gov.br</p>
                  <p><span className="font-medium">Enfermeira:</span> maria.silva@ubs.gov.br</p>
                  <p className="text-muted-foreground">Senha: qualquer (6+ caracteres)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            © 2025 UBS HelpDesk. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

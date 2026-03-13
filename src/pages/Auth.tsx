import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import logoTocha from '@/assets/logo-tocha.png';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Usuário é obrigatório'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres')
});

export default function Auth() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse({ username, password });
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    setLoading(true);
    const email = `${username.toLowerCase().trim()}@ubs.internal`;
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error);
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return <div className="min-h-screen flex">
      {/* Left side - Branding with Logo */}
      <div className="hidden lg:flex lg:w-1/2 sidebar-gradient items-center justify-center p-12">
        <div className="max-w-md text-center flex flex-col items-center">
          <div className="mb-8">
            <img src={logoTocha} alt="Tocha - Ilumine sua ideia" className="h-48 w-auto object-contain" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Sistema de Chamados</h1>
          <p className="text-lg text-white/80 leading-relaxed">​By Fellype Rocha      </p>
          <div className="mt-12 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-white/70">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Acesso seguro</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="lg:hidden mb-6 flex justify-center">
              <img src={logoTocha} alt="Tocha - Ilumine sua ideia" className="h-24 w-auto object-contain" />
            </div>
            <CardTitle className="text-2xl font-semibold">Bem-vindo</CardTitle>
            <CardDescription className="text-muted-foreground">
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Usuário
                </Label>
                <Input id="username" type="text" placeholder="Digite seu usuário" value={username} onChange={e => setUsername(e.target.value)} required className="h-11" autoComplete="username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha
                </Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    className="h-11 pr-10" 
                    autoComplete="current-password" 
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full h-11 btn-gradient font-medium" disabled={loading}>
                {loading ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </> : 'Entrar'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Problemas para acessar? Contate o administrador.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>;
}
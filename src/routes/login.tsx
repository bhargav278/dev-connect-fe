import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { IconArrowRight, IconAt, IconLock } from '@tabler/icons-react';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as yup from 'yup';
import { login } from '../features/auth/auth.api';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { yupValidate } from '../utils/yupValidate';
import { AuthShell } from '../components/auth/AuthShell';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

const loginSchema = yup.object({
  email: yup.string().trim().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
});

function LoginPage() {
  const navigate = useNavigate();

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: yupValidate(loginSchema),
  });

  const loginMutation = useMutation({ 
    mutationFn: login, 
    onSuccess: () => {
      toast.success('Login successful');
      navigate({ to: '/feed', search: { mode: 'following' } });
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to DevConnect using your email and password."
      footer={
        <div className="flex items-center justify-between text-sm text-zinc-300">
          <span>New here?</span>
          <Link
            to="/create-user"
            className="rounded-lg px-2 py-1 font-medium text-indigo-300 hover:bg-white/5 hover:text-indigo-200"
          >
            Create an account
          </Link>
        </div>
      }
    >
      <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-5">
        <form
          className="grid gap-4"
          onSubmit={form.onSubmit((values) => {
              loginMutation.mutate(values);
          })}
        >
          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-200">Email</span>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 ring-1 ring-transparent focus-within:ring-indigo-500/40">
              <IconAt className="size-5 text-zinc-400" />
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
                {...form.getInputProps('email')}
              />
            </div>
            {form.errors.email && <p className="text-xs text-rose-300">{form.errors.email}</p>}
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-zinc-200">Password</span>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/40 px-3 py-2.5 ring-1 ring-transparent focus-within:ring-indigo-500/40">
              <IconLock className="size-5 text-zinc-400" />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
                {...form.getInputProps('password')}
              />
            </div>
            {form.errors.password && <p className="text-xs text-rose-300">{form.errors.password}</p>}
          </label>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/20 hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            <IconArrowRight className="size-5" />
          </button>
        </form>
      </div>
    </AuthShell>
  );
}


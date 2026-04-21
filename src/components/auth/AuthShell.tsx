import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { IconBolt, IconShieldLock, IconSparkles } from '@tabler/icons-react';

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)]">
      <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(900px_circle_at_30%_20%,rgba(99,102,241,0.18),transparent_55%),radial-gradient(700px_circle_at_80%_30%,rgba(34,197,94,0.10),transparent_60%)]" />

        <div className="grid lg:grid-cols-2">
          <aside className="hidden border-r border-white/10 p-10 lg:block">
            <Link to="/login" className="inline-flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                <IconBolt className="size-5" />
              </span>
              <span>DevConnect</span>
            </Link>

            <h2 className="mt-10 text-2xl font-semibold tracking-tight text-white">Build your developer network.</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Share posts, follow people, and keep your profile polished — with secure auth and a clean UI.
            </p>

            <div className="mt-8 grid gap-4 text-sm text-zinc-300">
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
                <IconShieldLock className="mt-0.5 size-5 text-indigo-300" />
                <div>
                  <div className="font-medium text-zinc-100">Secure by default</div>
                  <div className="mt-1">Refresh token stays HttpOnly; access token auto-refreshes on 401.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
                <IconSparkles className="mt-0.5 size-5 text-emerald-300" />
                <div>
                  <div className="font-medium text-zinc-100">Consistent UI</div>
                  <div className="mt-1">Reusable auth shell that matches the rest of the app.</div>
                </div>
              </div>
            </div>
          </aside>

          <section className="p-8 sm:p-10">
            <div className="mx-auto max-w-md">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-white">{title}</h1>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{subtitle}</p>

              <div className="mt-8">{children}</div>

              {footer ? <div className="mt-6">{footer}</div> : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


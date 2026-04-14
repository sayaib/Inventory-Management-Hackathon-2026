import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  Sparkles,
  Warehouse,
} from 'lucide-react';
import { ROLES } from '../constants/roles';
import heroImage from '../assets/hero.png';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

const highlights = [
  {
    icon: Package,
    title: 'Inventory intelligence',
    description: 'Keep stock movement, BOM activity, and project demand visible in one place.',
    tone: 'bg-primary/10 text-primary-700',
  },
  {
    icon: BarChart3,
    title: 'Decision-ready dashboards',
    description: 'Surface trends early with fast visibility into operations, finance, and fulfillment.',
    tone: 'bg-accent/10 text-accent-700',
  },
  {
    icon: ShieldCheck,
    title: 'Safer access control',
    description: 'Support admins, warehouse teams, and managers with role-based permissions.',
    tone: 'bg-emerald-100 text-emerald-700',
  },
];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveUser, setSaveUser] = useState(true);
  const { login, user: authUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!authLoading && authUser) {
      if (authUser.role === ROLES.ADMIN) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [authUser, authLoading, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password, { persist: saveUser });
      if (user.role === ROLES.ADMIN) {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(23,62,119,0.38),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(198,34,34,0.18),transparent_22%),linear-gradient(135deg,#020617_0%,#0f172a_48%,#111827_100%)]" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
      <div className="absolute -left-16 top-24 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute right-0 top-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />

      <div className="relative mx-auto flex h-screen max-w-7xl items-center px-3 py-3 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
        <div className="grid h-full w-full gap-4 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
          <section className="hidden h-full flex-col justify-between rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_32px_100px_-48px_rgba(15,23,42,0.95)] backdrop-blur-xl lg:flex lg:min-h-0 lg:p-7 xl:p-8">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-200/88">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                Operations Command Center
              </div>

              <div className="mt-6 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg shadow-slate-950/30">
                  <img
                    src={APP_LOGO_URL}
                    alt="Optimized Solutions Ltd"
                    className="h-9 w-9 rounded-xl object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Optimized Solutions Ltd</p>
                  <p className="text-sm text-slate-400">Inventory and asset operations</p>
                </div>
              </div>

              <h1 className="mt-6 max-w-xl text-3xl font-black tracking-tight text-white xl:text-5xl xl:leading-[1.05]">
                Run inventory, assets, and approvals from one focused workspace.
              </h1>

              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-300 xl:text-base xl:leading-7">
                A sharper login experience for the teams managing warehouses, projects, BOM workflows, and finance
                visibility across the platform.
              </p>

              <div className="mt-6 grid gap-3 xl:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/7 p-4">
                  <p className="text-2xl font-black text-white xl:text-3xl">24/7</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300 xl:text-sm">Operational visibility for stock and asset movement.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/7 p-4">
                  <p className="text-2xl font-black text-white xl:text-3xl">Role-based</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300 xl:text-sm">Built for admins, managers, warehouse, and finance.</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/7 p-4">
                  <p className="text-2xl font-black text-white xl:text-3xl">Live</p>
                  <p className="mt-2 text-xs leading-5 text-slate-300 xl:text-sm">Access dashboards and workflow updates in real time.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid min-h-0 gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900/60">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/55 via-transparent to-primary/20" />
                  <img
                    src={heroImage}
                    alt="Inventory management illustration"
                    className="h-52 w-full object-cover object-center xl:h-60"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {highlights.map(({ icon: Icon, title, description, tone }) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/7 p-3.5">
                    <div className="flex items-start gap-3">
                      <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">{title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-300 xl:text-sm">{description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="order-1 flex h-full items-center lg:order-2">
            <div className="relative flex h-full w-full items-center overflow-hidden rounded-[2rem] border border-white/12 bg-white px-5 py-5 text-slate-900 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.95)] sm:px-7 sm:py-7 lg:px-8 lg:py-8">
              <div className="absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(23,62,119,0.14),transparent_70%)]" />
              <div className="relative mx-auto w-full max-w-md">
                <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:hidden">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <img
                      src={APP_LOGO_URL}
                      alt="Optimized Solutions Ltd"
                      className="h-6 w-6 rounded-md bg-white object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Optimized Solutions Ltd</p>
                    <p className="text-xs text-slate-500">Inventory and asset operations</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/40">
                      <Warehouse className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Secure access</p>
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">Welcome back</h2>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Sign in with your work email to continue to your inventory workspace.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600 sm:text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Protected sessions
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Audit-friendly access
                  </span>
                </div>

                <form className="mt-6 space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
                  {error && (
                    <div
                      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                      role="alert"
                      aria-live="polite"
                    >
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-slate-800">
                      Work email
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15"
                        placeholder="name@company.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor="password" className="text-sm font-semibold text-slate-800">
                        Password
                      </label>
                    </div>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Lock className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 px-11 py-2.5 pr-14 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/15"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 inline-flex items-center justify-center rounded-r-2xl px-4 text-slate-500 transition hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/20"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="flex items-center gap-2.5 text-sm leading-5 text-slate-700" htmlFor="saveUser">
                      <input
                        id="saveUser"
                        name="saveUser"
                        type="checkbox"
                        checked={saveUser}
                        onChange={(e) => setSaveUser(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-4 focus:ring-primary/20"
                      />
                      Keep me signed in on this device
                    </label>
                    <span className="text-[11px] leading-4 text-slate-500 sm:text-xs sm:leading-5">Use only on trusted computers.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-950/20 transition hover:bg-primary focus:outline-none focus:ring-4 focus:ring-primary/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Continue to dashboard
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>

                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs leading-5 text-slate-600 sm:text-sm">
                    By continuing, you agree to follow your organization&apos;s security policies and device access rules.
                  </div>
                </form>

                <p className="mt-4 text-center text-sm text-slate-600">
                  Need a new account?{' '}
                  <Link to="/register" className="font-semibold text-primary transition hover:text-primary-700">
                    Register here
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Login;

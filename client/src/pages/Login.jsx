import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, BarChart3, Eye, EyeOff, Loader2, Lock, LogIn, Mail, Package, ShieldCheck } from 'lucide-react';
import { ROLES } from '../constants/roles';
import heroImage from '../assets/hero.png';

const APP_LOGO_URL =
  'https://media.licdn.com/dms/image/v2/C560BAQFO8hoGBGODpQ/company-logo_200_200/company-logo_200_200/0/1679632744041/optimized_solutions_ltd_logo?e=2147483647&v=beta&t=OcX_6ep-DXZSrhdR4f3gmnv_Imt4NdVA7-VPf_X1j5U';

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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(23,62,119,0.16),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(198,34,34,0.12),transparent_60%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full">
          <div className="rounded-3xl bg-gradient-to-br from-slate-200/70 via-white to-slate-200/50 p-[1px] shadow-[0_18px_55px_-28px_rgba(2,6,23,0.45)]">
            <div className="relative overflow-hidden rounded-3xl bg-white">
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(23,62,119,0.10),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(114,115,113,0.08),transparent_58%)]" />
              <div className="relative grid grid-cols-1 lg:grid-cols-2">
                <div className="hidden lg:flex flex-col justify-between p-10">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-xs font-semibold text-slate-700">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                        <img
                          src={APP_LOGO_URL}
                          alt="Optimized Solutions Ltd"
                          className="h-4 w-4 rounded-full bg-white object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      </span>
                      Inventory Management Dashboard
                    </div>
                    <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
                      Track stock, assets, and workflows in one place.
                    </h1>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                      Secure sign-in for warehouse teams, project managers, and admins. Stay compliant with role-based
                      access and real-time visibility.
                    </p>
                    <div className="mt-8 space-y-3">
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary-700">
                          <Package className="h-4 w-4" />
                        </span>
                        Item-level tracking with clean audit history
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent-700">
                          <BarChart3 className="h-4 w-4" />
                        </span>
                        Live dashboards for inventory health
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-700">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-muted/10 text-muted-800">
                          <ShieldCheck className="h-4 w-4" />
                        </span>
                        Role-based access for safer operations
                      </div>
                    </div>
                  </div>
                  <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img
                      src={heroImage}
                      alt="Inventory management illustration"
                      className="h-56 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                </div>

                <div className="p-6 sm:p-10">
              <div className="mx-auto w-full max-w-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-sm shadow-primary/20">
                      <img
                        src={APP_LOGO_URL}
                        alt="Optimized Solutions Ltd"
                        className="h-6 w-6 rounded bg-white object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Secure access</p>
                      <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Sign in</h2>
                      <p className="text-xs text-slate-600">Use your work email and password.</p>
                    </div>
                  </div>
                </div>

                <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                  {error && (
                    <div
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                      role="alert"
                      aria-live="polite"
                    >
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-semibold text-slate-800">
                      Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
                        className="block w-full rounded-xl border border-slate-200 bg-white px-10 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                        placeholder="name@company.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-semibold text-slate-800">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
                        className="block w-full rounded-xl border border-slate-200 bg-white px-10 pr-12 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 inline-flex items-center justify-center rounded-r-xl px-3 text-slate-500 transition hover:text-slate-700 focus:outline-none focus:ring-4 focus:ring-primary/20"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-slate-700" htmlFor="saveUser">
                      <input
                        id="saveUser"
                        name="saveUser"
                        type="checkbox"
                        checked={saveUser}
                        onChange={(e) => setSaveUser(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-4 focus:ring-primary/20"
                      />
                      Save user on this device
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary/25 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing in…
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    By continuing, you agree to follow your organization’s security policies.
                  </div>
                </form>
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

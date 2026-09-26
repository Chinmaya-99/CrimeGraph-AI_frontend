import React, { useState } from 'react';

import {
  ShieldAlert,
  Lock,
  User,
  AlertCircle,
} from 'lucide-react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:8000';

export default function Login({ onLogin }) {
  const [username, setUsername] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    const cleanUsername =
      username.trim();

    if (
      !cleanUsername ||
      !password
    ) {
      setError(
        'Username and password are required.'
      );

      return;
    }

    setLoading(true);
    setError('');

    try {
      /*
       * FastAPI OAuth2PasswordRequestForm expects:
       *
       * Content-Type:
       * application/x-www-form-urlencoded
       *
       * Fields:
       * username
       * password
       */
      const body =
        new URLSearchParams();

      body.append(
        'username',
        cleanUsername
      );

      body.append(
        'password',
        password
      );

      const response =
        await fetch(
          `${API_BASE_URL}/auth/login`,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/x-www-form-urlencoded',
            },

            body: body.toString(),
          }
        );

      let data = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const detail =
          data?.detail ||
          data?.message ||
          'Invalid username or password.';

        throw new Error(
          typeof detail === 'string'
            ? detail
            : JSON.stringify(detail)
        );
      }

      if (!data?.access_token) {
        throw new Error(
          'Login succeeded but no access token was returned.'
        );
      }

      /*
       * Store the JWT locally.
       *
       * App.jsx also validates that both auth_user and
       * access_token exist when restoring a session.
       */
      localStorage.setItem(
        'access_token',
        data.access_token
      );

      localStorage.setItem(
        'auth_user',
        JSON.stringify(
          data.user || {}
        )
      );

      /*
       * Pass the complete backend login response to App.jsx.
       *
       * App.jsx remains responsible for establishing the
       * authenticated application state.
       */
      if (onLogin) {
        onLogin(data);
      }
    } catch (err) {
      console.error(
        'Authentication request failed:',
        err
      );

      /*
       * fetch() throws TypeError when the backend cannot
       * be reached at all.
       */
      if (
        err instanceof TypeError
      ) {
        setError(
          `Unable to connect to the authentication service at ${API_BASE_URL}.`
        );
      } else {
        setError(
          err?.message ||
            'Unable to authenticate.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-screen bg-police-dark flex items-center justify-center px-6">

      <div className="w-full max-w-md">

        {/* -----------------------------------------------------
            BRAND
            ----------------------------------------------------- */}

        <div className="text-center mb-8">

          <div className="flex justify-center mb-4">

            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">

              <ShieldAlert className="w-9 h-9 text-red-500" />

            </div>

          </div>

          <h1 className="text-2xl font-bold tracking-wide text-white">
            Anveshan
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Criminal Network Intelligence Platform
          </p>

        </div>

        {/* -----------------------------------------------------
            LOGIN CARD
            ----------------------------------------------------- */}

        <div className="bg-police-card border border-police-border rounded-xl p-7 shadow-2xl">

          <div className="mb-6">

            <h2 className="text-lg font-semibold text-white">
              Investigator Login
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Authenticate to access intelligence data.
            </p>

          </div>

          {/* -------------------------------------------------
              ERROR
              ------------------------------------------------- */}

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">

              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />

              <p className="text-xs text-red-300">
                {error}
              </p>

            </div>
          )}

          {/* -------------------------------------------------
              FORM
              ------------------------------------------------- */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* USERNAME */}

            <div>

              <label className="block text-xs font-medium text-gray-400 mb-2">
                Username
              </label>

              <div className="relative">

                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />

                <input
                  type="text"
                  value={username}
                  onChange={(event) =>
                    setUsername(
                      event.target.value
                    )
                  }
                  placeholder="Enter username"
                  autoComplete="username"
                  disabled={loading}
                  className="w-full rounded-lg border border-police-border bg-police-dark pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/60 transition disabled:opacity-50"
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div>

              <label className="block text-xs font-medium text-gray-400 mb-2">
                Password
              </label>

              <div className="relative">

                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-lg border border-police-border bg-police-dark pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/60 transition disabled:opacity-50"
                />

              </div>

            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold py-3 text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Authenticating...'
                : 'Sign In'}
            </button>

          </form>

          {/* -------------------------------------------------
              SECURITY FOOTER
              ------------------------------------------------- */}

          <div className="mt-6 pt-5 border-t border-police-border">

            <p className="text-[10px] text-center text-gray-600 font-mono">
              AUTHENTICATED ACCESS • JWT • RBAC
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}
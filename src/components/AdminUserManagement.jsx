import React, { useState } from 'react';

import {
  UserPlus,
  Shield,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

import {
  createUser,
} from '../services/api';

export default function AdminUserManagement({
  authUser,
}) {
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role: 'viewer',
  });

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState('');

  const [error, setError] =
    useState('');

  /*
   * ------------------------------------------------------------
   * ADMIN GUARD
   * ------------------------------------------------------------
   *
   * The backend is still the real security boundary.
   * This frontend check simply prevents an admin-only screen
   * from being displayed to other roles.
   */

  if (
    authUser?.role !== 'admin'
  ) {
    return (
      <main className="flex-1 flex items-center justify-center bg-police-dark">

        <div className="text-center">

          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />

          <h2 className="text-lg font-semibold text-white">
            Access Denied
          </h2>

          <p className="text-sm text-gray-500 mt-2">
            Administrator privileges are required.
          </p>

        </div>

      </main>
    );
  }

  function handleChange(event) {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
    setSuccess('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result =
        await createUser(form);

      setSuccess(
        result?.message ||
          'User created successfully.'
      );

      /*
       * Keep the selected role so an admin can quickly
       * create another user with the same role.
       *
       * Clear the sensitive / identity fields.
       */
      setForm((previous) => ({
        ...previous,
        username: '',
        full_name: '',
        email: '',
        password: '',
      }));
    } catch (err) {
      console.error(
        'Admin user creation failed:',
        err
      );

      if (
        err?.code ===
          'AUTHENTICATION_REQUIRED' ||
        err?.status === 401
      ) {
        setError(
          'Your admin session has expired. Please sign in again.'
        );
      } else if (err?.status === 403) {
        setError(
          'You do not have administrator permission to create users.'
        );
      } else {
        setError(
          err?.message ||
            'Unable to create user.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 overflow-y-auto bg-police-dark p-8">

      <div className="max-w-4xl mx-auto">

        {/* -----------------------------------------------------
            HEADER
            ----------------------------------------------------- */}

        <div className="mb-8">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">

              <UserPlus className="w-5 h-5 text-red-400" />

            </div>

            <div>

              <h2 className="text-xl font-semibold text-white">
                User Management
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Create and assign accounts for the intelligence platform.
              </p>

            </div>

          </div>

        </div>

        {/* -----------------------------------------------------
            CREATE USER CARD
            ----------------------------------------------------- */}

        <div className="bg-police-card border border-police-border rounded-xl p-6">

          <div className="flex items-center gap-3 mb-6">

            <UserPlus className="w-5 h-5 text-gray-400" />

            <div>

              <h3 className="text-sm font-semibold text-white">
                Create New User
              </h3>

              <p className="text-xs text-gray-500 mt-1">
                The selected role controls access through RBAC.
              </p>

            </div>

          </div>

          {/* -------------------------------------------------
              SUCCESS
              ------------------------------------------------- */}

          {success && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">

              <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />

              <p className="text-xs text-green-300">
                {success}
              </p>

            </div>
          )}

          {/* -------------------------------------------------
              ERROR
              ------------------------------------------------- */}

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">

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

            {/* USERNAME + FULL NAME */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>

                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Username
                </label>

                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="e.g. investigator01"
                  autoComplete="off"
                  disabled={loading}
                  className="w-full rounded-lg border border-police-border bg-police-dark px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/60 transition disabled:opacity-50"
                />

              </div>

              <div>

                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Full Name
                </label>

                <input
                  type="text"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Investigation Officer"
                  autoComplete="off"
                  disabled={loading}
                  className="w-full rounded-lg border border-police-border bg-police-dark px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/60 transition disabled:opacity-50"
                />

              </div>

            </div>

            {/* EMAIL + ROLE */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <div>

                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Email
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="officer@example.com"
                  autoComplete="off"
                  disabled={loading}
                  className="w-full rounded-lg border border-police-border bg-police-dark px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/60 transition disabled:opacity-50"
                />

              </div>

              <div>

                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Role
                </label>

                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full rounded-lg border border-police-border bg-police-dark px-4 py-3 text-sm text-white outline-none focus:border-red-500/60 transition disabled:opacity-50"
                >
                  <option value="viewer">
                    Viewer
                  </option>

                  <option value="investigator">
                    Investigator
                  </option>

                  <option value="admin">
                    Admin
                  </option>
                </select>

              </div>

            </div>

            {/* PASSWORD */}

            <div>

              <label className="block text-xs font-medium text-gray-400 mb-2">
                Temporary Password
              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                disabled={loading}
                minLength={8}
                className="w-full rounded-lg border border-police-border bg-police-dark px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-red-500/60 transition disabled:opacity-50"
              />

              <p className="text-[10px] text-gray-600 mt-2">
                The password is hashed by the backend before being stored.
              </p>

            </div>

            {/* -------------------------------------------------
                SUBMIT
                ------------------------------------------------- */}

            <div className="pt-2 flex justify-end">

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg bg-red-500 hover:bg-red-600 px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >

                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Create User
                  </>
                )}

              </button>

            </div>

          </form>

        </div>

        {/* -----------------------------------------------------
            ROLE INFORMATION
            ----------------------------------------------------- */}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">

          <div className="bg-police-card border border-police-border rounded-lg p-4">

            <p className="text-xs font-semibold text-white">
              Viewer
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Read-only access to intelligence and graph data.
            </p>

          </div>

          <div className="bg-police-card border border-police-border rounded-lg p-4">

            <p className="text-xs font-semibold text-white">
              Investigator
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Can process FIRs and write investigation graph data.
            </p>

          </div>

          <div className="bg-police-card border border-police-border rounded-lg p-4">

            <p className="text-xs font-semibold text-white">
              Admin
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Administrative access including user management.
            </p>

          </div>

        </div>

      </div>

    </main>
  );
}
import React, { useEffect, useState } from 'react';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import Login from './components/login';
import AdminUserManagement from './components/AdminUserManagement';

import {
  getBackendHealth,
  getFIRGraph,
  projectFIRGraph,
  uploadFIR,
} from './services/api';

export default function App() {
  /* ------------------------------------------------------------
   * AUTHENTICATION
   * ------------------------------------------------------------ */

  const [authUser, setAuthUser] = useState(() => {
    const savedUser =
      localStorage.getItem('auth_user');

    const savedToken =
      localStorage.getItem('access_token');

    /*
     * A stored user without a JWT is not a valid
     * authenticated frontend session.
     */
    if (!savedUser || !savedToken) {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('access_token');

      return null;
    }

    try {
      return JSON.parse(savedUser);
    } catch (error) {
      console.error(
        'Stored authentication data is invalid:',
        error
      );

      localStorage.removeItem('auth_user');
      localStorage.removeItem('access_token');

      return null;
    }
  });

  function handleLogin(data) {
    if (!data?.access_token) {
      console.error(
        'Login response did not contain an access token.'
      );

      return;
    }

    localStorage.setItem(
      'access_token',
      data.access_token
    );

    localStorage.setItem(
      'auth_user',
      JSON.stringify(data.user || {})
    );

    setAuthUser(data.user || null);

    /*
     * Reset application state whenever a new authenticated
     * session starts.
     */
    setSelectedNode(null);
    setInvestigation(null);
    setGraph(null);
    setUploadError(null);
    setGraphError(null);
    setActiveView('graph');
  }

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_user');

    setAuthUser(null);

    /*
     * Clear investigation state when the user logs out.
     *
     * This prevents the next authenticated session from
     * inheriting the previous session's UI state.
     */
    setSelectedNode(null);
    setInvestigation(null);
    setGraph(null);
    setUploadError(null);
    setGraphError(null);
    setActiveView('graph');
    setIsUploading(false);
    setIsLoadingGraph(false);
  }

  /* ------------------------------------------------------------
   * ROLE HELPERS
   * ------------------------------------------------------------ */

  const userRole =
    authUser?.role || 'viewer';

  const canWrite =
    userRole === 'admin' ||
    userRole === 'investigator';

  const isAdmin =
    userRole === 'admin';

  /* ------------------------------------------------------------
   * EXISTING APPLICATION STATE
   * ------------------------------------------------------------ */

  const [selectedNode, setSelectedNode] =
    useState(null);

  const [activeView, setActiveView] =
    useState('graph');

  const [investigation, setInvestigation] =
    useState(null);

  const [graph, setGraph] =
    useState(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [isLoadingGraph, setIsLoadingGraph] =
    useState(false);

  const [uploadError, setUploadError] =
    useState(null);

  const [graphError, setGraphError] =
    useState(null);

  const [backendStatus, setBackendStatus] =
    useState('checking');

  /* ------------------------------------------------------------
   * BACKEND HEALTH
   * ------------------------------------------------------------ */

  useEffect(() => {
    /*
     * Do not perform the dashboard health check while the
     * application is still on the login screen.
     */
    if (!authUser) {
      return;
    }

    let cancelled = false;

    async function checkBackend() {
      try {
        const result =
          await getBackendHealth();

        if (!cancelled) {
          setBackendStatus(
            result?.status === 'ok' ||
              result?.status === 'healthy'
              ? 'connected'
              : 'unhealthy'
          );
        }
      } catch (error) {
        if (!cancelled) {
          console.error(
            'Backend health check failed:',
            error
          );

          setBackendStatus('unreachable');
        }
      }
    }

    checkBackend();

    return () => {
      cancelled = true;
    };
  }, [authUser]);

  /* ------------------------------------------------------------
   * LOAD NEO4J GRAPH FOR A FIR
   * ------------------------------------------------------------ */

  async function loadGraph(firId) {
    if (!firId) {
      return;
    }

    setIsLoadingGraph(true);
    setGraphError(null);
    setSelectedNode(null);

    try {
      /*
       * IMPORTANT RBAC BEHAVIOUR
       *
       * viewer:
       *   GET /graphs/{fir_id}
       *
       * investigator/admin:
       *   POST /graphs/{fir_id}/project
       *   GET  /graphs/{fir_id}
       *
       * Graph projection is a WRITE operation, so viewers
       * must never trigger it.
       */
      if (canWrite) {
        await projectFIRGraph(firId);
      }

      /*
       * Retrieve the frontend-ready graph.
       *
       * This is a READ operation and is allowed for all
       * authenticated roles.
       */
      const graphResult =
        await getFIRGraph(firId);

      setGraph(graphResult);
    } catch (error) {
      console.error(
        'Graph loading failed:',
        error
      );

      /*
       * Invalid/expired JWT.
       *
       * Return the user to the login screen rather than
       * leaving the application in a broken authenticated state.
       */
      if (
        error?.code ===
          'AUTHENTICATION_REQUIRED' ||
        error?.status === 401
      ) {
        handleLogout();
        return;
      }

      setGraph(null);

      setGraphError(
        error?.message ||
          'Unable to load the investigation graph.'
      );
    } finally {
      setIsLoadingGraph(false);
    }
  }

  /* ------------------------------------------------------------
   * FIR UPLOAD
   * ------------------------------------------------------------ */

  async function handleUpload(file) {
    if (!file) {
      return;
    }

    /*
     * Frontend RBAC guard.
     *
     * Backend RBAC remains the actual security boundary.
     * This guard only prevents unauthorized UI actions.
     */
    if (!canWrite) {
      setUploadError(
        'Your account does not have permission to upload FIR records.'
      );

      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setGraphError(null);
    setSelectedNode(null);
    setInvestigation(null);
    setGraph(null);

    try {
      /*
       * Backend pipeline:
       *
       * PDF
       *  ↓
       * NER
       *  ↓
       * PostgreSQL cross-database lookup
       *  ↓
       * LLM reasoning
       *  ↓
       * PostgreSQL persistence
       */
      const result =
        await uploadFIR(file);

      setInvestigation(result);

      /*
       * FIR upload returns the database FIR id.
       *
       * Investigators/admins are allowed to project the
       * validated LLM relationships into Neo4j.
       */
      if (result?.fir_id) {
        await loadGraph(result.fir_id);
      }
    } catch (error) {
      console.error(
        'FIR upload failed:',
        error
      );

      if (
        error?.code ===
          'AUTHENTICATION_REQUIRED' ||
        error?.status === 401
      ) {
        handleLogout();
        return;
      }

      setUploadError(
        error?.message ||
          'Unable to process the FIR.'
      );
    } finally {
      setIsUploading(false);
    }
  }

  /* ------------------------------------------------------------
   * GRAPH NODE SELECTION
   * ------------------------------------------------------------ */

  function handleNodeSelect(node) {
    setSelectedNode(node);
  }

  /* ------------------------------------------------------------
   * STATUS DISPLAY
   * ------------------------------------------------------------ */

  const backendStatusConfig = {
    checking: {
      label: 'BACKEND API: CHECKING',
      className: 'bg-yellow-500',
      textClassName: 'text-yellow-400',
    },

    connected: {
      label: 'BACKEND API: CONNECTED',
      className: 'bg-green-500',
      textClassName: 'text-green-400',
    },

    unhealthy: {
      label: 'BACKEND API: UNHEALTHY',
      className: 'bg-yellow-500',
      textClassName: 'text-yellow-400',
    },

    unreachable: {
      label: 'BACKEND API: OFFLINE',
      className: 'bg-red-500',
      textClassName: 'text-red-400',
    },
  };

  const status =
    backendStatusConfig[backendStatus] ||
    backendStatusConfig.checking;

  /* ------------------------------------------------------------
   * LOGIN SCREEN
   * ------------------------------------------------------------ */

  if (!authUser) {
    return (
      <Login
        onLogin={handleLogin}
      />
    );
  }

  /* ------------------------------------------------------------
   * AUTHENTICATED APPLICATION
   * ------------------------------------------------------------ */

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-police-dark">

      {/* -------------------------------------------------------
          NAVIGATION / CONTROL SIDEBAR
          ------------------------------------------------------- */}

      <Sidebar
        onUpload={handleUpload}
        isUploading={isUploading}
        investigation={investigation}
        uploadError={uploadError}
        activeView={activeView}
        setActiveView={setActiveView}
        authUser={authUser}
        onLogout={handleLogout}
      />

      {/* -------------------------------------------------------
          MAIN CONTENT
          ------------------------------------------------------- */}

      <div className="flex-1 flex flex-col h-full min-w-0">

        {/* HEADER */}

        <header className="h-16 shrink-0 border-b border-police-border bg-police-card flex items-center px-6 justify-between">

          <h1 className="text-xl font-bold tracking-wider text-white">
            SIH-26189:{' '}

            <span className="text-red-500 font-normal">
              AI Criminal Syndicate Intelligence
            </span>
          </h1>

          <div className="flex items-center gap-5">

            {/* Backend status */}

            <div className="flex items-center gap-3">

              <span
                className={`inline-block w-3 h-3 ${
                  status.className
                } rounded-full ${
                  backendStatus === 'connected'
                    ? 'animate-pulse'
                    : ''
                }`}
              />

              <span
                className={`text-xs font-mono ${status.textClassName}`}
              >
                {status.label}
              </span>

            </div>

            {/* Authenticated user */}

            <div className="h-6 w-px bg-police-border" />

            <div className="text-right">

              <p className="text-xs font-medium text-white">
                {authUser.full_name ||
                  authUser.username}
              </p>

              <p className="text-[10px] uppercase text-gray-500">
                {authUser.role || 'viewer'}
              </p>

            </div>

          </div>
        </header>

        {/* -----------------------------------------------------
            MAIN VIEW ROUTING
            ----------------------------------------------------- */}

        {activeView === 'admin' && isAdmin ? (
          <AdminUserManagement
            authUser={authUser}
          />
        ) : (
          <Dashboard
            setSelectedNode={handleNodeSelect}
            selectedNode={selectedNode}
            investigation={investigation}
            graph={graph}
            isLoadingGraph={isLoadingGraph}
            graphError={graphError}
            activeView={activeView}
          />
        )}

      </div>
    </div>
  );
}
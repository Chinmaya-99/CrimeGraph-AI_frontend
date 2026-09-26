import React, { useRef } from 'react';

import {
  Upload,
  ShieldAlert,
  Network,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Users,
} from 'lucide-react';

export default function Sidebar({
  onUpload,
  isUploading = false,
  investigation = null,
  uploadError = null,
  activeView = 'graph',
  setActiveView,
  authUser = null,
  onLogout,
}) {
  const fileInputRef = useRef(null);

  /*
   * ------------------------------------------------------------
   * ROLE
   * ------------------------------------------------------------
   */

  const role =
    authUser?.role || 'viewer';

  /*
   * Viewer:
   *   Read-only
   *
   * Investigator:
   *   FIR read/write
   *   Graph read/write
   *
   * Admin:
   *   FIR read/write/delete
   *   Graph read/write/delete
   *   User management
   */
  const canUpload =
    role === 'admin' ||
    role === 'investigator';

  const isAdmin =
    role === 'admin';

  /*
   * ------------------------------------------------------------
   * FILE SELECTION
   * ------------------------------------------------------------
   */

  function handleFileChange(event) {
    const file =
      event.target.files?.[0];

    if (
      !file ||
      isUploading ||
      !canUpload
    ) {
      return;
    }

    onUpload?.(file);

    /*
     * Allow selecting the same file again after processing.
     */
    event.target.value = '';
  }

  function handleUploadClick() {
    if (
      isUploading ||
      !canUpload
    ) {
      return;
    }

    fileInputRef.current?.click();
  }

  /*
   * ------------------------------------------------------------
   * NAVIGATION
   * ------------------------------------------------------------
   */

  function handleGraphClick() {
    setActiveView?.('graph');
  }

  function handleRetrieveClick() {
    setActiveView?.('retrieve');
  }

  function handleUserManagementClick() {
    /*
     * Frontend guard.
     *
     * Backend must still enforce admin permission.
     */
    if (!isAdmin) {
      return;
    }

    setActiveView?.('admin');
  }

  /*
   * ------------------------------------------------------------
   * LOGOUT
   * ------------------------------------------------------------
   */

  function handleLogout() {
    if (isUploading) {
      return;
    }

    onLogout?.();
  }

  const uploadedFilename =
    investigation?.filename || null;

  return (
    <aside className="w-64 shrink-0 bg-police-card border-r border-police-border flex flex-col justify-between">

      {/* -------------------------------------------------------
          TOP SECTION
          ------------------------------------------------------- */}

      <div>

        {/* -----------------------------------------------------
            BRAND
            ----------------------------------------------------- */}

        <div className="p-5 border-b border-police-border flex items-center gap-3">

          <ShieldAlert className="w-8 h-8 text-red-500" />

          <span className="font-bold text-lg text-white">
            Anveshan
          </span>

        </div>

        {/* -----------------------------------------------------
            NAVIGATION
            ----------------------------------------------------- */}

        <nav className="p-4 space-y-2">

          {/* ---------------------------------------------------
              NETWORK GRAPH
              --------------------------------------------------- */}

          <button
            type="button"
            onClick={handleGraphClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
              activeView === 'graph'
                ? 'bg-red-500/10 text-red-400 font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >

            <Network className="w-5 h-5" />

            <span>
              Network Graph
            </span>

          </button>

          {/* ---------------------------------------------------
              RETRIEVE INTELLIGENCE
              --------------------------------------------------- */}

          <button
            type="button"
            onClick={handleRetrieveClick}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
              activeView === 'retrieve'
                ? 'bg-red-500/10 text-red-400 font-medium'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >

            <Search className="w-5 h-5" />

            <span>
              Retrieve Intelligence
            </span>

          </button>

          {/* ---------------------------------------------------
              ADMIN USER MANAGEMENT
              ---------------------------------------------------
              
              Visible ONLY to administrators.
              Investigator and viewer accounts never see
              this navigation item.
              --------------------------------------------------- */}

          {isAdmin && (
            <button
              type="button"
              onClick={handleUserManagementClick}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                activeView === 'admin'
                  ? 'bg-red-500/10 text-red-400 font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >

              <Users className="w-5 h-5" />

              <span>
                User Management
              </span>

            </button>
          )}

        </nav>

      </div>

      {/* -------------------------------------------------------
          BOTTOM SECTION
          ------------------------------------------------------- */}

      <div>

        {/* -----------------------------------------------------
            FIR UPLOAD
            -----------------------------------------------------
            
            Admin:
              YES

            Investigator:
              YES

            Viewer:
              NO
            ----------------------------------------------------- */}

        {canUpload && (
          <div className="p-4 border-t border-police-border">

            {/* -------------------------------------------------
                UPLOAD BUTTON
                ------------------------------------------------- */}

            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading}
              className={`w-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 transition ${
                isUploading
                  ? 'border-red-500/50 bg-red-500/5 cursor-wait'
                  : 'border-gray-700 hover:border-red-500 hover:bg-red-500/5 cursor-pointer'
              }`}
            >

              {isUploading ? (
                <Loader2 className="w-6 h-6 text-red-400 mb-1 animate-spin" />
              ) : (
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
              )}

              <span className="text-xs text-gray-300 font-medium text-center">
                {isUploading
                  ? 'Processing FIR...'
                  : 'Upload FIR'}
              </span>

              <span className="text-[10px] text-gray-500 mt-1 text-center">
                PDF up to 20 MB
              </span>

            </button>

            {/* -------------------------------------------------
                HIDDEN FILE INPUT
                ------------------------------------------------- */}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />

            {/* -------------------------------------------------
                SUCCESS STATE
                ------------------------------------------------- */}

            {uploadedFilename &&
              !uploadError && (
                <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/5 p-3">

                  <div className="flex items-start gap-2">

                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />

                    <div className="min-w-0">

                      <p className="text-[10px] uppercase tracking-wider text-green-400 font-semibold">
                        FIR Processed
                      </p>

                      <p
                        className="text-xs text-gray-300 mt-1 truncate"
                        title={uploadedFilename}
                      >
                        {uploadedFilename}
                      </p>

                      {investigation?.fir_id && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          FIR ID: {investigation.fir_id}
                        </p>
                      )}

                    </div>

                  </div>

                </div>
              )}

            {/* -------------------------------------------------
                ERROR STATE
                ------------------------------------------------- */}

            {uploadError && (
              <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">

                <div className="flex items-start gap-2">

                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />

                  <div className="min-w-0">

                    <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">
                      Upload Failed
                    </p>

                    <p className="text-xs text-gray-400 mt-1 break-words">
                      {uploadError}
                    </p>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* -----------------------------------------------------
            VIEWER READ-ONLY NOTICE
            ----------------------------------------------------- */}

        {!canUpload && (
          <div className="p-4 border-t border-police-border">

            <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-3">

              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                Read Only Access
              </p>

              <p className="text-xs text-gray-400 mt-1">
                Your account can view intelligence and network data.
              </p>

            </div>

          </div>
        )}

        {/* -----------------------------------------------------
            USER / LOGOUT
            ----------------------------------------------------- */}

        <div className="border-t border-police-border p-4">

          <div className="mb-3">

            <p className="text-xs font-medium text-white truncate">
              {authUser?.full_name ||
                authUser?.username ||
                'Authenticated User'}
            </p>

            <p className="text-[10px] uppercase text-gray-500 mt-0.5">
              {role}
            </p>

          </div>

          {/* ---------------------------------------------------
              SIGN OUT
              --------------------------------------------------- */}

          <button
            type="button"
            onClick={handleLogout}
            disabled={isUploading}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >

            <LogOut className="w-4 h-4" />

            <span>
              Sign Out
            </span>

          </button>

        </div>

      </div>

    </aside>
  );
}
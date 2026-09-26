import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Database,
  FileText,
  Network,
  Search,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import GraphView from './GraphView';
import {
  getHistoricalIntelligence,
  projectFIRGraph,
  getFIRGraph,
} from '../services/api';

export default function Dashboard({
  setSelectedNode,
  selectedNode,
  investigation,
  graph,
  isLoadingGraph = false,
  graphError = null,
  activeView = 'graph',
}) {
  /*
   * ------------------------------------------------------------
   * RETRIEVE HISTORICAL INTELLIGENCE VIEW
   * ------------------------------------------------------------
   */

  if (activeView === 'retrieve') {
    return <RetrieveIntelligence />;
  }

  const entities = investigation?.entities || [];
  const relations = investigation?.llm_reasoning?.relations || [];
  const suspiciousFlags =
    investigation?.llm_reasoning?.suspicious_flags || [];

  const graphNodes = graph?.nodes || [];
  const graphEdges = graph?.edges || [];

  /*
   * ------------------------------------------------------------
   * DERIVED INVESTIGATION STATISTICS
   * ------------------------------------------------------------
   */

  const stats = useMemo(() => {
    const uniqueTypes = new Set(
      entities
        .map((entity) => entity?.type)
        .filter(Boolean)
    );

    return {
      entities: entities.length,
      entityTypes: uniqueTypes.size,
      relations: relations.length,
      flags: suspiciousFlags.length,
      graphNodes: graphNodes.length,
      graphEdges: graphEdges.length,
    };
  }, [
    entities,
    relations,
    suspiciousFlags,
    graphNodes,
    graphEdges,
  ]);

  /*
   * ------------------------------------------------------------
   * SELECTED NODE INFORMATION
   * ------------------------------------------------------------
   */

  const selectedNodeData = useMemo(() => {
    if (!selectedNode) {
      return null;
    }

    /*
     * GraphView may return either the React Flow node
     * or its underlying data object.
     */
    const data = selectedNode?.data || selectedNode;

    return {
      id: selectedNode?.id || data?.id || null,
      name:
        data?.name ||
        data?.label ||
        data?.entity_value ||
        data?.value ||
        'Unknown entity',
      type:
        data?.entity_type ||
        data?.type ||
        'UNKNOWN',
    };
  }, [selectedNode]);

  /*
   * ------------------------------------------------------------
   * THREAT / INVESTIGATION STATUS
   * ------------------------------------------------------------
   *
   * We deliberately do NOT fabricate a threat score or PageRank.
   * The backend currently provides suspicious flags, not a
   * numerical threat score.
   */

  const investigationStatus =
    suspiciousFlags.length > 0
      ? 'SUSPICIOUS ACTIVITY DETECTED'
      : investigation
        ? 'NO SUSPICIOUS FLAGS'
        : 'NO INVESTIGATION LOADED';

  /*
   * ------------------------------------------------------------
   * EMPTY STATE
   * ------------------------------------------------------------
   */

  const hasInvestigation = Boolean(investigation);

  return (
    <main className="flex-1 min-h-0 overflow-hidden bg-police-dark">

      {/* -------------------------------------------------------
          DASHBOARD HEADER
          ------------------------------------------------------- */}
      <div className="h-full flex flex-col">

        <div className="shrink-0 px-6 py-5 border-b border-police-border">

          <div className="flex items-start justify-between gap-6">

            <div>
              <div className="flex items-center gap-3">

                <Network className="w-6 h-6 text-red-500" />

                <h2 className="text-lg font-semibold text-white">
                  Investigation Network
                </h2>

              </div>

              <p className="text-xs text-gray-500 mt-1">
                Evidence-backed entity relationships from the current FIR.
              </p>

            </div>

            {hasInvestigation && (
              <div className="text-right shrink-0">

                <p className="text-[10px] uppercase tracking-wider text-gray-500">
                  Investigation
                </p>

                <p className="text-sm font-mono text-gray-300 mt-1">
                  FIR #{investigation.fir_id}
                </p>

              </div>
            )}

          </div>

          {/* ---------------------------------------------------
              INVESTIGATION STATISTICS
              --------------------------------------------------- */}
          <div className="grid grid-cols-5 gap-3 mt-5">

            <StatCard
              icon={<FileText className="w-4 h-4" />}
              label="Entities"
              value={stats.entities}
            />

            <StatCard
              icon={<Database className="w-4 h-4" />}
              label="Entity Types"
              value={stats.entityTypes}
            />

            <StatCard
              icon={<Network className="w-4 h-4" />}
              label="Relations"
              value={stats.relations}
            />

            <StatCard
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Flags"
              value={stats.flags}
              alert={stats.flags > 0}
            />

            <StatCard
              icon={<ShieldCheck className="w-4 h-4" />}
              label="Graph Edges"
              value={stats.graphEdges}
            />

          </div>

        </div>

        {/* -------------------------------------------------------
            MAIN DASHBOARD AREA
            ------------------------------------------------------- */}
        <div className="flex-1 min-h-0 flex">

          {/* ---------------------------------------------------
              GRAPH
              --------------------------------------------------- */}
          <section className="flex-1 min-w-0 min-h-0 relative border-r border-police-border">

            <GraphView
              investigation={investigation}
              graph={graph}
              onNodeSelect={setSelectedNode}
              isLoading={isLoadingGraph}
              error={graphError}
            />

          </section>

          {/* ---------------------------------------------------
              INSPECTOR
              --------------------------------------------------- */}
          <aside className="w-80 shrink-0 bg-police-card overflow-y-auto">

            <Inspector
              investigation={investigation}
              selectedNode={selectedNodeData}
              relations={relations}
              suspiciousFlags={suspiciousFlags}
              graph={graph}
              status={investigationStatus}
            />

          </aside>

        </div>

      </div>
    </main>
  );
}

/*
 * =================================================================
 * RETRIEVE HISTORICAL INTELLIGENCE
 * =================================================================
 */

function RetrieveIntelligence() {
  const [firId, setFirId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [historicalGraph, setHistoricalGraph] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState(null);

  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);
  const [expandedFir, setExpandedFir] = useState(null);

  async function handleSearch(event) {
    event.preventDefault();

    const value = firId.trim();

    if (!value) {
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);
    setExpandedFir(null);
    setResults([]);
    setHistoricalGraph(null);
    setGraphError(null);
 
    try {
const data = await getHistoricalIntelligence(value);

const investigations = Array.isArray(
  data?.investigations
)
  ? data.investigations
  : [];

setResults(investigations);

/*
 * If historical intelligence exists for this FIR,
 * project its already-persisted LLM reasoning into Neo4j
 * and retrieve the graph for visualization.
 *
 * This does NOT invoke the LLM.
 */
if (investigations.length > 0) {
  setGraphLoading(true);

  try {
    await projectFIRGraph(value);

    const graphResult = await getFIRGraph(value);

    setHistoricalGraph(graphResult);
  } catch (graphErr) {
    console.error(
      'Historical graph loading failed:',
      graphErr
    );

    setHistoricalGraph(null);

    setGraphError(
      graphErr?.message ||
        'Historical intelligence was found, but the graph could not be loaded.'
    );
  } finally {
    setGraphLoading(false);
  }
}
    } catch (err) {
      console.error(
        'Historical intelligence retrieval failed:',
        err
      );

      setResults([]);

      setError(
        err?.message ||
          'Failed to retrieve historical intelligence.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 min-h-0 overflow-y-auto bg-police-dark">

      <div className="max-w-6xl mx-auto p-6">

        {/* -----------------------------------------------------
            HEADER
            ----------------------------------------------------- */}
        <div className="mb-6">

          <div className="flex items-center gap-3">

            <Search className="w-6 h-6 text-red-500" />

            <h2 className="text-lg font-semibold text-white">
              Retrieve Historical Intelligence
            </h2>

          </div>

          <p className="text-xs text-gray-500 mt-2">
            Retrieve previously persisted intelligence for a specific FIR.
            Historical intelligence is read from PostgreSQL; no new LLM
            reasoning is performed.
          </p>

        </div>

        {/* -----------------------------------------------------
            FIR ID SEARCH
            ----------------------------------------------------- */}
        <form
          onSubmit={handleSearch}
          className="rounded-xl border border-police-border bg-police-card p-4"
        >

          <div className="flex gap-3">

            <div className="relative flex-1">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />

              <input
                type="number"
                min="1"
                value={firId}
                onChange={(event) =>
                  setFirId(event.target.value)
                }
                placeholder="Enter FIR ID e.g. 35..."
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
              />

            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !firId.trim()
              }
              className="px-5 py-3 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition"
            >
              {loading
                ? 'Retrieving...'
                : 'Retrieve'}
            </button>

          </div>

        </form>

        {/* -----------------------------------------------------
            ERROR
            ----------------------------------------------------- */}
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4">

            <div className="flex items-start gap-2">

              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />

              <div>

                <p className="text-xs font-semibold text-red-400">
                  Retrieval Failed
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {error}
                </p>

              </div>

            </div>

          </div>
        )}

        {/* -----------------------------------------------------
            EMPTY RESULT
            ----------------------------------------------------- */}
        {searched &&
          !loading &&
          !error &&
          results.length === 0 && (
            <div className="mt-4 rounded-xl border border-police-border bg-police-card py-16 text-center">

              <Database className="w-10 h-10 mx-auto text-gray-700" />

              <p className="text-sm text-gray-400 mt-3">
                No historical intelligence found.
              </p>

              <p className="text-xs text-gray-600 mt-1">
                FIR ID:
                <span className="text-gray-400 ml-1">
                  {firId.trim()}
                </span>
              </p>

            </div>
          )}

          {/* -----------------------------------------------------
    HISTORICAL GRAPH
    ----------------------------------------------------- */}
{results.length > 0 && (
  <div className="mt-4 rounded-xl border border-police-border bg-police-card overflow-hidden">

    <div className="px-4 py-3 border-b border-police-border flex items-center justify-between">

      <div>
        <p className="text-xs uppercase tracking-wider text-gray-400 font-semibold">
          Historical Investigation Graph
        </p>

        <p className="text-[10px] text-gray-600 mt-1">
          Graph reconstructed from the persisted intelligence for FIR ID {firId}.
        </p>
      </div>

      {graphLoading && (
        <p className="text-[10px] text-red-400">
          Loading graph...
        </p>
      )}

    </div>

    {graphError && (
      <div className="p-4 border-b border-red-500/20 bg-red-500/5">
        <p className="text-xs text-red-400">
          {graphError}
        </p>
      </div>
    )}

    <div className="h-[520px] relative">

      {graphLoading ? (
        <div className="h-full flex items-center justify-center">
          <p className="text-xs text-gray-500">
            Loading historical graph...
          </p>
        </div>
      ) : historicalGraph ? (
        <GraphView
          investigation={results[0]}
          graph={historicalGraph}
          onNodeSelect={() => {}}
          isLoading={false}
          error={null}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <p className="text-xs text-gray-600">
            No historical graph available for this FIR.
          </p>
        </div>
      )}

    </div>

  </div>
)}

        {/* -----------------------------------------------------
            RESULTS
            ----------------------------------------------------- */}
        {results.length > 0 && (
          <div className="mt-4 space-y-4">

            <div className="flex items-center justify-between">

              <p className="text-xs uppercase tracking-wider text-gray-500">
                Stored FIR Intelligence
              </p>

              <p className="text-xs text-gray-600">
                {results.length} result
                {results.length === 1 ? '' : 's'}
              </p>

            </div>

            {results.map((item, index) => {

              const firKey =
                item?.reasoning_id ??
                `${item?.fir_id}-${index}`;

              const isExpanded =
                expandedFir === firKey;

              return (
                <div
                  key={firKey}
                  className="rounded-xl border border-police-border bg-police-card overflow-hidden"
                >

                  {/* ------------------------------------------------
                      FIR HEADER
                      ------------------------------------------------ */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedFir(
                        isExpanded
                          ? null
                          : firKey
                      )
                    }
                    className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-gray-900/50 transition"
                  >

                    <div className="min-w-0">

                      <div className="flex items-center gap-3">

                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-red-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                        )}

                        <span className="text-sm font-semibold text-white">
                          FIR #
                          {item?.fir_number ||
                            item?.fir_id ||
                            'UNKNOWN'}
                        </span>

                        <span className="text-[10px] font-mono text-gray-500">
                          ID: {item?.fir_id ?? '—'}
                        </span>

                        {item?.case_id && (
                          <span className="text-[10px] font-mono text-gray-600">
                            CASE: {item.case_id}
                          </span>
                        )}

                      </div>

                      <div className="ml-7 mt-1 text-[10px] text-gray-600">

                        {item?.police_station ||
                          'Unknown station'}

                        {item?.district
                          ? ` · ${item.district}`
                          : ''}

                        {item?.state
                          ? ` · ${item.state}`
                          : ''}

                      </div>

                    </div>

                    <div className="text-right shrink-0">

                      <p className="text-[10px] font-mono text-gray-500">
                        Reasoning #
                        {item?.reasoning_id ??
                          '—'}
                      </p>

                      <p className="text-[10px] text-gray-600 mt-1">
                        {formatDate(
                          item?.created_at
                        )}
                      </p>

                    </div>

                  </button>

                  {/* ------------------------------------------------
                      FIR DETAILS
                      ------------------------------------------------ */}
                  {isExpanded && (
                    <div className="border-t border-police-border p-5">

                      {/* ------------------------------------------------
                          RELATIONS
                          ------------------------------------------------ */}
                      <section>

                        <div className="flex items-center gap-2 mb-3">

                          <Network className="w-4 h-4 text-blue-400" />

                          <h3 className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                            Stored Relations
                          </h3>

                        </div>

                        {item?.relations?.length > 0 ? (
                          <div className="space-y-3">

                            {item.relations.map(
                              (relation, relationIndex) => (
                                <HistoricalRelationCard
                                  key={`${firKey}-relation-${relationIndex}`}
                                  relation={relation}
                                />
                              )
                            )}

                          </div>
                        ) : (
                          <p className="text-xs text-gray-600">
                            No relations stored for this reasoning result.
                          </p>
                        )}

                      </section>

                      {/* ------------------------------------------------
                          SUSPICIOUS FLAGS
                          ------------------------------------------------ */}
                      <section className="mt-6">

                        <div className="flex items-center gap-2 mb-3">

                          <AlertTriangle className="w-4 h-4 text-red-400" />

                          <h3 className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
                            Suspicious Flags
                          </h3>

                        </div>

                        {item?.suspicious_flags?.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                            {item.suspicious_flags.map(
                              (flag, flagIndex) => (
                                <HistoricalFlagCard
                                  key={`${firKey}-flag-${flagIndex}`}
                                  flag={flag}
                                />
                              )
                            )}

                          </div>
                        ) : (
                          <p className="text-xs text-gray-600">
                            No suspicious flags stored for this reasoning result.
                          </p>
                        )}

                      </section>

                      {/* ------------------------------------------------
                          MODEL / FIR METADATA
                          ------------------------------------------------ */}
                      <div className="mt-6 pt-4 border-t border-police-border flex flex-wrap gap-x-6 gap-y-2">

                        <MetadataItem
                          label="FIR ID"
                          value={item?.fir_id}
                        />

                        <MetadataItem
                          label="FIR Number"
                          value={item?.fir_number}
                        />

                        <MetadataItem
                          label="Case ID"
                          value={item?.case_id}
                        />

                        <MetadataItem
                          label="Model"
                          value={item?.model_used}
                          mono
                        />

                        <MetadataItem
                          label="Reasoning ID"
                          value={item?.reasoning_id}
                          mono
                        />

                        <MetadataItem
                          label="Created"
                          value={formatDate(
                            item?.created_at
                          )}
                        />

                      </div>

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>

    </main>
  );
}

/*
 * =================================================================
 * HISTORICAL RELATION CARD
 * =================================================================
 */

function HistoricalRelationCard({
  relation,
}) {
  const from =
    relation?.from ||
    'Unknown';

  const to =
    relation?.to ||
    'Unknown';

  const fromType =
    relation?.from_type ||
    'ENTITY';

  const toType =
    relation?.to_type ||
    'ENTITY';

  const relationType =
    relation?.relation ||
    'UNKNOWN';

  const evidenceLevel =
    relation?.evidence_level ||
    'UNKNOWN';

  const confidence =
    typeof relation?.confidence === 'number'
      ? `${Math.round(
          relation.confidence * 100
        )}%`
      : '—';

  return (
    <div className="rounded-lg border border-police-border bg-police-dark/40 p-4">

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3">

        <span className="text-[10px] font-semibold text-red-400 uppercase">
          {relationType}
        </span>

        <span className="text-[10px] font-mono text-gray-500">
          {confidence}
        </span>

      </div>

      {/* ENDPOINTS */}
      <div className="mt-3">

        <div className="text-xs text-gray-200 break-words">
          {from}
        </div>

        <div className="text-[9px] font-mono text-gray-600 mt-0.5">
          {fromType}
        </div>

        <div className="text-[10px] text-red-400 my-2">
          ↓ {relationType} ↓
        </div>

        <div className="text-xs text-gray-200 break-words">
          {to}
        </div>

        <div className="text-[9px] font-mono text-gray-600 mt-0.5">
          {toType}
        </div>

      </div>

      {/* EVIDENCE */}
      <div className="mt-4 pt-3 border-t border-gray-800">

        <div className="flex items-center justify-between gap-3">

          <span className="text-[9px] uppercase tracking-wider text-gray-600">
            Evidence Level
          </span>

          <span
            className={`text-[9px] font-bold uppercase tracking-wider ${
              evidenceLevel === 'DIRECT'
                ? 'text-green-400'
                : evidenceLevel === 'INFERRED'
                  ? 'text-yellow-400'
                  : 'text-gray-500'
            }`}
          >
            {evidenceLevel}
          </span>

        </div>

      </div>

      {/* REASONING */}
      {relation?.reasoning && (
        <div className="mt-3">

          <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-1">
            Evidence / Reasoning
          </p>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            {relation.reasoning}
          </p>

        </div>
      )}

    </div>
  );
}

/*
 * =================================================================
 * HISTORICAL FLAG CARD
 * =================================================================
 */

function HistoricalFlagCard({
  flag,
}) {
  const type =
    flag?.flag ||
    flag?.type ||
    'unknown_flag';

  const detail =
    flag?.detail ||
    flag?.reasoning ||
    'No additional detail provided.';

  return (
    <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-3">

      <div className="flex items-start gap-2">

        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />

        <div className="min-w-0">

          <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold break-words">
            {String(type).replaceAll('_', ' ')}
          </p>

          {flag?.entities?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">

              {flag.entities.map(
                (value, index) => (
                  <span
                    key={index}
                    className="text-[9px] bg-gray-900 text-gray-400 px-2 py-1 rounded"
                  >
                    {value}
                  </span>
                )
              )}

            </div>
          )}

          <p className="text-[10px] text-gray-500 leading-relaxed mt-2">
            {detail}
          </p>

        </div>

      </div>

    </div>
  );
}

/*
 * =================================================================
 * METADATA ITEM
 * =================================================================
 */

function MetadataItem({
  label,
  value,
  mono = false,
}) {
  return (
    <div>

      <p className="text-[9px] uppercase tracking-wider text-gray-600">
        {label}
      </p>

      <p
        className={`text-[10px] text-gray-400 mt-1 ${
          mono
            ? 'font-mono'
            : ''
        }`}
      >
        {value ?? '—'}
      </p>

    </div>
  );
}

/*
 * =================================================================
 * FORMAT DATE
 * =================================================================
 */

function formatDate(value) {
  if (!value) {
    return 'Unknown date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

/*
 * =================================================================
 * STAT CARD
 * =================================================================
 */

function StatCard({
  icon,
  label,
  value,
  alert = false,
}) {
  return (
    <div className="rounded-lg border border-police-border bg-police-card/60 px-3 py-3">

      <div className="flex items-center justify-between">

        <span
          className={
            alert
              ? 'text-red-400'
              : 'text-gray-500'
          }
        >
          {icon}
        </span>

        <span
          className={`text-lg font-semibold ${
            alert
              ? 'text-red-400'
              : 'text-white'
          }`}
        >
          {value}
        </span>

      </div>

      <p className="text-[10px] uppercase tracking-wider text-gray-500 mt-2">
        {label}
      </p>

    </div>
  );
}

/*
 * =================================================================
 * INSPECTOR
 * =================================================================
 */

function Inspector({
  investigation,
  selectedNode,
  relations,
  suspiciousFlags,
  graph,
  status,
}) {
  /*
   * --------------------------------------------------------------
   * NO INVESTIGATION
   * --------------------------------------------------------------
   */

  if (!investigation) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-8 text-center">

        <BrainCircuit className="w-10 h-10 text-gray-700 mb-4" />

        <h3 className="text-sm font-semibold text-gray-400">
          No Investigation Loaded
        </h3>

        <p className="text-xs text-gray-600 mt-2 leading-relaxed">
          Upload an FIR from the sidebar to run entity extraction,
          cross-database lookup, LLM reasoning, and graph projection.
        </p>

      </div>
    );
  }

  /*
   * --------------------------------------------------------------
   * SELECTED NODE
   * --------------------------------------------------------------
   */

  if (selectedNode) {
    return (
      <div className="p-5">

        <InspectorHeader
          title="Selected Entity"
          icon={<Network className="w-4 h-4" />}
        />

        <div className="mt-5">

          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            Entity
          </p>

          <p className="text-base font-semibold text-white mt-1 break-words">
            {selectedNode.name}
          </p>

          <div className="mt-3 inline-flex items-center rounded-md border border-police-border px-2 py-1">
            <span className="text-[10px] font-mono text-gray-400">
              {selectedNode.type}
            </span>
          </div>

          {selectedNode.id && (
            <div className="mt-4">

              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                Graph Node ID
              </p>

              <p className="text-[10px] font-mono text-gray-500 mt-1 break-all">
                {selectedNode.id}
              </p>

            </div>
          )}

        </div>

        <div className="mt-8">

          <InspectorHeader
            title="Related Evidence"
            icon={<Database className="w-4 h-4" />}
          />

          <div className="mt-4 space-y-3">

            {relations
              .filter((relation) => {
                const selectedName =
                  String(selectedNode.name || '')
                    .trim()
                    .toLowerCase();

                const selectedType =
                  String(selectedNode.type || '')
                    .trim()
                    .toUpperCase();

                const fromName =
                  String(relation?.from || '')
                    .trim()
                    .toLowerCase();

                const toName =
                  String(relation?.to || '')
                    .trim()
                    .toLowerCase();

                const fromType =
                  String(relation?.from_type || '')
                    .trim()
                    .toUpperCase();

                const toType =
                  String(relation?.to_type || '')
                    .trim()
                    .toUpperCase();

                return (
                  (
                    fromName === selectedName &&
                    fromType === selectedType
                  ) ||
                  (
                    toName === selectedName &&
                    toType === selectedType
                  )
                );
              })
              .map((relation, index) => (
                <RelationCard
                  key={`${relation?.relation || 'relation'}-${index}`}
                  relation={relation}
                />
              ))}

            {relations.filter((relation) => {
              const selectedName =
                String(selectedNode.name || '')
                  .trim()
                  .toLowerCase();

              const selectedType =
                String(selectedNode.type || '')
                  .trim()
                  .toUpperCase();

              return (
                (
                  String(relation?.from || '')
                    .trim()
                    .toLowerCase() === selectedName &&
                  String(relation?.from_type || '')
                    .trim()
                    .toUpperCase() === selectedType
                ) ||
                (
                  String(relation?.to || '')
                    .trim()
                    .toLowerCase() === selectedName &&
                  String(relation?.to_type || '')
                    .trim()
                    .toUpperCase() === selectedType
                )
              );
            }).length === 0 && (
              <p className="text-xs text-gray-600">
                No directly matching LLM relation was found for this entity.
              </p>
            )}

          </div>

        </div>

      </div>
    );
  }

  /*
   * --------------------------------------------------------------
   * INVESTIGATION OVERVIEW
   * --------------------------------------------------------------
   */

  return (
    <div className="p-5">

      <InspectorHeader
        title="Investigation Status"
        icon={<BrainCircuit className="w-4 h-4" />}
      />

      <div className="mt-5">

        <div
          className={`rounded-lg border p-4 ${
            suspiciousFlags.length > 0
              ? 'border-red-500/20 bg-red-500/5'
              : 'border-green-500/20 bg-green-500/5'
          }`}
        >

          <div className="flex items-start gap-3">

            {suspiciousFlags.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-green-400 shrink-0" />
            )}

            <div>

              <p
                className={`text-xs font-semibold ${
                  suspiciousFlags.length > 0
                    ? 'text-red-400'
                    : 'text-green-400'
                }`}
              >
                {status}
              </p>

              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                {suspiciousFlags.length > 0
                  ? `${suspiciousFlags.length} suspicious flag${
                      suspiciousFlags.length === 1 ? '' : 's'
                    } returned by the reasoning pipeline.`
                  : 'The reasoning pipeline returned no suspicious flags.'}
              </p>

            </div>

          </div>

        </div>

      </div>

      {/* ---------------------------------------------------------
          FIR INFORMATION
          --------------------------------------------------------- */}
      <div className="mt-7">

        <InspectorHeader
          title="FIR Information"
          icon={<FileText className="w-4 h-4" />}
        />

        <div className="mt-4 space-y-3">

          <InfoRow
            label="FIR ID"
            value={investigation.fir_id}
          />

          <InfoRow
            label="FIR Number"
            value={investigation.fir_number}
          />

          <InfoRow
            label="Case ID"
            value={investigation.case_id}
          />

          <InfoRow
            label="Source File"
            value={investigation.filename}
          />

        </div>

      </div>

      {/* ---------------------------------------------------------
          LLM SUMMARY
          --------------------------------------------------------- */}
      {investigation?.llm_reasoning?.summary && (
        <div className="mt-7">

          <InspectorHeader
            title="AI Reasoning Summary"
            icon={<BrainCircuit className="w-4 h-4" />}
          />

          <p className="text-xs text-gray-400 leading-relaxed mt-4">
            {investigation.llm_reasoning.summary}
          </p>

        </div>
      )}

      {/* ---------------------------------------------------------
          SUSPICIOUS FLAGS
          --------------------------------------------------------- */}
      <div className="mt-7">

        <InspectorHeader
          title="Suspicious Flags"
          icon={<AlertTriangle className="w-4 h-4" />}
        />

        <div className="mt-4 space-y-3">

          {suspiciousFlags.map((flag, index) => (
            <FlagCard
              key={`${flag?.flag || flag?.type || 'flag'}-${index}`}
              flag={flag}
            />
          ))}

          {suspiciousFlags.length === 0 && (
            <p className="text-xs text-gray-600">
              No suspicious flags returned.
            </p>
          )}

        </div>

      </div>

      {/* ---------------------------------------------------------
          GRAPH SUMMARY
          --------------------------------------------------------- */}
      <div className="mt-7">

        <InspectorHeader
          title="Graph Projection"
          icon={<Network className="w-4 h-4" />}
        />

        <div className="mt-4 space-y-3">

          <InfoRow
            label="Nodes"
            value={graph?.nodes?.length ?? 0}
          />

          <InfoRow
            label="Relationships"
            value={graph?.edges?.length ?? 0}
          />

        </div>

      </div>

      {/* ---------------------------------------------------------
          MODEL INFORMATION
          --------------------------------------------------------- */}
      {investigation?.llm_reasoning?.model_used && (
        <div className="mt-7">

          <InspectorHeader
            title="Reasoning Model"
            icon={<BrainCircuit className="w-4 h-4" />}
          />

          <p className="text-[10px] font-mono text-gray-500 mt-3 break-all">
            {investigation.llm_reasoning.model_used}
          </p>

        </div>
      )}

    </div>
  );
}

/*
 * =================================================================
 * INSPECTOR HEADER
 * =================================================================
 */

function InspectorHeader({
  title,
  icon,
}) {
  return (
    <div className="flex items-center gap-2">

      <span className="text-gray-500">
        {icon}
      </span>

      <h3 className="text-xs uppercase tracking-wider font-semibold text-gray-400">
        {title}
      </h3>

    </div>
  );
}

/*
 * =================================================================
 * INFO ROW
 * =================================================================
 */

function InfoRow({
  label,
  value,
}) {
  return (
    <div className="flex items-start justify-between gap-4">

      <span className="text-[10px] uppercase tracking-wider text-gray-600">
        {label}
      </span>

      <span
        className="text-xs text-gray-300 text-right break-all max-w-[170px]"
        title={value ?? ''}
      >
        {value ?? '—'}
      </span>

    </div>
  );
}

/*
 * =================================================================
 * RELATION CARD
 * =================================================================
 */

function RelationCard({
  relation,
}) {
  const from =
    relation?.from || 'Unknown';

  const to =
    relation?.to || 'Unknown';

  const fromType =
    relation?.from_type || 'ENTITY';

  const toType =
    relation?.to_type || 'ENTITY';

  const relationType =
    relation?.relation || 'UNKNOWN';

  const evidenceLevel =
    relation?.evidence_level || 'UNKNOWN';

  const confidence =
    typeof relation?.confidence === 'number'
      ? `${Math.round(
          relation.confidence * 100
        )}%`
      : '—';

  return (
    <div className="rounded-lg border border-police-border bg-police-dark/40 p-3">

      {/* RELATION HEADER */}
      <div className="flex items-center justify-between gap-3">

        <span className="text-[10px] font-semibold text-red-400">
          {relationType}
        </span>

        <span className="text-[10px] font-mono text-gray-500">
          {confidence}
        </span>

      </div>

      {/* ENDPOINTS */}
      <div className="mt-3">

        <div className="text-xs text-gray-200">
          {from}
        </div>

        <div className="text-[9px] font-mono text-gray-600 mt-0.5">
          {fromType}
        </div>

        <div className="text-[10px] text-red-400 my-2">
          ↓ {relationType} ↓
        </div>

        <div className="text-xs text-gray-200">
          {to}
        </div>

        <div className="text-[9px] font-mono text-gray-600 mt-0.5">
          {toType}
        </div>

      </div>

      {/* EVIDENCE LEVEL */}
      <div className="mt-4 pt-3 border-t border-gray-800">

        <div className="flex items-center justify-between">

          <span className="text-[9px] uppercase tracking-wider text-gray-600">
            Evidence Level
          </span>

          <span
            className={`text-[9px] font-bold uppercase tracking-wider ${
              evidenceLevel === 'DIRECT'
                ? 'text-green-400'
                : 'text-yellow-400'
            }`}
          >
            {evidenceLevel}
          </span>

        </div>

      </div>

      {/* ACTUAL EVIDENCE / REASONING */}
      {relation?.reasoning && (
        <div className="mt-3">

          <p className="text-[9px] uppercase tracking-wider text-gray-600 mb-1">
            Evidence
          </p>

          <p className="text-[10px] text-gray-400 leading-relaxed">
            {relation.reasoning}
          </p>

        </div>
      )}

    </div>
  );
}

/*
 * =================================================================
 * SUSPICIOUS FLAG CARD
 * =================================================================
 */

function FlagCard({
  flag,
}) {
  const type =
    flag?.flag ||
    flag?.type ||
    'unknown_flag';

  const detail =
    flag?.detail ||
    flag?.reasoning ||
    'No additional detail provided.';

  return (
    <div className="rounded-lg border border-red-500/15 bg-red-500/5 p-3">

      <div className="flex items-start gap-2">

        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />

        <div className="min-w-0">

          <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold break-words">
            {String(type).replaceAll('_', ' ')}
          </p>

          <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
            {detail}
          </p>

        </div>

      </div>

    </div>
  );
}
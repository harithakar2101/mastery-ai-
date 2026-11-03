import React, { useState } from 'react';
import { useTutor } from '../../context/TutorContext';
import { Server, Terminal, Play, CheckCircle, AlertCircle, RefreshCw, Database, Globe } from 'lucide-react';

export const WebDevLab: React.FC = () => {
  const { recordAttempt } = useTutor();
  const [docRoot, setDocRoot] = useState('/var/www/html');
  const [dbPort, setDbPort] = useState('3306');
  const [usePreparedStatements, setUsePreparedStatements] = useState(true);
  const [logs, setLogs] = useState<string[]>([
    '[system] Apache HTTP Server daemon v2.4 initialized.',
    '[system] MySQL database daemon listening on 127.0.0.1.',
  ]);
  const [status, setStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');

  const handleTestDeployment = async () => {
    setStatus('running');
    setLogs(prev => [...prev, `[deploy] Testing server configuration at ${new Date().toLocaleTimeString()}...`]);

    setTimeout(async () => {
      const isDocRootCorrect = docRoot.trim() === '/var/www/html';
      const isPortCorrect = dbPort.trim() === '3306';
      const isSecured = usePreparedStatements;

      const isSuccess = isDocRootCorrect && isPortCorrect && isSecured;

      if (!isDocRootCorrect) {
        setLogs(prev => [
          ...prev,
          `[error] 404 Not Found: Cannot resolve DocumentRoot at '${docRoot}'. Files must map to '/var/www/html'.`,
        ]);
      }
      if (!isPortCorrect) {
        setLogs(prev => [
          ...prev,
          `[error] SQLSTATE[HY000] [2002] Connection refused on port ${dbPort}. MySQL daemon listens on 3306.`,
        ]);
      }
      if (!isSecured) {
        setLogs(prev => [
          ...prev,
          `[security-alert] Critical Vulnerability: Dynamic SQL string concatenation detected. Parameterized queries required.`,
        ]);
      }

      if (isSuccess) {
        setLogs(prev => [
          ...prev,
          '[success] HTTP/1.1 200 OK: Virtual host DocumentRoot mapped correctly.',
          '[success] MySQL connection established on TCP port 3306.',
          '[success] Prepared statements active. SQL Injection defenses verified.',
        ]);
        setStatus('success');
      } else {
        setStatus('error');
      }

      await recordAttempt({
        conceptId: !isPortCorrect ? 'pdo_mysql_port' : !isDocRootCorrect ? 'web_apache_docroot' : 'sql_injection_defense',
        kind: 'code_lab',
        passed: isSuccess,
        tierUsed: isSuccess ? 1 : 2,
        hintsRequested: isSuccess ? 0 : 1,
        durationSec: 45,
        errorCategory: !isPortCorrect ? 'PORT_MISMATCH' : !isDocRootCorrect ? 'DOCROOT_MISCONFIGURATION' : 'SQLI_VULNERABILITY',
      });
    }, 600);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-[#0c1421] border border-[#1a273b] rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Virtual Web Architecture & Database Lab</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 font-mono">
                EMULATED
              </span>
            </h1>
            <p className="text-xs text-slate-400">Interactive Apache DocumentRoot, PDO MySQL daemon, and SQLi Defense</p>
          </div>
        </div>

        <button
          onClick={handleTestDeployment}
          disabled={status === 'running'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer"
        >
          {status === 'running' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          <span>Verify Architecture</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls Card */}
        <div className="p-5 bg-[#0c1421] border border-[#1a273b] rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <span>Server Directives & Configuration</span>
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Apache VirtualHost DocumentRoot
            </label>
            <input
              type="text"
              value={docRoot}
              onChange={e => setDocRoot(e.target.value)}
              className="w-full bg-[#070d18] border border-[#1a273b] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="/var/www/html"
            />
            <div className="text-[10px] text-slate-500 mt-1">Expected web directory: /var/www/html</div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>MySQL TCP Listener Port</span>
            </label>
            <input
              type="text"
              value={dbPort}
              onChange={e => setDbPort(e.target.value)}
              className="w-full bg-[#070d18] border border-[#1a273b] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="3306"
            />
            <div className="text-[10px] text-slate-500 mt-1">Standard MySQL daemon port: 3306</div>
          </div>

          <div className="p-3 bg-[#070d18] border border-[#1a273b] rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Enforce Parameterized Prepared Statements</div>
              <div className="text-[10px] text-slate-500">Defends against SQL injection in user authentication queries</div>
            </div>
            <input
              type="checkbox"
              checked={usePreparedStatements}
              onChange={e => setUsePreparedStatements(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Console Logs */}
        <div className="p-5 bg-[#0c1421] border border-[#1a273b] rounded-2xl flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Server & Daemon Console Log</span>
            </h2>
            <button
              onClick={() => setLogs([])}
              className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="flex-1 bg-[#060b13] border border-[#1a273b] rounded-xl p-3 font-mono text-[11px] space-y-1.5 overflow-y-auto max-h-[300px]">
            {logs.map((log, i) => {
              const isErr = log.includes('[error]') || log.includes('[security-alert]');
              const isSucc = log.includes('[success]');
              return (
                <div
                  key={i}
                  className={
                    isErr
                      ? 'text-red-400'
                      : isSucc
                      ? 'text-emerald-400'
                      : 'text-slate-400'
                  }
                >
                  {log}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

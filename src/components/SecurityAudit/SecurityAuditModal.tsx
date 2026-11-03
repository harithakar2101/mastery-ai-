import React, { useEffect, useState } from 'react';
import { ShieldCheck, X, CheckCircle2, Lock, AlertCircle, RefreshCw } from 'lucide-react';

interface SecurityAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AuditCheck {
  check_name: string;
  passed: boolean;
  details: string;
}

interface AuditResponse {
  status: string;
  timestamp: string;
  audit_checks: AuditCheck[];
}

export const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({ isOpen, onClose }) => {
  const [auditData, setAuditData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security-audit');
      const data = await res.json();
      setAuditData(data);
    } catch (err) {
      console.error('Failed to fetch security audit:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAudit();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0c1421] border border-[#1a273b] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 pb-4 border-b border-[#1a273b]">
          <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Security & Reliability Audit</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700 font-mono">
                SECURED
              </span>
            </h2>
            <p className="text-xs text-slate-400">Production-grade cryptographic verification & RBAC policy</p>
          </div>
        </div>

        <div className="py-4 space-y-3">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>Running automated security checks...</span>
            </div>
          ) : auditData ? (
            auditData.audit_checks.map((chk, i) => (
              <div
                key={i}
                className="p-3 bg-[#070d18] border border-[#1a273b] rounded-xl flex items-start gap-3"
              >
                {chk.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold text-slate-200">{chk.check_name}</div>
                  <div className="text-[11px] text-slate-400">{chk.details}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-red-400">Failed to load security audit details.</div>
          )}
        </div>

        <div className="pt-3 border-t border-[#1a273b] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold"
          >
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
  Radio,
  Coffee,
  Sparkles,
  HelpCircle,
  Shield,
  Layers,
  History,
  Trash2,
  Bell,
  HeartPulse,
} from 'lucide-react';
import { useTutor } from '../../context/TutorContext';
import {
  EngagementEvent,
  EngagementEventType,
  HapticCommand,
  SensorSource,
  AttentionProxiesState,
  VerificationQuestionState,
  MASTERY_BAND_UUIDS,
} from './types';
import { WebcamAttentionProxy } from './WebcamAttentionProxy';
import { MasteryBandSimulator } from './MasteryBandSimulator';
import { SelfReportVerificationModal } from './SelfReportVerificationModal';

export const EngagementPanel: React.FC = () => {
  const {
    selectedNode,
    islm,
    recordObservation,
    sendChatMessage,
    setCurrentWorkflow,
    executeTutoring,
  } = useTutor();

  // Attention Proxies State
  const [proxies, setProxies] = useState<AttentionProxiesState>({
    isTabVisible: typeof document !== 'undefined' ? document.visibilityState === 'visible' : true,
    idleSeconds: 0,
    consecutiveFailures: 0,
    motionScore: 0,
    presenceDetected: true,
    webcamConsent: false,
    webcamActive: false,
    tutorNudgeActive: false,
    breakOffered: false,
  });

  // Event Log
  const [events, setEvents] = useState<EngagementEvent[]>([
    {
      id: 'evt_init',
      timestamp: new Date().toLocaleTimeString(),
      type: 'TAB_VISIBLE',
      source: 'REAL SENSOR',
      description: 'Browser tab active; optical & idle proxies listening.',
    },
  ]);

  // Last sent haptic command
  const [lastHaptic, setLastHaptic] = useState<HapticCommand | undefined>(undefined);

  // Real BLE State
  const [isRealBLEConnected, setIsRealBLEConnected] = useState<boolean>(false);
  const [bleDeviceName, setBleDeviceName] = useState<string | undefined>(undefined);
  const bleCommandCharRef = useRef<any>(null);

  // Self Report Verification Modal
  const [verificationModal, setVerificationModal] = useState<VerificationQuestionState>({
    isOpen: false,
    conceptId: selectedNode.id,
    conceptName: selectedNode.name,
    question: `Which statement accurately captures the core rule for ${selectedNode.name}?`,
    options: [
      selectedNode.keyConcept,
      `Avoid modifying parameters because defaults automatically eliminate execution errors.`,
      `Always allocate memory globally to prevent stack frame disposal during execution.`,
      selectedNode.typicalTrap,
    ],
    correctIndex: 0,
  });

  // Add event helper
  const addEvent = useCallback((
    type: EngagementEventType,
    source: SensorSource,
    description: string,
    tierInfluenced?: number,
    hapticSent?: HapticCommand
  ) => {
    const newEvt: EngagementEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      type,
      source,
      description,
      tierInfluenced,
      hapticSent,
    };
    setEvents(prev => [newEvt, ...prev].slice(0, 30));
  }, []);

  // Send Haptic Command over BLE if connected
  const sendHapticCommand = useCallback(async (cmd: HapticCommand) => {
    setLastHaptic(cmd);
    if (bleCommandCharRef.current) {
      try {
        const encoder = new TextEncoder();
        await bleCommandCharRef.current.writeValue(encoder.encode(cmd));
      } catch (err) {
        console.warn('Failed to write haptic command to BLE peripheral:', err);
      }
    }
  }, []);

  // 1. Tab Visibility Attention Proxy
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setProxies(prev => ({ ...prev, isTabVisible: isVisible }));

      if (!isVisible) {
        addEvent('TAB_HIDDEN', 'REAL SENSOR', 'Student navigated away from browser tab.');
        setProxies(prev => ({
          ...prev,
          tutorNudgeActive: true,
          nudgeMessage: 'You stepped away from the tab. Are you still with us?',
        }));
      } else {
        addEvent('TAB_VISIBLE', 'REAL SENSOR', 'Student returned to CogniCSE workspace.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [addEvent]);

  // 2. Idle Timer Attention Proxy (3 minute rule: >180s)
  useEffect(() => {
    const resetIdle = () => {
      setProxies(prev => ({ ...prev, idleSeconds: 0 }));
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('scroll', resetIdle);
    window.addEventListener('click', resetIdle);

    const interval = setInterval(() => {
      setProxies(prev => {
        const nextIdle = prev.idleSeconds + 1;
        // 3 minute rule (180 seconds)
        if (nextIdle === 180 && !prev.tutorNudgeActive) {
          addEvent('IDLE_TIMEOUT', 'REAL SENSOR', 'User idle for 3 minutes without keyboard/mouse interaction.');
          return {
            ...prev,
            idleSeconds: nextIdle,
            tutorNudgeActive: true,
            nudgeMessage: "It looks like you've been idle for 3 minutes. Are you still with us? Would a quick hint help get unstuck?",
          };
        }
        return { ...prev, idleSeconds: nextIdle };
      });
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('scroll', resetIdle);
      window.removeEventListener('click', resetIdle);
      clearInterval(interval);
    };
  }, [addEvent]);

  // Handle MasteryBand BLE Event from physical hardware or on-screen simulator
  const handleMasteryBandEvent = (type: EngagementEventType, source: SensorSource) => {
    switch (type) {
      case 'NEED_HELP': {
        // Single tap -> Tier 1 Metacognitive Hint
        sendHapticCommand('SINGLE_SHORT');
        addEvent('NEED_HELP', source, 'MasteryBand single tap: requested Tier 1 hint.', 1, 'SINGLE_SHORT');
        executeTutoring(`I need a Tier 1 hint on ${selectedNode.name}`, undefined, undefined, 'CHATS');
        sendHapticCommand('DOUBLE_SHORT');
        break;
      }

      case 'NEED_HINT': {
        // Double tap -> Tier 2 Conceptual Guidance
        sendHapticCommand('DOUBLE_SHORT');
        addEvent('NEED_HINT', source, 'MasteryBand double tap: requested Tier 2 guidance.', 2, 'DOUBLE_SHORT');
        executeTutoring(`Please explain the concept and give a Tier 2 hint on ${selectedNode.name}`, undefined, undefined, 'CHATS');
        break;
      }

      case 'NEED_BREAK': {
        // Triple tap / hold -> Schedules a pause
        sendHapticCommand('LONG');
        addEvent('NEED_BREAK', source, 'MasteryBand break signal: scheduled 5-min cognitive pause.', undefined, 'LONG');
        setProxies(prev => ({
          ...prev,
          breakOffered: true,
          tutorNudgeActive: true,
          nudgeMessage: "Restorative Break Activated: Step back, take a breath, and hydrate! We'll hold your spot for 5 minutes.",
        }));
        break;
      }

      case 'I_UNDERSTAND': {
        // Long press -> Self-report! Do not update BKT directly. Prompt 1 verification question.
        sendHapticCommand('SINGLE_SHORT');
        addEvent('I_UNDERSTAND', source, 'MasteryBand self-report: triggered 1 verification question.', undefined, 'SINGLE_SHORT');
        setVerificationModal({
          isOpen: true,
          conceptId: selectedNode.id,
          conceptName: selectedNode.name,
          question: `Self-Report Check for ${selectedNode.name}: Which statement correctly describes the underlying rule?`,
          options: [
            selectedNode.keyConcept,
            `Bypass constraint checks to prioritize rapid prototype execution.`,
            `Ignore port bindings because runtimes forward traffic across arbitrary sockets.`,
            selectedNode.typicalTrap,
          ],
          correctIndex: 0,
        });
        break;
      }

      default:
        break;
    }
  };

  // Verification result handler
  const handleVerificationResult = (isCorrect: boolean) => {
    if (isCorrect) {
      // Verified! Now update BKT and send SHORT_LONG
      recordObservation({
        conceptId: selectedNode.id,
        isCorrect: true,
        isIndependent: true,
        source: 'band-verification',
      });
      sendHapticCommand('SHORT_LONG');
      addEvent('I_UNDERSTAND', 'REAL SENSOR', `Verification passed! BKT updated. Haptic SHORT_LONG transmitted.`, undefined, 'SHORT_LONG');
    } else {
      recordObservation({
        conceptId: selectedNode.id,
        isCorrect: false,
        isIndependent: false,
        source: 'band-verification',
        errorCategory: 'Self-Report Gap',
      });
      sendHapticCommand('SINGLE_SHORT');
      addEvent('I_UNDERSTAND', 'REAL SENSOR', `Verification failed. Concept gap identified. Tier 1 hint recommended.`, 1, 'SINGLE_SHORT');
    }
    setVerificationModal(prev => ({ ...prev, isOpen: false }));
  };

  // Real Web Bluetooth Pairing Handler
  const connectRealBLE = async () => {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      alert('Web Bluetooth API is not supported in this browser. Please use Google Chrome or Microsoft Edge on HTTPS or localhost.');
      return;
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [MASTERY_BAND_UUIDS.SERVICE] }],
      });

      setBleDeviceName(device.name || 'MasteryBand-BLE');
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(MASTERY_BAND_UUIDS.SERVICE);

      // Event characteristic (NOTIFY)
      const eventChar = await service.getCharacteristic(MASTERY_BAND_UUIDS.EVENT_CHAR);
      await eventChar.startNotifications();
      eventChar.addEventListener('characteristicvaluechanged', (e: any) => {
        const value = new TextDecoder().decode(e.target.value);
        try {
          const parsed = JSON.parse(value);
          if (parsed.event) {
            handleMasteryBandEvent(parsed.event as EngagementEventType, 'REAL SENSOR');
          }
        } catch {
          // not json
        }
      });

      // Command characteristic (WRITE)
      const cmdChar = await service.getCharacteristic(MASTERY_BAND_UUIDS.COMMAND_CHAR);
      bleCommandCharRef.current = cmdChar;

      setIsRealBLEConnected(true);
      addEvent('NEED_HELP', 'REAL SENSOR', `Paired with physical BLE peripheral: ${device.name || 'MasteryBand'}`);
    } catch (err: any) {
      console.warn('Web Bluetooth pair failed:', err);
      alert(`Bluetooth pairing note: ${err.message || 'Pairing aborted or denied'}. If running inside an iframe, open the app in a standalone window or use the on-screen simulator.`);
    }
  };

  const disconnectRealBLE = () => {
    setIsRealBLEConnected(false);
    bleCommandCharRef.current = null;
    setBleDeviceName(undefined);
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="bg-[#0b1320] border border-[#1a273b] rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="p-1.5 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800/60">
              <HeartPulse className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
              Engagement & Sensor Telemetry Hub
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
              REAL SENSOR & SIMULATED
            </span>
          </div>
          <h1 className="text-xl font-bold text-white">
            Attention Proxies & MasteryBand BLE Wearable
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Sensors influence <strong>WHEN</strong> the tutor intervenes. They never modify mastery scores directly.
            Tracks tab focus, idle durations, micromotion via frame differencing, and tactile Bluetooth haptics.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setCurrentWorkflow('CHATS')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-950/40 transition-colors cursor-pointer"
          >
            Return to Socratic Tutor
          </button>
        </div>
      </div>

      {/* ACTIVE TUTOR PROACTIVE REACTION BANNER */}
      {proxies.tutorNudgeActive && (
        <div className="bg-gradient-to-r from-amber-950/60 to-indigo-950/60 border border-amber-600/60 rounded-2xl p-4 shadow-xl flex items-center justify-between gap-4 animate-fade-in flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-amber-300 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                Pedagogical Sensor Trigger Active
              </div>
              <p className="text-xs text-slate-100 font-medium mt-0.5">
                {proxies.nudgeMessage}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setProxies(prev => ({ ...prev, tutorNudgeActive: false }));
                executeTutoring(`I'm back and ready to continue with ${selectedNode.name}.`, undefined, undefined, 'CHATS');
                setCurrentWorkflow('CHATS');
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Resume with Tutor
            </button>
            <button
              onClick={() => setProxies(prev => ({ ...prev, tutorNudgeActive: false }))}
              className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* METRIC GAUGES: ATTENTION PROXIES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Tab Visibility */}
        <div className="bg-[#0c1422] border border-[#1b2b42] rounded-xl p-4 text-center">
          <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1.5">
            {proxies.isTabVisible ? <Eye className="w-3.5 h-3.5 text-emerald-400" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
            <span>Tab Visibility Proxy</span>
          </div>
          <div className={`text-xl font-bold ${proxies.isTabVisible ? 'text-emerald-400' : 'text-rose-400'}`}>
            {proxies.isTabVisible ? 'FOCUSED' : 'HIDDEN'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Rule: gentle nudge if hidden</div>
        </div>

        {/* Idle Duration */}
        <div className="bg-[#0c1422] border border-[#1b2b42] rounded-xl p-4 text-center">
          <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Idle Time Proxy</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-100">
            {Math.floor(proxies.idleSeconds / 60)}m {proxies.idleSeconds % 60}s
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">3 min threshold (180s)</div>
        </div>

        {/* Optical Micromotion */}
        <div className="bg-[#0c1422] border border-[#1b2b42] rounded-xl p-4 text-center">
          <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>Optical Motion Delta</span>
          </div>
          <div className="text-xl font-bold font-mono text-blue-400">
            {proxies.motionScore}%
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">Local frame differencing</div>
        </div>

        {/* Rapid Failure Guard */}
        <div className="bg-[#0c1422] border border-[#1b2b42] rounded-xl p-4 text-center">
          <div className="text-xs text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
            <span>Consecutive Errors</span>
          </div>
          <div className="text-xl font-bold font-mono text-purple-400">
            {islm.error_count}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 font-mono">3 fails &rarr; offer break/lower tier</div>
        </div>
      </div>

      {/* SPLIT ROW: WEBCAM ATTENTION PROXY & HARDWARE SIMULATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <WebcamAttentionProxy
            onMotionUpdate={(score, present) => {
              setProxies(prev => ({ ...prev, motionScore: score, presenceDetected: present }));
            }}
          />
        </div>
        <div>
          <MasteryBandSimulator
            onTriggerEvent={handleMasteryBandEvent}
            lastHapticCommand={lastHaptic}
            isRealBLEConnected={isRealBLEConnected}
            onConnectRealBLE={connectRealBLE}
            onDisconnectRealBLE={disconnectRealBLE}
            bleDeviceName={bleDeviceName}
          />
        </div>
      </div>

      {/* SENSOR & ENGAGEMENT EVENT LOG TABLE */}
      <div className="bg-[#0b1320] border border-[#1a273b] rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#16253a]">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Sensor Telemetry & Haptic Event Log
            </h3>
          </div>
          <button
            onClick={() => setEvents([])}
            className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        </div>

        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {events.length === 0 ? (
            <div className="text-xs text-slate-500 py-3 text-center">No sensor events recorded yet.</div>
          ) : (
            events.map(evt => (
              <div
                key={evt.id}
                className="bg-[#070c14] border border-[#152336] rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">{evt.timestamp}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      evt.source === 'REAL SENSOR'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-purple-950 text-purple-300 border border-purple-800'
                    }`}
                  >
                    {evt.source}
                  </span>
                  <span className="font-semibold text-slate-200">{evt.description}</span>
                </div>

                <div className="flex items-center gap-2 font-mono text-[11px]">
                  {evt.tierInfluenced && (
                    <span className="text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800">
                      Tier {evt.tierInfluenced}
                    </span>
                  )}
                  {evt.hapticSent && (
                    <span className="text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                      Haptic: {evt.hapticSent}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SELF REPORT VERIFICATION MODAL */}
      <SelfReportVerificationModal
        modalState={verificationModal}
        onClose={() => setVerificationModal(prev => ({ ...prev, isOpen: false }))}
        onVerifyResult={handleVerificationResult}
      />
    </div>
  );
};

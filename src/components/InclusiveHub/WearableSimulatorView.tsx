import React, { useState, useEffect, useRef } from 'react';
import {
  Watch,
  Radio,
  Play,
  Square,
  RefreshCw,
  AlertCircle,
  Coffee,
  CheckCircle2,
  XCircle,
  Trash2,
  Zap,
  Eye,
  VolumeX,
  MessageSquareOff,
  Sliders,
  Sparkles,
  ArrowRight,
  Send,
} from 'lucide-react';
import { AccessibilityMode, WearableRequestType, WearableEvent } from './types';
import {
  WEARABLE_CONFIG,
  getVibrationPattern,
  getLedColor,
  getOledText,
  triggerHapticFeedback,
} from '../../config/wearableAccessibilityConfig';

interface WearableSimulatorViewProps {
  highContrast?: boolean;
}

export const WearableSimulatorView: React.FC<WearableSimulatorViewProps> = ({
  highContrast = false,
}) => {
  // Device mode & profile state
  const [connectionMode, setConnectionMode] = useState<'simulation' | 'hardware'>('simulation');
  const [selectedProfile, setSelectedProfile] = useState<AccessibilityMode>('NON_SPEAKING');
  const [deviceId, setDeviceId] = useState<string>('ESP32-03');
  const [studentId, setStudentId] = useState<string>('STU_SIM_C');
  const [studentName, setStudentName] = useState<string>('Student C');

  // Simulation controls
  const [isAutoSimulating, setIsAutoSimulating] = useState<boolean>(false);
  const [autoIntervalSec, setAutoIntervalSec] = useState<number>(10);
  const [isDispatching, setIsDispatching] = useState<boolean>(false);

  // Active virtual device display state
  const [currentRequest, setCurrentRequest] = useState<WearableRequestType | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<string>('IDLE');
  const [activeLedHex, setActiveLedHex] = useState<string>('#475569');
  const [oledDisplayMessage, setOledDisplayMessage] = useState<string>('SELECT REQUEST:\n[HELP] [BREAK]');
  const [isVibrating, setIsVibrating] = useState<boolean>(false);
  const [activeVibrationName, setActiveVibrationName] = useState<string>('Idle');
  const [vibrationTimeline, setVibrationTimeline] = useState<number[]>([]);

  // Live journey log
  const [journeyLogs, setJourneyLogs] = useState<Array<{
    id: string;
    timestamp: string;
    step: 'DEVICE' | 'BACKEND' | 'DASHBOARD' | 'ACK' | 'FEEDBACK';
    description: string;
    status: 'info' | 'success' | 'warn' | 'error';
  }>>([]);

  const autoSimTimerRef = useRef<any>(null);

  // Sync profile switch with device ID and simulated student
  useEffect(() => {
    if (selectedProfile === 'BLIND') {
      setDeviceId('ESP32-01');
      setStudentId('STU_SIM_A');
      setStudentName('Student A (Blind Mode)');
      setOledDisplayMessage('');
    } else if (selectedProfile === 'DEAF') {
      setDeviceId('ESP32-02');
      setStudentId('STU_SIM_B');
      setStudentName('Student B (Deaf Mode)');
      setOledDisplayMessage(getOledText('DEAF', 'IDLE'));
    } else {
      setDeviceId('ESP32-03');
      setStudentId('STU_SIM_C');
      setStudentName('Student C (Non-speaking)');
      setOledDisplayMessage(getOledText('NON_SPEAKING', 'IDLE'));
    }
  }, [selectedProfile]);

  const addLog = (
    step: 'DEVICE' | 'BACKEND' | 'DASHBOARD' | 'ACK' | 'FEEDBACK',
    description: string,
    status: 'info' | 'success' | 'warn' | 'error' = 'info'
  ) => {
    setJourneyLogs(prev => [
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toLocaleTimeString(),
        step,
        description,
        status,
      },
      ...prev.slice(0, 40),
    ]);
  };

  const triggerDeviceFeedback = (vibKey: any, ledHex: string, oledText: string) => {
    const pattern = getVibrationPattern(vibKey);
    setVibrationTimeline(pattern);
    setActiveVibrationName(vibKey);
    setActiveLedHex(ledHex);
    setOledDisplayMessage(oledText);

    // Trigger visual and physical pulse
    setIsVibrating(true);
    triggerHapticFeedback(pattern);
    setTimeout(() => setIsVibrating(false), Math.min(pattern.reduce((a, b) => a + b, 0) + 200, 2000));
  };

  // Submit request using the exact same backend pipeline
  const submitRequest = async (reqType: WearableRequestType) => {
    setIsDispatching(true);
    setCurrentRequest(reqType);
    setDeviceStatus('Pending');

    const eventId = `sim_evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    addLog('DEVICE', `Student pressed '${reqType.replace(/_/g, ' ')}' button on ${deviceId}. Generating event.`);

    // Local immediate tactile activation
    triggerDeviceFeedback('ACTIVATION', '#EAB308', getOledText(selectedProfile, 'Pending'));

    try {
      addLog('BACKEND', `Transmitting payload to POST /api/inclusive/events...`);
      const res = await fetch('/api/inclusive/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-token': `token_${deviceId}`,
        },
        body: JSON.stringify({
          event_id: eventId,
          device_id: deviceId,
          student_id: studentId,
          event_type: 'HELP_REQUEST',
          request: reqType,
          accessibility_mode: selectedProfile,
          timestamp: new Date().toISOString(),
          source: connectionMode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        addLog('DASHBOARD', `Event recorded in database. Queued on Teacher Dashboard.`, 'success');
        addLog('FEEDBACK', `Wearable received response: ${data.feedback.vibration_pattern} / ${data.feedback.led_color}`, 'success');

        triggerDeviceFeedback(
          data.feedback.vibration_pattern,
          data.feedback.led_color,
          data.feedback.oled_text || getOledText(selectedProfile, 'Pending')
        );
      } else {
        addLog('BACKEND', `Event delivery failed: ${data.error?.message || 'Unknown error'}`, 'error');
        triggerDeviceFeedback('FAILURE', '#EF4444', 'DELIVERY FAILED');
      }
    } catch (err: any) {
      addLog('BACKEND', `Network connection failure: ${err.message}`, 'error');
      triggerDeviceFeedback('FAILURE', '#EF4444', 'NETWORK ERROR');
    } finally {
      setIsDispatching(false);
    }
  };

  // Simulate Teacher Acknowledge
  const simulateTeacherAcknowledge = () => {
    setDeviceStatus('Acknowledged');
    addLog('ACK', `Instructor recognized request on dashboard and dispatched ACK.`, 'success');
    triggerDeviceFeedback('ACKNOWLEDGED', '#3B82F6', getOledText(selectedProfile, 'Acknowledged'));
  };

  // Cancel Request
  const cancelActiveRequest = () => {
    submitRequest('CANCEL');
  };

  // Reset Virtual Device
  const resetVirtualDevice = () => {
    setCurrentRequest(null);
    setDeviceStatus('IDLE');
    setActiveLedHex('#475569');
    setOledDisplayMessage(getOledText(selectedProfile, 'IDLE'));
    setIsVibrating(false);
    setVibrationTimeline([]);
    setActiveVibrationName('Idle');
    addLog('DEVICE', `Virtual wearable ${deviceId} reset to Standby.`);
  };

  // Auto Simulation Loop
  useEffect(() => {
    if (isAutoSimulating) {
      autoSimTimerRef.current = setInterval(() => {
        const requests: WearableRequestType[] = ['I_NEED_HELP', 'I_NEED_BREAK'];
        const randomReq = requests[Math.floor(Math.random() * requests.length)];
        submitRequest(randomReq);
      }, autoIntervalSec * 1000);
    } else {
      if (autoSimTimerRef.current) clearInterval(autoSimTimerRef.current);
    }
    return () => {
      if (autoSimTimerRef.current) clearInterval(autoSimTimerRef.current);
    };
  }, [isAutoSimulating, autoIntervalSec, selectedProfile, deviceId, studentId, connectionMode]);

  // Clear simulation records from database
  const clearSimulationData = async () => {
    if (!window.confirm('Are you sure you want to purge all simulated events and sensor records from the database? Real student records are never affected.')) {
      return;
    }
    try {
      const res = await fetch('/api/inclusive/simulation/clear', { method: 'POST' });
      if (res.ok) {
        addLog('BACKEND', `Simulation data cleared from database.`, 'success');
        resetVirtualDevice();
      }
    } catch {
      alert('Failed to clear simulation data');
    }
  };

  return (
    <div className="space-y-6" role="main" aria-label="Wearable Simulator">
      {/* SIMULATED PROVENANCE BANNER */}
      <div className="bg-purple-950/40 border border-purple-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-700/60 flex items-center justify-center text-purple-300 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                Interactive Wearable Simulator & Hardware Bridge
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-900 text-purple-200 border border-purple-600">
                SIMULATED DATA ISOLATED
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Simulated events test the entire real pipeline without contaminating real student records or BKT mastery scores.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={clearSimulationData}
          className="px-3.5 py-1.5 bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Simulation Data</span>
        </button>
      </div>

      {/* TOP CONTROLS: CONNECTION MODE & PROFILE SELECTOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode Selector */}
        <div className="bg-[#0b1322] border border-[#1b2b42] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Device Connection Mode</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {connectionMode === 'simulation'
                ? 'Emulated virtual ESP32 firmware running inside browser.'
                : 'Listening to physical ESP32 packets over HTTPS.'}
            </div>
          </div>
          <div className="flex bg-[#070d18] border border-[#1c2c43] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setConnectionMode('simulation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                connectionMode === 'simulation'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Simulation Mode
            </button>
            <button
              type="button"
              onClick={() => setConnectionMode('hardware')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                connectionMode === 'hardware'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hardware Mode
            </button>
          </div>
        </div>

        {/* Accessibility Profile Selector */}
        <div className="bg-[#0b1322] border border-[#1b2b42] rounded-2xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">Accessibility Profile</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Current: <strong className="text-white">{studentName}</strong>
            </div>
          </div>
          <div className="flex bg-[#070d18] border border-[#1c2c43] p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setSelectedProfile('BLIND')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                selectedProfile === 'BLIND'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Blind Mode: Tactile vibration only"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Blind</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedProfile('DEAF')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                selectedProfile === 'DEAF'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Deaf Mode: OLED & RGB LED alerts"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Deaf</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedProfile('NON_SPEAKING')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                selectedProfile === 'NON_SPEAKING'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Non-speaking Mode: Request phrase buttons"
            >
              <MessageSquareOff className="w-3.5 h-3.5" />
              <span>Non-speaking</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN SIMULATOR WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VIRTUAL WEARABLE HARDWARE CHASSIS */}
        <div className="bg-[#09101d] border-2 border-[#1c2d46] rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Chassis Top Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-[#17253b]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-xs font-bold text-white tracking-wider">{deviceId}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {selectedProfile}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">BATTERY: 92%</span>
            </div>
          </div>

          {/* VIRTUAL RGB STATUS LED */}
          <div className="flex items-center justify-between bg-[#060b14] p-3.5 rounded-2xl border border-[#162439]">
            <div className="flex items-center gap-2.5">
              <div
                className="w-5 h-5 rounded-full transition-all duration-300 border-2 shadow-lg"
                style={{
                  backgroundColor: activeLedHex,
                  borderColor: activeLedHex,
                  boxShadow: `0 0 14px ${activeLedHex}`,
                }}
                aria-label={`RGB Status LED color: ${activeLedHex}`}
              />
              <div>
                <div className="text-xs font-bold text-slate-200">Tri-Color RGB Status LED</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Current State: <strong className="text-white">{deviceStatus}</strong> ({activeLedHex})
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500">
              {selectedProfile === 'BLIND' ? '(Ignored in Blind Mode)' : 'Visible Indicator'}
            </span>
          </div>

          {/* VIRTUAL OLED SCREEN (Deaf & Non-speaking modes) */}
          <div className="bg-black border-4 border-slate-800 rounded-2xl p-4 font-mono shadow-inner min-h-[110px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] text-emerald-500 border-b border-emerald-950 pb-1">
              <span>MASTERY.AI ASSIST</span>
              <span>MODE: {selectedProfile}</span>
            </div>
            <div className="py-2 text-center text-sm font-bold tracking-wide text-emerald-400 whitespace-pre-line leading-relaxed">
              {selectedProfile === 'BLIND' ? (
                <span className="text-slate-600 italic">[OLED Disabled in Blind Mode - Tactile Only]</span>
              ) : (
                oledDisplayMessage || 'READY'
              )}
            </div>
            <div className="flex items-center justify-between text-[9px] text-emerald-600">
              <span>SIG: -62dBm</span>
              <span>SYS_OK</span>
            </div>
          </div>

          {/* HAPTIC VIBRATION MOTOR PULSE VISUALIZER */}
          <div className="bg-[#060b14] border border-[#162439] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Zap className={`w-4 h-4 ${isVibrating ? 'text-amber-400 animate-bounce' : 'text-slate-500'}`} />
                <span className="font-bold text-slate-200">Haptic Vibration Timeline Visualizer</span>
              </div>
              <span className={`text-[11px] font-mono font-bold ${isVibrating ? 'text-amber-400' : 'text-slate-500'}`}>
                {isVibrating ? 'MOTOR ACTIVE' : 'MOTOR IDLE'}
              </span>
            </div>

            {/* Pulse timeline wave */}
            <div className="h-10 bg-[#02050a] rounded-xl border border-[#131e30] flex items-center px-3 gap-1 overflow-x-auto">
              {vibrationTimeline.length === 0 ? (
                <span className="text-[10px] font-mono text-slate-600">No active vibration pattern</span>
              ) : (
                vibrationTimeline.map((ms, idx) => (
                  <div
                    key={idx}
                    className={`h-6 rounded transition-all duration-200 flex items-center justify-center text-[9px] font-mono font-bold text-black ${
                      isVibrating && idx % 2 === 0
                        ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                        : idx % 2 === 0
                        ? 'bg-amber-700/60'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                    style={{ width: `${Math.min(Math.max(ms / 4, 24), 80)}px` }}
                  >
                    {ms}ms
                  </div>
                ))
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Pattern Name: <strong className="text-slate-200">{activeVibrationName}</strong>
            </div>
          </div>

          {/* VIRTUAL PHYSICAL BUTTON CONTROLS */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {selectedProfile === 'BLIND' ? 'Physical Tactile Push Switches' : 'Tactile & Action Switches'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Button 1: Help Request */}
              <button
                type="button"
                disabled={isDispatching}
                onClick={() => submitRequest('I_NEED_HELP')}
                className="p-3.5 bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 border-2 border-red-700 text-red-100 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 shadow-lg"
              >
                <AlertCircle className="w-4 h-4 text-red-300" />
                <span>I Need Help</span>
              </button>

              {/* Button 2: Break Request */}
              <button
                type="button"
                disabled={isDispatching}
                onClick={() => submitRequest('I_NEED_BREAK')}
                className="p-3.5 bg-gradient-to-r from-amber-950 to-amber-900 hover:from-amber-900 hover:to-amber-800 border-2 border-amber-700 text-amber-100 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 shadow-lg"
              >
                <Coffee className="w-4 h-4 text-amber-300" />
                <span>I Need a Break</span>
              </button>

              {/* Button 3: Cancel Active Request */}
              <button
                type="button"
                disabled={isDispatching}
                onClick={cancelActiveRequest}
                className="p-3 bg-slate-900 hover:bg-slate-800 border-2 border-slate-700 text-slate-300 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <XCircle className="w-4 h-4 text-slate-400" />
                <span>Cancel Request</span>
              </button>

              {/* Button 4: Simulate Teacher Acknowledgment */}
              <button
                type="button"
                onClick={simulateTeacherAcknowledge}
                className="p-3 bg-blue-950 hover:bg-blue-900 border-2 border-blue-700 text-blue-200 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <span>Simulate Teacher ACK</span>
              </button>
            </div>
          </div>
        </div>

        {/* SIMULATOR MANAGEMENT & LIVE EVENT JOURNEY LOG */}
        <div className="space-y-6">
          {/* Simulation Control Toolbar */}
          <div className="bg-[#0b1322] border border-[#1b2b42] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#162337]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Automated Event Dispatcher
                </h3>
              </div>
              <button
                type="button"
                onClick={resetVirtualDevice}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer font-mono"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Device</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Auto-Simulation Interval</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={autoIntervalSec}
                    onChange={e => setAutoIntervalSec(Number(e.target.value))}
                    className="w-full cursor-pointer accent-blue-500"
                  />
                  <span className="text-xs font-mono font-bold text-white w-12 text-right">
                    {autoIntervalSec}s
                  </span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-md ${
                    isAutoSimulating
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isAutoSimulating ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isAutoSimulating ? 'Stop Auto-Simulation' : 'Start Auto-Simulation'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* LIVE EVENT JOURNEY LOG (Device -> Backend -> Dashboard -> Feedback) */}
          <div className="bg-[#09101d] border border-[#1a293f] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#162337]">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Live End-to-End Event Journey Log
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {journeyLogs.length} Lifecycle Milestones
              </span>
            </div>

            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {journeyLogs.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-slate-500">
                  Ready. Press any virtual button above to initiate an event journey.
                </div>
              ) : (
                journeyLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl bg-[#060b13] border border-[#162336] flex items-start gap-3 text-xs"
                  >
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono mt-0.5 shrink-0 ${
                        log.step === 'DEVICE'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : log.step === 'BACKEND'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : log.step === 'DASHBOARD'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : log.step === 'ACK'
                          ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {log.step}
                    </span>
                    <div className="flex-1">
                      <p className="text-slate-200 leading-relaxed">{log.description}</p>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 inline-block">
                        {log.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

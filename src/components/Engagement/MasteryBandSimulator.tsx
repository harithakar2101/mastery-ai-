import React, { useState } from 'react';
import {
  Watch,
  Bluetooth,
  BluetoothConnected,
  Zap,
  Hand,
  Clock,
  Sparkles,
  HelpCircle,
  Coffee,
  CheckCircle2,
  ExternalLink,
  Radio,
  FileCode2,
} from 'lucide-react';
import {
  EngagementEventType,
  HapticCommand,
  SensorSource,
  MASTERY_BAND_UUIDS,
} from './types';

interface MasteryBandSimulatorProps {
  onTriggerEvent: (type: EngagementEventType, source: SensorSource) => void;
  lastHapticCommand?: HapticCommand;
  isRealBLEConnected: boolean;
  onConnectRealBLE: () => void;
  onDisconnectRealBLE: () => void;
  bleDeviceName?: string;
}

export const MasteryBandSimulator: React.FC<MasteryBandSimulatorProps> = ({
  onTriggerEvent,
  lastHapticCommand,
  isRealBLEConnected,
  onConnectRealBLE,
  onDisconnectRealBLE,
  bleDeviceName,
}) => {
  const [activeGesture, setActiveGesture] = useState<string | null>(null);
  const [hapticPulsing, setHapticPulsing] = useState<boolean>(false);

  const simulateHaptic = (cmd: HapticCommand) => {
    setHapticPulsing(true);
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      if (cmd === 'SINGLE_SHORT') navigator.vibrate(100);
      else if (cmd === 'DOUBLE_SHORT') navigator.vibrate([80, 60, 80]);
      else if (cmd === 'TRIPLE_SHORT') navigator.vibrate([80, 60, 80, 60, 80]);
      else if (cmd === 'LONG') navigator.vibrate(600);
      else if (cmd === 'SHORT_LONG') navigator.vibrate([100, 80, 400]);
    }
    setTimeout(() => setHapticPulsing(false), 800);
  };

  const handleSimulate = (event: EngagementEventType, gestureLabel: string) => {
    setActiveGesture(gestureLabel);
    onTriggerEvent(event, 'SIMULATED');
    simulateHaptic('SINGLE_SHORT');
    setTimeout(() => setActiveGesture(null), 1500);
  };

  return (
    <div className="bg-[#0b1321] border border-[#1b2b42] rounded-2xl p-4 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#16253a] flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800/60">
            <Watch className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
              <span>MasteryBand BLE Peripheral</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                GATT: 12345678-...-cdef0
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Web Bluetooth tactile engagement band with bi-directional haptic motors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
              isRealBLEConnected
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
            }`}
          >
            {isRealBLEConnected ? 'REAL SENSOR (PAIRED)' : 'SIMULATED'}
          </span>
        </div>
      </div>

      {/* Web Bluetooth Hardware Pairing Bar */}
      <div className="bg-[#070c16] rounded-xl p-3 border border-[#16253a] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1">
          <div className="font-semibold text-slate-200 flex items-center gap-2">
            <Bluetooth className="w-4 h-4 text-blue-400" />
            <span>Physical Bluetooth Low Energy Device</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {isRealBLEConnected
              ? `Connected to hardware peripheral: ${bleDeviceName || 'MasteryBand-BLE'}`
              : 'Pair your ESP32 / Nordic nRF52 wearable device.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRealBLEConnected ? (
            <button
              onClick={onDisconnectRealBLE}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs font-semibold border border-rose-900/40 transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={onConnectRealBLE}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/40 transition-colors cursor-pointer"
            >
              <BluetoothConnected className="w-3.5 h-3.5" />
              <span>Pair Physical Band</span>
            </button>
          )}
        </div>
      </div>

      {/* Note about Web Bluetooth inside iframe */}
      <div className="bg-[#080f1a] border border-blue-900/40 rounded-xl p-2.5 text-[11px] text-blue-300 flex items-start gap-2">
        <Radio className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
        <div className="leading-relaxed">
          <strong>Environment Note:</strong> Web Bluetooth requires Chrome or Edge on HTTPS/localhost. Because
          preview iframes often restrict Bluetooth device pairing dialogs, pair physical hardware from a dedicated tab
          or local build. Use the on-screen hardware buttons below for full simulator testing.
        </div>
      </div>

      {/* On-Screen Hardware Wearable Graphic & Controls */}
      <div className="bg-[#060b13] border border-[#18263a] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Watch Face Visualizer */}
        <div className="relative w-48 h-48 rounded-full bg-gradient-to-b from-[#121c2d] to-[#070d17] border-4 border-slate-700 shadow-2xl flex flex-col items-center justify-center p-4 text-center shrink-0">
          <div
            className={`absolute inset-0 rounded-full border-4 border-blue-500/40 transition-opacity duration-300 pointer-events-none ${
              hapticPulsing ? 'opacity-100 animate-ping' : 'opacity-0'
            }`}
          />
          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">MasteryBand</div>
          <div className="font-mono text-xs font-bold text-emerald-400 mt-1">
            {activeGesture ? activeGesture : 'READY'}
          </div>

          {/* Last Haptic feedback display */}
          <div className="mt-2 text-[10px] text-slate-400">
            Haptic Command:
            <div className="font-mono text-cyan-300 font-bold mt-0.5">
              {lastHapticCommand || 'IDLE'}
            </div>
          </div>

          <div className="text-[9px] text-slate-500 mt-1 font-mono">
            Service: ...def0
          </div>
        </div>

        {/* Tactile Gesture Triggers */}
        <div className="flex-1 space-y-2 w-full">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Tactile Gesture Simulator</span>
            <span className="text-[10px] font-mono text-slate-400">Badge: SIMULATED</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {/* Single Tap -> NEED_HELP */}
            <button
              onClick={() => handleSimulate('NEED_HELP', 'Single Tap')}
              className="p-3 bg-[#0d1624] hover:bg-[#132034] text-left rounded-xl border border-[#1e2f47] transition-all cursor-pointer group space-y-1"
            >
              <div className="font-bold text-blue-300 flex items-center justify-between">
                <span>Single Tap</span>
                <Hand className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-[10px] text-slate-400">
                Event: <code className="text-blue-300">NEED_HELP</code>
              </div>
              <div className="text-[10px] text-emerald-400">
                Action: Triggers Tier 1 Metacognitive Hint
              </div>
            </button>

            {/* Double Tap -> NEED_HINT */}
            <button
              onClick={() => handleSimulate('NEED_HINT', 'Double Tap')}
              className="p-3 bg-[#0d1624] hover:bg-[#132034] text-left rounded-xl border border-[#1e2f47] transition-all cursor-pointer group space-y-1"
            >
              <div className="font-bold text-indigo-300 flex items-center justify-between">
                <span>Double Tap</span>
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-[10px] text-slate-400">
                Event: <code className="text-indigo-300">NEED_HINT</code>
              </div>
              <div className="text-[10px] text-indigo-400">
                Action: Triggers Tier 2 Conceptual Guidance
              </div>
            </button>

            {/* Long Press -> I_UNDERSTAND */}
            <button
              onClick={() => handleSimulate('I_UNDERSTAND', 'Long Press (1.5s)')}
              className="p-3 bg-[#0d1624] hover:bg-[#132034] text-left rounded-xl border border-[#1e2f47] transition-all cursor-pointer group space-y-1"
            >
              <div className="font-bold text-amber-300 flex items-center justify-between">
                <span>Long Press (1.5s)</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-[10px] text-slate-400">
                Event: <code className="text-amber-300">I_UNDERSTAND</code>
              </div>
              <div className="text-[10px] text-amber-400">
                Action: Self-report &rarr; 1 Verification Question
              </div>
            </button>

            {/* Triple Tap -> NEED_BREAK */}
            <button
              onClick={() => handleSimulate('NEED_BREAK', 'Triple Tap')}
              className="p-3 bg-[#0d1624] hover:bg-[#132034] text-left rounded-xl border border-[#1e2f47] transition-all cursor-pointer group space-y-1"
            >
              <div className="font-bold text-rose-300 flex items-center justify-between">
                <span>Triple Tap / Shake</span>
                <Coffee className="w-3.5 h-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="text-[10px] text-slate-400">
                Event: <code className="text-rose-300">NEED_BREAK</code>
              </div>
              <div className="text-[10px] text-rose-400">
                Action: Schedules 5-min cognitive pause
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer link to firmware documentation */}
      <div className="pt-2 border-t border-[#16253a] flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <FileCode2 className="w-4 h-4 text-indigo-400" />
          <span>Device Firmware: Arduino / ESP32 C++ BLE Stack</span>
        </div>
        <a
          href="#firmware-doc"
          onClick={e => {
            e.preventDefault();
            alert('MasteryBand firmware source is located at /firmware/MasteryBand/MasteryBand.ino and /firmware/MasteryBand/README.md.');
          }}
          className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
        >
          <span>View /firmware/MasteryBand/README.md</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

import fs from 'fs';
import path from 'path';

const file = path.resolve('C:/Users/harit/Desktop/mastery-ai-/src/components/Engagement/MasteryBandSimulator.tsx');
let code = fs.readFileSync(file, 'utf8');

// Normalize line endings to LF first for reliable manipulation
const isCRLF = code.includes('\r\n');
code = code.replace(/\r\n/g, '\n');

// 1. Add state variables
code = code.replace(
  '  const [activeGesture, setActiveGesture] = useState<string | null>(null);\n  const [hapticPulsing, setHapticPulsing] = useState<boolean>(false);',
  '  const [activeGesture, setActiveGesture] = useState<string | null>(null);\n  const [hapticPulsing, setHapticPulsing] = useState<boolean>(false);\n  const [showConsentModal, setShowConsentModal] = useState<boolean>(false);\n  const [hasBluetoothConsent, setHasBluetoothConsent] = useState<boolean>(false);'
);

// 2. Update disconnect button to revoke consent
code = code.replace(
  '              onClick={onDisconnectRealBLE}\n              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs font-semibold border border-rose-900/40 transition-colors cursor-pointer"\n            >\n              Disconnect',
  '              onClick={() => { onDisconnectRealBLE(); setHasBluetoothConsent(false); }}\n              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg text-xs font-semibold border border-rose-900/40 transition-colors cursor-pointer"\n            >\n              Revoke Consent & Disconnect'
);

// 3. Update connect button to trigger modal if consent not granted
code = code.replace(
  '              onClick={onConnectRealBLE}\n              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/40 transition-colors cursor-pointer"\n            >\n              <BluetoothConnected className="w-3.5 h-3.5" />\n              <span>Pair Physical Band</span>',
  '              onClick={() => { if (!hasBluetoothConsent) { setShowConsentModal(true); } else { onConnectRealBLE(); } }}\n              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-950/40 transition-colors cursor-pointer"\n            >\n              <BluetoothConnected className="w-3.5 h-3.5" />\n              <span>Pair Physical Band</span>'
);

// 4. Modal JSX before closing </div>
const modalJsx = `
      {/* Explicit Web Bluetooth Privacy Consent Modal */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c1422] border border-[#1b2b42] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-blue-400 font-bold text-sm">
              <Bluetooth className="w-5 h-5 text-blue-400" />
              <span>Explicit Bluetooth Telemetry Consent</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              MasteryBand exchanges local tactile button presses and haptic vibration cues with your browser.
            </p>
            <div className="space-y-2 text-[11px] text-slate-400 bg-[#070c16] p-3 rounded-xl border border-[#16253a]">
              <div>&bull; <strong>Tactile signals only:</strong> Understand, Need Help, and Take Break signals.</div>
              <div>&bull; <strong>Zero Medical Biometrics:</strong> No ECG, emotion inference, or EEG telemetry is performed.</div>
              <div>&bull; <strong>100% In-Browser:</strong> Signals are processed locally without transmission to third parties.</div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer pt-2 border-t border-[#1a273b]">
              <input
                type="checkbox"
                checked={hasBluetoothConsent}
                onChange={e => setHasBluetoothConsent(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>I explicitly consent to pairing a Bluetooth peripheral for telemetry.</span>
            </label>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!hasBluetoothConsent}
                onClick={() => {
                  setShowConsentModal(false);
                  onConnectRealBLE();
                }}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
              >
                Proceed to Pair
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace('\n    </div>\n  );\n};', modalJsx + '\n    </div>\n  );\n};');

if (isCRLF) {
  code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync(file, code, 'utf8');
console.log('Bluetooth consent modal added successfully.');

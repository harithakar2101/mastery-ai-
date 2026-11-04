/**
 * Multilingual internationalization dictionary for Mastery.ai.
 * Supports English ('en'), Tamil ('ta'), and Hindi ('hi').
 * Technical terms and code identifiers are always preserved in English.
 */

export type UILanguage = 'en' | 'ta' | 'hi';

export const LANGUAGE_OPTIONS: Array<{ id: UILanguage; label: string; nativeName: string }> = [
  { id: 'en', label: 'English', nativeName: 'English' },
  { id: 'ta', label: 'Tamil', nativeName: 'தமிழ்' },
  { id: 'hi', label: 'Hindi', nativeName: 'हिन्दी' },
];

export const TRANSLATIONS: Record<UILanguage, Record<string, string>> = {
  en: {
    // Navigation
    nav_live_class: 'Live Class',
    nav_code_sandbox: 'Code Sandbox',
    nav_memory_tree: 'Memory Tree',
    nav_ai_video: '60s AI Video',
    nav_mock_test: 'AI Mock Test',
    nav_library_vault: 'Library Vault',
    nav_comparison_study: 'Empirical Study',
    nav_student_dashboard: 'ISLM Dashboard',
    nav_teacher_dashboard: 'Teacher Console',
    nav_pretest: 'Pretest',
    nav_security_audit: 'Security',
    nav_retain_cards: 'Retain Cards',
    nav_socratic_chat: 'Socratic Tutor',

    // Retain & Spaced Repetition
    retain_title: 'Retain: Spaced Repetition Review',
    retain_subtitle: 'SM-2 memory consolidation engine for weak concepts and delayed recall verification.',
    retain_due_today: 'Cards Due for Review',
    retain_overdue: 'Overdue Recall',
    retain_leitner_box: 'Leitner Box',
    retain_ease_factor: 'Ease Factor',
    retain_interval: 'Interval Days',
    retain_box_1: 'Box 1 (Daily)',
    retain_box_2: 'Box 2 (3 Days)',
    retain_box_3: 'Box 3 (7 Days)',
    retain_box_4: 'Box 4 (Mastered)',
    retain_recall_quality: 'Recall Rating',
    retain_forgot: '0 - Forgot (Reset)',
    retain_hard: '3 - Hard Recall',
    retain_good: '4 - Good Recall',
    retain_perfect: '5 - Instant Recall',
    retain_success_msg: 'Recall verified! Retention component updated in composite mastery.',
    retain_all_caught_up: 'All caught up! No spaced review cards are currently overdue.',

    // Common Buttons & Actions
    btn_submit: 'Submit',
    btn_next: 'Next',
    btn_run: 'Run Code',
    btn_test: 'Test Invariant',
    btn_save: 'Save',
    btn_cancel: 'Cancel',
    btn_close: 'Close',
    btn_refresh: 'Refresh',
    btn_export_csv: 'Export CSV',
    btn_export_json: 'Export JSON',
    btn_seed_demo: 'Seed Demo Cohort',
    btn_switch_role: 'Switch Role',

    // Status Badges
    status_mastered: 'Mastered',
    status_near_mastery: 'Near Mastery',
    status_needs_attention: 'Needs Attention',
    status_green: 'GREEN',
    status_yellow: 'YELLOW',
    status_red: 'RED',

    // Provenance
    badge_live_ai: 'LIVE AI',
    badge_fallback: 'FALLBACK',
    badge_real_sensor: 'REAL SENSOR',
    badge_simulated: 'SIMULATED',
    badge_study_data: 'STUDY DATA',
    badge_demo_data: 'DEMO DATA (synthetic)',
  },
  ta: {
    // Navigation
    nav_live_class: 'நேரலை வகுப்பு',
    nav_code_sandbox: 'Code Sandbox',
    nav_memory_tree: 'நினைவக வரைபடம்',
    nav_ai_video: '60 நொடி AI காணொளி',
    nav_mock_test: 'மாதிரித் தேர்வு',
    nav_library_vault: 'நூலக பெட்டகம்',
    nav_comparison_study: 'ஆய்வு முடிவுகள்',
    nav_student_dashboard: 'ISLM பலகை',
    nav_teacher_dashboard: 'ஆசிரியர் பலகை',
    nav_pretest: 'முன்தேர்வு',
    nav_security_audit: 'பாதுகாப்பு',
    nav_retain_cards: 'நினைவு அட்டைகள்',
    nav_socratic_chat: 'சாக்ரடீஸ் வழிகாட்டி',

    // Retain & Spaced Repetition
    retain_title: 'நினைவூட்டல்: இடைவெளி நினைவுகூர்தல்',
    retain_subtitle: 'கடினமான பாடக் கருத்துகளை SM-2 முறையில் மீண்டும் நினைவுகூர்ந்து தேர்ச்சி பெறும் அமைப்பு.',
    retain_due_today: 'இன்றைய மறுபார்வை அட்டைகள்',
    retain_overdue: 'தாமதமான நினைவுகூர்தல்',
    retain_leitner_box: 'லைட்னர் பெட்டி (Leitner Box)',
    retain_ease_factor: 'சுலப காரணி (Ease Factor)',
    retain_interval: 'இடைவெளி நாட்கள்',
    retain_box_1: 'பெட்டி 1 (தினசரி)',
    retain_box_2: 'பெட்டி 2 (3 நாட்கள்)',
    retain_box_3: 'பெட்டி 3 (7 நாட்கள்)',
    retain_box_4: 'பெட்டி 4 (தேர்ச்சி)',
    retain_recall_quality: 'நினைவுகூர்தல் தரம்',
    retain_forgot: '0 - மறந்துவிட்டது',
    retain_hard: '3 - சிரமத்துடன் நினைவுக்கு வந்தது',
    retain_good: '4 - நன்றாக நினைவில் உள்ளது',
    retain_perfect: '5 - துல்லியமாக நினைவில் உள்ளது',
    retain_success_msg: 'நினைவுகூர்தல் சரிபார்க்கப்பட்டது! ஒருங்கிணைந்த தேர்ச்சி நிலை உயர்ந்தது.',
    retain_all_caught_up: 'அனைத்து அட்டைகளும் நிறைவுற்றன! தற்போது மீளாய்வுக்கு அட்டைகள் இல்லை.',

    // Common Buttons & Actions
    btn_submit: 'சமர்ப்பி',
    btn_next: 'அடுத்து',
    btn_run: 'நிரலை இயக்கு (Run)',
    btn_test: 'விதியைச் சோதி',
    btn_save: 'சேமி',
    btn_cancel: 'ரத்து',
    btn_close: 'மூடு',
    btn_refresh: 'புதுப்பி',
    btn_export_csv: 'CSV பதிவிறக்கு',
    btn_export_json: 'JSON பதிவிறக்கு',
    btn_seed_demo: 'மாதிரித் தரவு நிரப்பு',
    btn_switch_role: 'பயனர் நிலையை மாற்று',

    // Status Badges
    status_mastered: 'முழுத் தேர்ச்சி',
    status_near_mastery: 'நெருங்கிய தேர்ச்சி',
    status_needs_attention: 'கவனம் தேவை',
    status_green: 'பச்சை (GREEN)',
    status_yellow: 'மஞ்சள் (YELLOW)',
    status_red: 'சிகப்பு (RED)',

    // Provenance
    badge_live_ai: 'LIVE AI',
    badge_fallback: 'FALLBACK',
    badge_real_sensor: 'REAL SENSOR',
    badge_simulated: 'SIMULATED',
    badge_study_data: 'STUDY DATA',
    badge_demo_data: 'DEMO DATA (synthetic)',
  },
  hi: {
    // Navigation
    nav_live_class: 'लाइव क्लास',
    nav_code_sandbox: 'Code Sandbox',
    nav_memory_tree: 'मेमोरी ट्री',
    nav_ai_video: '60s AI वीडियो',
    nav_mock_test: 'मॉक टेस्ट',
    nav_library_vault: 'लाइब्रेरी वॉल्ट',
    nav_comparison_study: 'तुलनात्मक अध्ययन',
    nav_student_dashboard: 'ISLM डैशबोर्ड',
    nav_teacher_dashboard: 'शिक्षक कंसोल',
    nav_pretest: 'पूर्व-परीक्षण',
    nav_security_audit: 'सुरक्षा जाँच',
    nav_retain_cards: 'स्मरण कार्ड (Retain)',
    nav_socratic_chat: 'सुकराती ट्यूटर',

    // Retain & Spaced Repetition
    retain_title: 'स्मरण: अंतरालीय पुनरावृत्ति (Spaced Repetition)',
    retain_subtitle: 'कमजोर अवधारणाओं के लिए SM-2 स्मृति सुदृढ़ीकरण और विलंबित स्मरण सत्यापन।',
    retain_due_today: 'समीक्षा के लिए देय कार्ड',
    retain_overdue: 'अतिदेय स्मरण',
    retain_leitner_box: 'लाइटनर बॉक्स (Leitner Box)',
    retain_ease_factor: 'सरलता गुणांक (Ease Factor)',
    retain_interval: 'अंतराल दिन',
    retain_box_1: 'बॉक्स 1 (दैनिक)',
    retain_box_2: 'बॉक्स 2 (3 दिन)',
    retain_box_3: 'बॉक्स 3 (7 दिन)',
    retain_box_4: 'बॉक्स 4 (निपुण)',
    retain_recall_quality: 'स्मरण गुणवत्ता',
    retain_forgot: '0 - भूल गए',
    retain_hard: '3 - कठिनाई से याद आया',
    retain_good: '4 - अच्छा स्मरण',
    retain_perfect: '5 - तुरंत स्मरण',
    retain_success_msg: 'स्मरण सत्यापित! समग्र निपुणता में प्रतिधारण घटक अद्यतन किया गया।',
    retain_all_caught_up: 'सभी समीक्षाएं पूर्ण! वर्तमान में कोई कार्ड अतिदेय नहीं है।',

    // Common Buttons & Actions
    btn_submit: 'जमा करें',
    btn_next: 'आगे बढ़ें',
    btn_run: 'कोड चलाएं (Run)',
    btn_test: 'नियम परीक्षण',
    btn_save: 'सहेजें',
    btn_cancel: 'रद्द करें',
    btn_close: 'बंद करें',
    btn_refresh: 'ताज़ा करें',
    btn_export_csv: 'CSV निर्यात',
    btn_export_json: 'JSON निर्यात',
    btn_seed_demo: 'डेमो डेटा जोड़ें',
    btn_switch_role: 'भूमिका बदलें',

    // Status Badges
    status_mastered: 'निपुण (Mastered)',
    status_near_mastery: 'निकट निपुण',
    status_needs_attention: 'ध्यान आवश्यक',
    status_green: 'हरा (GREEN)',
    status_yellow: 'पीला (YELLOW)',
    status_red: 'लाल (RED)',

    // Provenance
    badge_live_ai: 'LIVE AI',
    badge_fallback: 'FALLBACK',
    badge_real_sensor: 'REAL SENSOR',
    badge_simulated: 'SIMULATED',
    badge_study_data: 'STUDY DATA',
    badge_demo_data: 'DEMO DATA (synthetic)',
  },
};

export function t(key: string, lang: UILanguage = 'en'): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}

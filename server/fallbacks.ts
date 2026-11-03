export function getTutoringFallback(tutorReq: any) {
  const { workflow, student_input, code_snippet, execution_logs, islm_profile, current_topic, visualizer_mode } = tutorReq;
  const trimmedInput = (student_input || '').trim();
  const isGreeting = /^(hi|hello|hey|greetings|howdy|good\s+(morning|afternoon|evening)|yo|hola|start|sup|welcome)(\s+.*)?$/i.test(trimmedInput);
  const isDemandingAnswer = /give\s+(me\s+)?(the\s+)?(fixed\s+)?(code|solution|answer)|write\s+(the\s+)?(code|program|assignment)|solve\s+(it|this)|fix\s+my\s+code\s+directly/i.test(trimmedInput);

  const lang = tutorReq.language || 'en';

  if (isGreeting) {
    let tutorGreeting = "Hello! I am your CogniCSE Technical Tutor. How can I help you master Computer Science or Mechanical Engineering today?\n\nWe can explore core tracks like:\n• Mechanical Engineering (CAD) (2D Sketch DOF, Constraints, Hub/Bore Concentricity, Mass Evaluation, FOS >= 2.0)\n• Data Structures & Algorithms (Trees, Graphs, Dijkstra, Dynamic Programming)\n• Computer Systems & OS (Pointers, Memory Allocation, Caching, Concurrency)\n• Computer Networks (Sockets, OSI Layers, TCP Handshake, Ports)\n• Or debug your current code/model in the Polyglot Sandbox!";
    let socraticQ = 'Which engineering track or concept would you like to explore first?';

    if (lang === 'ta') {
      tutorGreeting = "வணக்கம்! நான் உங்கள் CogniCSE வழிகாட்டி. கணினி அறிவியல் அல்லது மெக்கானிக்கல் இன்ஜினியரிங் (CAD) பாடங்களில் எதைக் கற்க விரும்புகிறீர்கள்?\n\n• மெக்கானிக்கல் CAD (2D Sketch DOF, Constraints, FOS >= 2.0)\n• Data Structures & Algorithms (Trees, Graphs, Dijkstra)\n• Computer Systems & OS (Pointers, Memory Allocation, Caching)\n• Computer Networks (Sockets, OSI Layers, TCP Handshake)";
      socraticQ = 'எந்த பாடப்பிரிவை முதலில் தொடங்க விரும்புகிறீர்கள்?';
    } else if (lang === 'hi') {
      tutorGreeting = "नमस्ते! मैं आपका CogniCSE तकनीकी शिक्षक हूँ। आज आप कंप्यूटर साइंस या मैकेनिकल इंजीनियरिंग (CAD) में क्या सीखना चाहते हैं?\n\n• मैकेनिकल CAD (2D Sketch DOF, Constraints, FOS >= 2.0)\n• Data Structures & Algorithms (Trees, Graphs, Dijkstra)\n• Computer Systems & OS (Pointers, Memory Allocation, Caching)\n• Computer Networks (Sockets, OSI Layers, TCP Handshake)";
      socraticQ = 'आप पहले किस इंजीनियरिंग ट्रैक का अभ्यास करना चाहेंगे?';
    }

    return {
      workflow: workflow || 'CHATS',
      diagnosis: {
        issue_type: 'CONCEPTUAL_GAP',
        identified_gap: 'CSE Technical Orientation & Problem Identification',
        confidence_score: 0.99,
      },
      scaffolding_response: {
        current_tier: 1,
        refusal_reason: '',
        tutor_message: tutorGreeting,
        socratic_question: socraticQ,
      },
      visualizer_data: {
        mode: 'Text Response',
      },
      islm_updates: {
        updated_topic_mastery: { [current_topic || 'Core_Concept']: islm_profile?.overall_mastery || 0.75 },
        memory_tree_node_status: {
          node_id: (current_topic || 'topic_core').toLowerCase().replace(/[^a-z0-9]/g, '_'),
          node_name: current_topic || 'Core Concept',
          status: 'GREEN',
        },
        increment_error_count: false,
        next_scaffolding_tier: 1,
      },
      content_hooks: {
        trigger_ai_video: false,
        flag_for_mock_test: false,
      },
      research_telemetry: {
        scaffolding_fading_index: islm_profile?.scaffolding_tier_required ? +(0.15 * islm_profile.scaffolding_tier_required).toFixed(2) : 0.25,
        estimated_time_to_resolution_mins: 1,
        error_recurrence_drop: '0%',
      },
    };
  }

  const currentTier = Math.min(Math.max(islm_profile?.scaffolding_tier_required || 1, 1), 4);
  let issueType = 'CONCEPTUAL_GAP';
  let refusalReason = '';
  let tutorMessage = '';
  let socraticQuestion = '';
  let identifiedGap = 'Understanding system abstractions and runtime mechanics';
  let effectiveMode = visualizer_mode || 'Text Response';

  if (isDemandingAnswer) {
    refusalReason = 'Direct code generation withheld under Socratic Anti-Answer protocol.';
    if (lang === 'ta') {
      tutorMessage = "நீங்கள் சுயமாக தீர்க்க உதவும் வகையில் படிப்படியாக வழிகாட்டுகிறேன்! நேரடி விடையை வழங்குவதை விட, எங்கு தடுமாற்றம் உள்ளது என்பதை ஆராய்வோம்.";
      socraticQuestion = "உங்கள் வழிமுறை அல்லது நிரல் தொடங்கும் போது முதல் படி என்னவாக இருக்க வேண்டும்?";
    } else if (lang === 'hi') {
      tutorMessage = "मैं आपको कदम-दर-कदम सीखने में मदद करने के लिए यहाँ हूँ ताकि आप इसे स्वतंत्र रूप से हल कर सकें! सीधे उत्तर देने के बजाय, आइए देखें कि आप कहाँ अटके हैं।";
      socraticQuestion = "इनपुट प्राप्त होने पर आपके एल्गोरिदम या फ़ंक्शन को पहला कदम क्या उठाना चाहिए?";
    } else {
      tutorMessage = "I'm here to help you master this step-by-step so you can solve it independently! Let's break down where you're currently stuck rather than pasting the solution.";
      socraticQuestion = "What is the very first step your algorithm or function needs to perform when it receives input?";
    }
    issueType = 'MISCONCEPTION';
  } else {
    const q = (trimmedInput + ' ' + (code_snippet || '') + ' ' + (execution_logs || '')).toLowerCase();

    if (q.includes('dijkstra') || q.includes('shortest path') || q.includes('a*') || q.includes('navigation') || q.includes('graph')) {
      identifiedGap = 'Shortest Path Graph Traversal & Priority Queue Mechanics';
      tutorMessage = "Navigation applications model road intersections as graph vertices and streets as weighted edges. Dijkstra's algorithm uses a min-priority queue to always greedily expand the vertex with the lowest cumulative distance from the origin.\n\nA* extends this by adding an admissible heuristic h(n) (like Euclidean distance) to direct the exploration towards the target faster.";
      socraticQuestion = "Why must the heuristic in A* never overestimate the true remaining distance in order to guarantee an optimal path?";
      effectiveMode = visualizer_mode === 'Text Response' ? 'Text Response' : 'Flowchart';
    } else if (q.includes('caching') || q.includes('locality') || q.includes('matrix')) {
      identifiedGap = 'Hardware Cache Hierarchy & Spatial/Temporal Locality in Memory Loops';
      tutorMessage = "Modern CPUs fetch data into cache lines (typically 64 bytes) rather than individual single variables. When you iterate across a 2D matrix in row-major order (A[i][j] in C++), contiguous memory addresses are pre-loaded into the L1/L2 cache (Spatial Locality).\n\nIf you iterate column-major (A[j][i]), each step jumps across an entire row, causing constant cache line evictions and cycle stalls.";
      socraticQuestion = "How does changing loop nesting from `for j ... for i` to `for i ... for j` dramatically decrease CPU cache misses in C++?";
      effectiveMode = visualizer_mode === 'Text Response' ? 'Text Response' : 'Diagrams';
    } else if (q.includes('recursion') || q.includes('base case') || q.includes('call stack') || q.includes('stack overflow')) {
      identifiedGap = 'Missing or unreachable termination condition (base case) in recursive function';
      issueType = 'CONCEPTUAL_GAP';
      tutorMessage = "Every time a function invokes itself, the runtime pushes a new stack frame onto the thread call stack (saving local state and return addresses).\n\nWithout an explicit termination condition (base case) that halts recursion and returns a base value, frames stack up until thread stack memory is exhausted.";
      socraticQuestion = "What input condition or check at the very top of your function should cause it to return immediately without recursing further?";
      effectiveMode = visualizer_mode === 'Text Response' ? 'Text Response' : 'Timeline';
    } else if (q.includes('leak') || q.includes('pointer') || q.includes('malloc') || q.includes('free') || q.includes('garbage')) {
      identifiedGap = 'Manual Heap Allocation Lifecycle & Memory Reclamation';
      issueType = 'CONCEPTUAL_GAP';
      tutorMessage = "In languages with manual memory management like C/C++, `malloc()` reserves heap chunks from the OS. If the pointer referencing that address goes out of scope before `free()` is called, the memory remains allocated yet unreferenced — creating a memory leak.";
      socraticQuestion = "How do modern C++ RAII smart pointers like `std::unique_ptr` eliminate memory leaks automatically?";
      effectiveMode = visualizer_mode === 'Text Response' ? 'Text Response' : 'Simulator';
    } else if (q.includes('blue') || q.includes('dof') || q.includes('under-constrained') || q.includes('degree of freedom') || q.includes('degrees of freedom')) {
      identifiedGap = 'Under-constrained 2D sketch with free degrees of freedom (blue geometry)';
      issueType = 'cad_constraint_error';
      effectiveMode = 'Diagrams';
      if (currentTier === 1) {
        tutorMessage = "In parametric CAD modeling, entity color directly communicates constraint status. Notice how the solver highlights entities that still have free movement.";
        socraticQuestion = "In parametric sketchers like Fusion 360 or SolidWorks, what does a blue line signify regarding its remaining degrees of freedom?";
      } else if (currentTier === 2) {
        tutorMessage = "A 2D planar point has 2 translational degrees of freedom (X and Y). Fully constrained sketch entities have 0 degrees of freedom and turn black. Extruding blue sketches is a common trap (82% frequency) that causes downstream parametric drift.";
        socraticQuestion = "What geometric constraint or datum reference can anchor the floating endpoint to eliminate its translational freedom?";
      } else if (currentTier === 3) {
        tutorMessage = "Socratic Micro-Drill: If you click and drag any vertex of this blue sketch line in your viewport, you observe it stretching along the plane because its coordinates are not uniquely determined by solver equations.";
        socraticQuestion = "Does this entity require a positional constraint (like Coincident to origin) or a dimensional constraint (like length/distance)?";
      } else {
        tutorMessage = "Direct Line Guidance: Your sketch profile endpoint has free translational degrees of freedom because it lacks an anchor to the sketch origin or coordinate axes. Select the endpoint and the origin point to apply a Coincident constraint, then verify all sketch lines turn black.";
        socraticQuestion = "Apply the Coincident constraint to the sketch origin and verify whether all curves turn black.";
      }
    } else if (q.includes('tangent') || q.includes('concentric') || q.includes('symmetric') || q.includes('coincident') || q.includes('constraint')) {
      identifiedGap = 'Geometric relationship constraint definition (tangency, concentricity, or symmetry)';
      issueType = 'cad_constraint_error';
      effectiveMode = 'Flowchart';
      if (currentTier === 1) {
        tutorMessage = "Geometric constraints eliminate degrees of freedom through relational topology rather than numeric dimensions. Review the connection between your adjacent sketch entities.";
        socraticQuestion = "What geometric relationship ensures smooth slope continuity (G1 tangency) between a linear edge and a circular arc without forming a sharp cusp?";
      } else if (currentTier === 2) {
        tutorMessage = "Coincident locks points together; Concentric aligns centerlines of revolving features; Tangent forces shared slope vectors (G1 continuity); Symmetric balances geometry across a mirror plane.";
        socraticQuestion = "Why is applying a Tangent constraint preferable to manually dimensioning angles when creating an arc blend?";
      } else if (currentTier === 3) {
        tutorMessage = "Socratic Micro-Drill: Look closely at the vertex where your arc meets the linear wall. The solver detects a C0 positional junction with a slope discontinuity.";
        socraticQuestion = "Which constraint forces the first derivative of both curves to be equal at that junction?";
      } else {
        tutorMessage = "Direct Line Guidance: The arc and linear profile meet at a sharp corner because the Tangent constraint is omitted between the two sketch entities. Select both curves and apply Tangent, avoiding redundant angle dimensions.";
        socraticQuestion = "Apply the Tangent constraint to the arc-line junction to achieve G1 continuity.";
      }
    } else if (q.includes('fos') || q.includes('factor of safety') || q.includes('stress') || q.includes('yield') || q.includes('von mises')) {
      identifiedGap = 'Factor of Safety evaluation below structural threshold (target FOS >= 2.0)';
      issueType = 'cad_tolerance_mismatch';
      effectiveMode = 'Charts & Graphs';
      if (currentTier === 1) {
        tutorMessage = "In mechanical design, the Factor of Safety (FOS) represents your structural margin against material yielding under rated load.";
        socraticQuestion = "How is Factor of Safety calculated in terms of material yield strength and maximum equivalent stress?";
      } else if (currentTier === 2) {
        tutorMessage = "FOS = yield_strength / max_stress. Structural engineering standards mandate a target FOS >= 2.0 for ductile static equipment. Assuming FOS ~ 1.1 is acceptable is a severe misconception because it leaves zero margin for dynamic shock, fatigue, or tool marks.";
        socraticQuestion = "If finite element analysis reveals localized peak stress concentrated at a sharp 90-degree internal corner, what geometric feature can you add to lower that stress concentration?";
      } else if (currentTier === 3) {
        tutorMessage = "Socratic Micro-Drill: Peterson's Stress Concentration analysis shows sharp re-entrant corners create theoretical infinite stress notches (Kt -> inf).";
        socraticQuestion = "How does increasing the internal fillet radius redistribute load streamlines and raise the calculated FOS?";
      } else {
        tutorMessage = "Direct Line Guidance: Your component exhibits high localized Von Mises stress at the internal sharp shoulder, pulling FOS below 2.0. Adding an internal transition fillet radius (R >= 3mm) will smooth out the stress notch and bring the design above the FOS >= 2.0 threshold.";
        socraticQuestion = "Insert a transition fillet on the internal shoulder and re-evaluate the maximum stress tensor.";
      }
    } else if (q.includes('mass') || q.includes('density') || q.includes('volume') || q.includes('g/cm3') || q.includes('weight')) {
      identifiedGap = 'Confusing geometric volume with physical mass and metric density conversion';
      issueType = 'cad_tolerance_mismatch';
      effectiveMode = 'Simulator';
      if (currentTier === 1) {
        tutorMessage = "Consider the fundamental physical relationship between the space an object occupies and its gravitational mass.";
        socraticQuestion = "What physical property connects an object's geometric volume to its total mass?";
      } else if (currentTier === 2) {
        tutorMessage = "Mass equals density multiplied by volume (m = rho * V). Confusing volume with mass is a common trap. Two parts with identical 500 cm³ volumes will have vastly different masses if one is 1018 Steel (7.85 g/cm³) and the other is 6061 Aluminum (2.70 g/cm³). Also recall that 1 cm³ = 1000 mm³.";
        socraticQuestion = "If volume is measured in mm³, what conversion factor must be applied before multiplying by density in g/cm³?";
      } else if (currentTier === 3) {
        tutorMessage = "Socratic Micro-Drill: If a part has volume = 200,000 mm³ and density = 2.70 g/cm³, converting volume to cm³ yields 200 cm³.";
        socraticQuestion = "What is the resulting mass in kilograms (200 * 2.70 = 540 grams)?";
      } else {
        tutorMessage = "Direct Line Guidance: The mass evaluation failed because volume in cubic millimeters was directly multiplied by density in g/cm³ without dividing by 1,000, creating a 1000x calculation error. Convert mm³ to cm³ first, then multiply by the material density.";
        socraticQuestion = "Divide volume by 1000 cm³/mm³ before multiplying by density to obtain the correct mass.";
      }
    } else if (q.includes('hub') || q.includes('bore') || q.includes('runout') || q.includes('concentricity') || q.includes('coaxial')) {
      identifiedGap = 'Hub/bore coaxial datum alignment and concentricity runout tolerance';
      issueType = 'cad_tolerance_mismatch';
      effectiveMode = 'Diagrams';
      if (currentTier === 1) {
        tutorMessage = "In rotating machinery, alignment of shaft and housing centerlines is critical for dynamic balance.";
        socraticQuestion = "What assembly constraint or geometric datum alignment ensures two revolving cylindrical features share a common centerline?";
      } else if (currentTier === 2) {
        tutorMessage = "Coaxial and Concentric constraints align rotational axes (Datum A). Radial eccentricity causes centrifugal unbalance force (F = m * e * omega^2) that escalates with the square of rotational speed.";
        socraticQuestion = "Why does radial runout between a shaft and bore cause severe vibration at high RPM?";
      } else if (currentTier === 3) {
        tutorMessage = "Socratic Micro-Drill: Mating two cylindrical components using planar face contacts alone leaves the radial degrees of freedom unconstrained.";
        socraticQuestion = "Which constraint type explicitly locks the cylindrical axis of the shaft to the cylindrical axis of the bore?";
      } else {
        tutorMessage = "Direct Line Guidance: The shaft is exhibiting eccentric runout because it was assembled using planar edge contact rather than a coaxial cylindrical mate. Apply a Concentric/Coaxial mate between the outer shaft cylinder and the inner bore cylinder.";
        socraticQuestion = "Select both cylindrical faces and apply the Concentric constraint to align their datum axes.";
      }
    } else if (q.includes('tcp') || q.includes('handshake') || q.includes('osi') || q.includes('syn') || q.includes('ack')) {
      identifiedGap = 'Layer 4 Transport Handshake & Service Port Assignment';
      issueType = 'CONCEPTUAL_GAP';
      tutorMessage = "TCP establishes reliable connection state using the 3-Way Handshake: Client sends SYN -> Server responds with SYN-ACK -> Client confirms with ACK.\n\nService ports identify specific listener daemons: Port 80 for HTTP, 443 for HTTPS, 3306 for MySQL, and 5432 for PostgreSQL.";
      socraticQuestion = "If a client attempts to send database queries directly to HTTP port 80, why does the host daemon reject the connection with 'Connection refused'?";
      effectiveMode = visualizer_mode === 'Text Response' ? 'Text Response' : 'Flowchart';
    } else if (workflow === 'CAD_LAB_TUTORING' || (workflow && workflow.includes('CAD'))) {
      if (q.includes('dof') || q.includes('constraint') || q.includes('symmetry') || q.includes('tangent') || (execution_logs && execution_logs.includes('cad_constraint_error'))) {
        identifiedGap = 'Under-constrained sketch geometry with free Degrees of Freedom (cad_constraint_error)';
        issueType = 'cad_constraint_error';
        effectiveMode = 'Diagrams';
        if (currentTier === 1) {
          tutorMessage = "Metacognitive Hint: In 2D parametric sketching, look at the color of your sketch entities. Blue entities still have free degrees of freedom and lack full topological constraints.";
          socraticQuestion = "Which geometric relationships (such as Symmetry across the centerline or Tangency to the hub) are needed to eliminate the remaining free degrees of freedom?";
        } else if (currentTier === 2) {
          tutorMessage = "Conceptual Guidance: Every unconstrained point or curve introduces free translational or rotational movement. Extruding blue sketches is a hazardous trap (82% failure rate). A symmetric bracket must be balanced across the mid-plane, and the reinforcing web must maintain G1 slope continuity with the hub cylindrical wall.";
          socraticQuestion = "How do the Symmetry and Rib Tangency constraints collaborate to reduce the system degrees of freedom to exactly 0?";
        } else if (currentTier === 3) {
          tutorMessage = "Socratic Micro-Drill: Your bracket currently exhibits positive degrees of freedom. Review the sketch constraints panel and check whether the symmetry toggle and the tangent transition toggle are active.";
          socraticQuestion = "Toggle the missing constraints in your feature tree to lock all entity positions before advancing to dimensional validation.";
        } else {
          tutorMessage = "Direct Line Guidance: Your sketch is under-constrained because Symmetry and/or Rib Tangency are disabled. Activate both constraints so all sketch entities lock and render in black/emerald with 0 DOF.";
          socraticQuestion = "Enable the symmetry and tangency constraints to establish 0 DOF.";
        }
      } else if (q.includes('tolerance') || q.includes('volume') || q.includes('d1') || q.includes('depth') || (execution_logs && execution_logs.includes('cad_tolerance_mismatch'))) {
        identifiedGap = 'Base plate extrusion depth out of specification (cad_tolerance_mismatch)';
        issueType = 'cad_tolerance_mismatch';
        effectiveMode = 'Charts & Graphs';
        if (currentTier === 1) {
          tutorMessage = "Metacognitive Hint: While the sketch geometry is fully constrained, the computed solid volume does not match the engineering specification envelope.";
          socraticQuestion = "Which driving extrusion parameter in your feature tree directly governs the base plate thickness and component total volume?";
        } else if (currentTier === 2) {
          tutorMessage = "Conceptual Guidance: In parametric solid modeling, total volume equals base plate volume minus fastener hole volumes plus hub and rib volumes. Changing the primary base extrusion depth shifts total mass and volume linearly.";
          socraticQuestion = "Inspect your base extrusion depth parameter d1. How does altering the primary plate thickness adjust overall volumetric displacement toward the engineering specification envelope?";
        } else if (currentTier === 3) {
          tutorMessage = "Socratic Micro-Drill: Your current model volume has deviated from specification. Check the base extrusion parameter d1 in your parameter panel.";
          socraticQuestion = "Adjust the base extrusion depth d1 closer to its nominal design target until the volumetric tolerance requirement is satisfied.";
        } else {
          tutorMessage = "Direct Line Guidance: Your base plate extrusion depth d1 is currently offset from nominal. Set base extrusion depth d1 = 12.0 mm to satisfy the tolerance envelope and reach 139.1 cm³.";
          socraticQuestion = "Set parameter d1 to 12.0 mm and re-validate.";
        }
      } else {
        identifiedGap = 'Parametric CAD Model Validation';
        issueType = 'cad_constraint_error';
        tutorMessage = "Let's review the bearing support bracket specification. Ensure all topological geometric constraints are applied first (DOF = 0), followed by accurate dimensional driving parameters.";
        socraticQuestion = "Which constraint or parameter do you want to inspect first?";
      }
    } else if (workflow === 'CODE_SANDBOX_TUTORING' && (execution_logs || code_snippet)) {
      if (q.includes('port') || q.includes('pdo') || q.includes('connection refused') || q.includes('2002')) {
        identifiedGap = 'Incorrect database port specified in PDO connection string (using HTTP port 80 instead of MySQL port 3306)';
        issueType = 'PRACTICAL_EXECUTION_ERROR';
        if (currentTier === 1) {
          tutorMessage = "Notice how your script is attempting to reach the database server. Look closely at the connection parameters you supplied to the PDO constructor.";
          socraticQuestion = "In computer networking, port 80 is reserved for standard HTTP web traffic. What is the standard default port number where MySQL servers listen for client queries?";
        } else if (currentTier === 2) {
          tutorMessage = "Databases and web servers run as distinct daemon services on separate TCP ports. Connecting to the wrong port causes immediate protocol rejection.";
          socraticQuestion = "When configuring a connection string like 'mysql:host=localhost;port=XYZ', what numeric value should replace XYZ for MySQL?";
        } else {
          tutorMessage = "Direct Line Guidance: In your connection string on line 1, you specified `port=80`. Change `80` to the default MySQL port `3306` to allow the handshake.";
          socraticQuestion = "Update your code to use port 3306 and click 'Run & Verify' to test if the connection succeeds!";
        }
        effectiveMode = 'Flowchart';
      } else {
        identifiedGap = 'Logic discrepancy between algorithm design and runtime evaluation';
        tutorMessage = "Let's trace your program's execution step by step. Look at the inputs entering your logic and the exact condition being evaluated.";
        socraticQuestion = "What exact value does your variable hold right before the problematic line executes?";
      }
    } else {
      identifiedGap = 'Algorithmic Problem-Solving & Step-by-Step Breakdown';
      tutorMessage = `Let's analyze this concept from foundational principles: "${trimmedInput}". In software engineering, dividing complex behavior into discrete stages makes debugging much easier.`;
      socraticQuestion = "What is the expected output or state change you want to achieve at this step?";
    }
  }

  return {
    workflow: workflow || 'CHATS',
    diagnosis: {
      issue_type: issueType,
      identified_gap: identifiedGap,
      confidence_score: 0.96,
    },
    scaffolding_response: {
      current_tier: currentTier,
      refusal_reason: refusalReason,
      tutor_message: tutorMessage,
      socratic_question: socraticQuestion,
    },
    visualizer_data: {
      mode: effectiveMode,
      structure: {
        nodes: [
          { id: '1', label: 'Problem Formulation' },
          { id: '2', label: 'Concept Abstraction' },
          { id: '3', label: 'Runtime Evaluation' },
          { id: '4', label: 'Socratic Resolution' },
        ],
        edges: [
          { from: '1', to: '2' },
          { from: '2', to: '3' },
          { from: '3', to: '4' },
        ],
      },
    },
    islm_updates: {
      updated_topic_mastery: {
        [current_topic || 'Core_Concept']: islm_profile?.topic_mastery?.[current_topic || ''] ?? islm_profile?.overall_mastery ?? 0.5,
      },
      memory_tree_node_status: {
        node_id: (current_topic || 'topic_core').toLowerCase().replace(/[^a-z0-9]/g, '_'),
        node_name: current_topic || 'Core Concept',
        status: currentTier >= 3 ? 'RED' : 'YELLOW',
      },
      increment_error_count: issueType === 'PRACTICAL_EXECUTION_ERROR',
      next_scaffolding_tier: Math.min(currentTier + 1, 4),
    },
    content_hooks: {
      trigger_ai_video: false,
      flag_for_mock_test: false,
    },
    research_telemetry: {
      scaffolding_fading_index: +(0.15 + currentTier * 0.1).toFixed(2),
      estimated_time_to_resolution_mins: Math.max(1, 5 - currentTier),
      error_recurrence_drop: `${Math.round(18 + currentTier * 8)}%`,
    },
  };
}

export function getVideoFallback(topic?: string, misconception?: string) {
  return {
    title: `60s Micro-Mastery: ${topic || 'Database Ports & Network Sockets'}`,
    concept: topic || 'Network Sockets & Port Bindings',
    duration_secs: 60,
    key_takeaway: 'Ports identify distinct processes on a machine. Database services listen on dedicated ports (e.g., MySQL 3306), distinct from HTTP (80/443).',
    scenes: [
      {
        scene_num: 1,
        time_range: '00:00 - 00:15',
        title: 'The Analogy: The Server Apartment Complex',
        visual_description: 'An animated server high-rise building with distinct front doors: Door 80 (Web Traffic), Door 443 (Secure Web), Door 3306 (MySQL Vault), Door 5432 (PostgreSQL).',
        narration: 'Imagine a server as an office building with hundreds of dedicated doors. An IP address gets you to the street address, but the port number picks the exact room inside.',
        animation_type: 'network_packet',
        visual_elements: ['Server Tower', 'Door 80 [HTTP]', 'Door 3306 [MySQL]', 'Driver Packet'],
      },
      {
        scene_num: 2,
        time_range: '00:15 - 00:38',
        title: 'The Collision: Knocking on the Wrong Door',
        visual_description: 'PHP PDO driver arrives at Door 80 holding SQL credentials. Door 80 is an Apache/Nginx web worker speaking HTTP. It rejects the raw MySQL protocol with Connection Refused.',
        narration: 'When your script connects to port 80 with database queries, the web server has no idea what language you are speaking and slams the door shut.',
        animation_type: 'comparison',
        visual_elements: ['PHP PDO Client', 'HTTP Server Rejection', 'Error 2002 Badge'],
      },
      {
        scene_num: 3,
        time_range: '00:38 - 00:60',
        title: 'The Solution: Clean Port Handshake',
        visual_description: 'Connection string changes port to 3306. Packet enters MySQL vault, receives handshake ACK, and returns green authenticated state.',
        narration: 'Point your driver to port 3306, and MySQL validates your credentials instantly. One number difference, total connection success!',
        animation_type: 'code_diff',
        visual_elements: ['port=3306 Highlighted', 'Authenticated Badge', 'Query Ready'],
      },
    ],
  };
}

export function getMockTestFallback(track?: string) {
  const isMech =
    track === 'Mechanical Engineering (CAD)' ||
    (track && (track.toLowerCase().includes('mech') || track.toLowerCase().includes('cad')));

  if (isMech) {
    return {
      test_id: `MOCK_CAD_${Date.now()}`,
      title: 'Mechanical Engineering (CAD) Adaptive Assessment',
      time_limit_mins: 15,
      total_questions: 5,
      negative_marking_rate: 0.25,
      questions: [
        {
          id: 'q_cad_1',
          topic_id: 'cad_dof_2d',
          topic_name: 'Degrees of Freedom in a 2D Sketch',
          question: 'In Fusion 360 a sketch line is blue instead of black. What does this signify?',
          options: [
            'Under-constrained, still has free degrees of freedom',
            'The sketch entity is fully constrained and ready for production extrusion',
            'The entity is a construction reference line that does not define boundaries',
            'An over-constraint or geometric conflict error has occurred',
          ],
          correct_option_index: 0,
          explanation: 'In Fusion 360 and standard parametric CAD (SolidWorks, Inventor, NX), black curves indicate 0 remaining degrees of freedom (fully constrained). Blue curves signify under-constrained geometry that still has free translational or rotational DOF.',
          distractor_explanations: [
            'Correct: Blue lines indicate under-constrained geometry with free DOF.',
            'Incorrect: Black curves represent fully constrained geometry.',
            'Incorrect: Construction lines are formatted with dashed line fonts.',
            'Incorrect: Over-constrained curves are highlighted in red/orange with a solver error.',
          ],
        },
        {
          id: 'q_cad_2',
          topic_id: 'cad_geometric_constraints',
          topic_name: 'Geometric Constraints',
          question: 'Which geometric constraint must be applied between a linear edge and an arc to ensure smooth G1 slope continuity without forming a sharp cusp?',
          options: [
            'Tangent constraint',
            'Coincident constraint',
            'Concentric constraint',
            'Collinear constraint',
          ],
          correct_option_index: 0,
          explanation: 'A Tangent constraint equates the first derivative vectors of both curves at their junction point, providing G1 continuity and eliminating sharp stress risers.',
          distractor_explanations: [
            'Correct: Tangent enforces equal slope vectors at the junction.',
            'Incorrect: Coincident ensures C0 point contact but allows discontinuous sharp corners.',
            'Incorrect: Concentric aligns arc center points, not boundary curve continuity.',
            'Incorrect: Collinear applies strictly between straight line segments.',
          ],
        },
        {
          id: 'q_cad_3',
          topic_id: 'cad_driving_parameters',
          topic_name: 'Dimensions and Driving Parameters',
          question: 'Why is mixing mm and cm units considered a hazardous trap in CAD parametric modeling tables?',
          options: [
            'Entering a dimensionless scalar (e.g. 10) in a cm workspace evaluates to 100 mm instead of 10 mm, introducing a 10x scale error',
            'CAD kernels immediately corrupt the solid database when cm are entered',
            'CNC milling machines can only parse imperial inches and reject metric numbers',
            'Parameters with cm units cannot be mirrored across symmetry planes',
          ],
          correct_option_index: 0,
          explanation: 'ISO/ASME mechanical drafting standardizes on millimeters (mm). Entering dimensions without explicit unit tags into a centimeter-configured document inflates physical features by 10x.',
          distractor_explanations: [
            'Correct: Unit mismatches cause severe 10x or 1000x volumetric scaling bugs.',
            'Incorrect: Modern CAD kernels handle units via unit conversion tables without corruption.',
            'Incorrect: CNC G-code interprets G20 (inch) or G21 (mm) codes directly.',
            'Incorrect: Symmetry operations are geometric transforms independent of length units.',
          ],
        },
        {
          id: 'q_cad_4',
          topic_id: 'cad_material_mass_properties',
          topic_name: 'Material, Volume and Mass Properties',
          question: 'An extruded steel bracket has volume = 250,000 mm³. Given mild steel density = 7.85 g/cm³, what is its calculated mass?',
          options: [
            '1.96 kg (1,962.5 grams)',
            '1,962.5 kg',
            '250 grams',
            '0.25 kg',
          ],
          correct_option_index: 0,
          explanation: 'Convert mm³ to cm³: 250,000 mm³ / 1,000 = 250 cm³. Mass = 250 cm³ * 7.85 g/cm³ = 1,962.5 g = 1.9625 kg (~1.96 kg). Forgetting the 1,000 conversion factor causes a 1000x mass error.',
          distractor_explanations: [
            'Correct: 250 cm³ * 7.85 g/cm³ = 1,962.5 g = 1.96 kg.',
            'Incorrect: Direct multiplication without mm³ -> cm³ conversion results in 1000x excessive mass.',
            'Incorrect: 250 g confuses volume magnitude with physical mass.',
            'Incorrect: Fails to multiply by material density.',
          ],
        },
        {
          id: 'q_cad_5',
          topic_id: 'cad_stress_fos',
          topic_name: 'Static Stress and Factor of Safety (FOS)',
          question: 'A structural link made of 6061-T6 aluminum (yield strength = 276 MPa) exhibits peak Von Mises stress of 120 MPa in FEA. What is the Factor of Safety (FOS), and does it satisfy standard machinery criteria?',
          options: [
            'FOS = 2.30; satisfies criteria (target FOS >= 2.0)',
            'FOS = 0.43; fails criteria because stress exceeds yield',
            'FOS = 1.20; acceptable because FOS is greater than 1.0',
            'FOS = 3.50; over-designed by 500%',
          ],
          correct_option_index: 0,
          explanation: 'FOS = yield_strength / max_stress = 276 MPa / 120 MPa = 2.30. Because FOS >= 2.0, the component satisfies standard ductile static equipment design criteria.',
          distractor_explanations: [
            'Correct: FOS = 276 / 120 = 2.30 >= 2.0.',
            'Incorrect: Inverted calculation (120 / 276 = 0.43).',
            'Incorrect: FOS of 1.1-1.2 is dangerous for machinery due to lack of dynamic margin.',
            'Incorrect: Arithmetic calculation error.',
          ],
        },
      ],
    };
  }

  return {
    test_id: `MOCK_${Date.now()}`,
    title: `${track || 'CSE Core'} Comprehensive Adaptive Assessment`,
    time_limit_mins: 15,
    total_questions: 5,
    negative_marking_rate: 0.25,
    questions: [
      {
        id: 'q1',
        topic_id: 'pdo_mysql_port',
        topic_name: 'Database Sockets & Ports',
        question: 'A PHP script attempts to instantiate PDO with: `new PDO("mysql:host=localhost;port=80;dbname=store", $u, $p)`. Why does this throw SQLSTATE[HY000] [2002] Connection refused?',
        options: [
          'Port 80 is designated for HTTP; MySQL listens on 3306 by default.',
          'PHP cannot connect to MySQL over localhost without an SSL certificate.',
          'Port 80 is strictly blocked by the operating system kernel for all non-root programs.',
          'The dbname parameter must be specified before the port in the DSN.',
        ],
        correct_option_index: 0,
        explanation: 'Port 80 is the standardized port for unencrypted HTTP traffic. MySQL daemon processes listen on TCP port 3306. Connecting to 80 causes connection refusal because the web server does not negotiate MySQL handshake packets.',
        distractor_explanations: [
          'Correct answer!',
          'Incorrect: SSL certificates are optional for local MySQL connections.',
          'Incorrect: Non-root programs can connect as clients to port 80; they only cannot bind as listeners without privileges.',
          'Incorrect: DSN parameter ordering is arbitrary and does not impact port parsing.',
        ],
      },
      {
        id: 'q2',
        topic_id: 'recursion_base_case',
        topic_name: 'Recursion & Call Stack',
        question: 'What is the primary consequence of omitting a base case from a recursive function that decrements its integer parameter?',
        options: [
          'A compilation syntax error will prevent executable generation.',
          'Stack Overflow Error due to infinite allocation of activation records.',
          'The function will return undefined/null as soon as the integer reaches 0.',
          'The operating system will preemptively terminate the compiler.',
        ],
        correct_option_index: 1,
        explanation: 'Every recursive invocation pushes a new stack frame (containing return address, arguments, and local variables). Without a base case, recursion continues until the thread call stack memory limit is exceeded, triggering a StackOverflow exception.',
        distractor_explanations: [
          'Incorrect: Recursion is a runtime control-flow construct; compilers do not detect missing base cases as syntax errors.',
          'Correct answer!',
          'Incorrect: Without an explicit `if (n <= 0) return ...`, execution proceeds into negative numbers indefinitely.',
          'Incorrect: The error occurs at program runtime, not compile time.',
        ],
      },
      {
        id: 'q3',
        topic_id: 'http_statelessness',
        topic_name: 'Web Architecture & Protocols',
        question: 'Why is the HTTP protocol termed "stateless"?',
        options: [
          'Servers immediately power down memory chips after sending responses.',
          'Each request is executed independently without the server natively retaining context from prior requests.',
          'Clients cannot send query parameters or payloads in standard GET requests.',
          'IP packets are discarded whenever network congestion occurs.',
        ],
        correct_option_index: 1,
        explanation: 'HTTP is stateless by design: the server treats each request as entirely independent and does not preserve client context across transactions without application-layer mechanisms like Cookies, Session IDs, or JWT tokens.',
        distractor_explanations: [
          'Incorrect: Hardware memory is not powered down between HTTP transactions.',
          'Correct answer!',
          'Incorrect: GET requests regularly carry query strings and headers.',
          'Incorrect: Packet loss is a layer-3/4 network occurrence, not the definition of HTTP statelessness.',
        ],
      },
      {
        id: 'q4',
        topic_id: 'pointers_memory_leak',
        topic_name: 'Memory Management',
        question: 'In C/C++, dynamically allocating an integer array with `malloc()` or `new` inside a loop without calling `free()` or `delete[]` results in:',
        options: [
          'Segmentation fault upon program startup.',
          'Dangling pointer exception.',
          'Memory leak: heap memory remains reserved and unreachable after pointers go out of scope.',
          'Automatic garbage collection triggers after 1000 iterations.',
        ],
        correct_option_index: 2,
        explanation: 'C and C++ do not have automatic garbage collection. Dynamically allocated heap memory must be manually released. If the pointer variable leaves scope without calling `free()`, the allocated memory stays marked as occupied, leaking heap capacity.',
        distractor_explanations: [
          'Incorrect: Allocation succeeds initially; crash only occurs if system runs completely out of memory.',
          'Incorrect: Dangling pointers happen when pointing to already freed memory, not unfreed memory.',
          'Correct answer!',
          'Incorrect: Standard C/C++ runtimes have no built-in generational garbage collector.',
        ],
      },
      {
        id: 'q5',
        topic_id: 'osi_transport_layer',
        topic_name: 'Computer Networks',
        question: 'Which OSI layer is responsible for end-to-end communication, port addressing, flow control, and segmentation (e.g., TCP & UDP)?',
        options: [
          'Layer 2 - Data Link Layer',
          'Layer 3 - Network Layer',
          'Layer 4 - Transport Layer',
          'Layer 7 - Application Layer',
        ],
        correct_option_index: 2,
        explanation: 'Layer 4 (Transport Layer) manages end-to-end process-to-process communication, port assignment, TCP segment reassembly, flow control, and reliability.',
        distractor_explanations: [
          'Incorrect: Layer 2 handles MAC addressing and physical framing.',
          'Incorrect: Layer 3 handles logical IP addressing and inter-network routing.',
          'Correct answer!',
          'Incorrect: Layer 7 interfaces directly with end-user software protocols like HTTP, SMTP, and FTP.',
        ],
      },
    ],
  };
}

export function getLibraryVaultFallback(title?: string, track?: string) {
  const isMech =
    track === 'Mechanical Engineering (CAD)' ||
    (track && (track.toLowerCase().includes('mech') || track.toLowerCase().includes('cad')));

  if (isMech) {
    return {
      summary: `Comprehensive Mechanical Engineering & CAD technical reference covering ${title || 'Parametric Sketching, Geometric Constraints & Machine Design'}, detailing degrees of freedom, GD&T, and FEA factor of safety standards.`,
      extracted_concepts: [
        {
          concept_id: 'cad_dof_2d',
          name: '2D Sketch Degrees of Freedom & Unconstrained Geometry',
          difficulty: 'BEGINNER',
          prerequisites: ['Coordinate Systems', 'Planar Geometry'],
          frequent_misconception: 'Extruding an under-constrained (blue) sketch assuming it is finished (frequency 82%).',
        },
        {
          concept_id: 'cad_geometric_constraints',
          name: 'Geometric Relationships & G1 Slope Tangency',
          difficulty: 'INTERMEDIATE',
          prerequisites: ['cad_dof_2d'],
          frequent_misconception: 'Applying redundant dimensional callouts where geometric constraints already lock the sketch geometry.',
        },
        {
          concept_id: 'cad_stress_fos',
          name: 'Static Stress, Yield Criteria & Factor of Safety (FOS >= 2.0)',
          difficulty: 'ADVANCED',
          prerequisites: ['Material Mass Properties', 'Stress Tensors'],
          frequent_misconception: 'Assuming a low Factor of Safety (e.g. FOS ~ 1.1) is acceptable in static machinery.',
        },
      ],
      recommended_socratic_drills: [
        {
          drill_id: 'drill_cad_1',
          prompt: 'In Fusion 360 a sketch line is blue instead of black. What does this signify regarding its degrees of freedom?',
          concept_mapped: 'cad_dof_2d',
          socratic_tier: 1,
        },
        {
          drill_id: 'drill_cad_2',
          prompt: 'Why must the internal shoulder of a rotating stepped shaft have a fillet radius rather than a sharp 90-degree corner?',
          concept_mapped: 'cad_stress_fos',
          socratic_tier: 2,
        },
      ],
      suggested_video_topics: [
        'Degrees of Freedom: Why Blue Sketches Break CAD Assemblies',
        'Stress Risers & Fillets: Eliminating Infinite Notch Stress',
        'Factor of Safety (FOS): Designing for Real-World Fatigue',
      ],
    };
  }

  return {
    summary: `Comprehensive CSE reference covering ${title || 'Key Architectural Principles'}, detailing foundational mechanics, protocol specifications, and common failure modes in software engineering.`,
    extracted_concepts: [
      {
        concept_id: 'db_connection_pooling',
        name: 'Database Connection Lifecycle & Sockets',
        difficulty: 'INTERMEDIATE',
        prerequisites: ['TCP/IP Fundamentals', 'Client-Server Architecture'],
        frequent_misconception: 'Assuming connection parameters default to web ports instead of database daemon ports.',
      },
      {
        concept_id: 'recursion_call_stack',
        name: 'Stack Frame Allocation & Termination',
        difficulty: 'BEGINNER',
        prerequisites: ['Call Stack', 'Variable Scope'],
        frequent_misconception: 'Believing recursion continues until memory is naturally exhausted rather than hitting an explicit base case.',
      },
      {
        concept_id: 'http_statelessness',
        name: 'HTTP Protocol Statelessness & Session Tokens',
        difficulty: 'INTERMEDIATE',
        prerequisites: ['Request-Response Model'],
        frequent_misconception: 'Assuming the web server inherently remembers past requests without cookies or bearer tokens.',
      },
    ],
    recommended_socratic_drills: [
      {
        drill_id: 'drill_1',
        prompt: 'If a database runs on the same physical host as your script, why might `localhost` fail while `127.0.0.1` succeeds?',
        concept_mapped: 'db_connection_pooling',
        socratic_tier: 1,
      },
      {
        drill_id: 'drill_2',
        prompt: 'What happens to local variables created in recursive frame N when frame N+1 is pushed onto the stack?',
        concept_mapped: 'recursion_call_stack',
        socratic_tier: 2,
      },
    ],
    suggested_video_topics: [
      'The Anatomy of a Database Socket Connection',
      'Visualizing Stack Overflow in Under 60 Seconds',
      'Cookies vs Sessions: Surviving HTTP Statelessness',
    ],
  };
}

export function getVariantFallback(conceptId?: string, track?: string, language?: string) {
  const isMech =
    track === 'Mechanical Engineering (CAD)' ||
    (conceptId && conceptId.startsWith('cad_'));

  if (isMech) {
    return {
      id: `var_cad_${Date.now()}`,
      conceptId: conceptId || 'cad_driving_parameters',
      conceptName: 'Parametric Flanged Bearing Mount (Variant)',
      title: 'Transfer Problem: Flanged Bracket Volumetric Envelope',
      prompt: 'Construct a flanged bearing bracket variant with a new target envelope: adjust base extrusion depth d1 = 14.0 mm, lock midplane symmetry, and enforce tangent rib continuity to achieve 0 free DOF and exact target volume displacement.',
      description: 'Independent transfer exercise testing CAD parametric constraint locking and volumetric tolerance adjustment on an alternate component envelope with AI hints locked.',
      code: `// Independent CAD Transfer Task: Alternate Specification
const target_d1 = 14.0; // mm
const target_volume = 152.4; // cm³
const target_dof = 0;
`,
      language: 'javascript' as const,
      errorLog: 'Variant initial state: Extrusion depth and sketch constraints need independent configuration.',
      starterCode: 'd1 = 10; symmetry = false; tangent = false;',
    };
  }

  return {
    id: `var_cse_${Date.now()}`,
    conceptId: conceptId || 'dkm_node_1',
    conceptName: 'Two-Sum Array Hash Map (Variant)',
    title: 'Transfer Problem: Customer Order Pair Identifier',
    prompt: 'Implement `solution(orders, targetReward)`: Given an array of order totals and a target reward sum, return the 0-indexed positions of the two distinct orders that sum up to targetReward in O(n) time and O(n) space.',
    description: 'Independent transfer problem applying hash map complement lookup to an e-commerce reward matching scenario with different values and edge cases.',
    code: `function solution(orders, targetReward) {
  // Transfer Problem: Return indices [i, j] such that orders[i] + orders[j] === targetReward
  const seen = new Map();
  for (let i = 0; i < orders.length; i++) {
    const complement = targetReward - orders[i];
    if (seen.has(complement)) {
      return [seen.get(complement), i];
    }
    seen.set(orders[i], i);
  }
  return [];
}
`,
    language: 'javascript' as const,
    hiddenTests: [
      { input: [[15, 25, 40, 60], 65], expected: [1, 2], description: 'Find pair 25 + 40 = 65' },
      { input: [[100, 200, 50], 150], expected: [0, 2], description: 'Find pair 100 + 50 = 150' },
      { input: [[5, 5], 10], expected: [0, 1], description: 'Handle duplicate element values' },
      { input: [[1, 2, 3], 99], expected: [], description: 'Return empty array when no pair sums to target' },
    ],
  };
}

export function getLiveTranscriptFallback(transcript?: string, track?: string, topicId?: string) {
  const isMech = track === 'Mechanical Engineering (CAD)' || (topicId && topicId.startsWith('cad_'));

  if (isMech) {
    return {
      timeline: [
        {
          id: 'timeline_mech_1',
          timeOffset: '05:30',
          conceptId: 'cad_degrees_of_freedom',
          conceptName: '2D Sketch Degrees of Freedom',
          summary: 'Constraint resolution and dimensional locking of sketch profiles.',
          questions: [
            {
              id: 'q_dof_1',
              conceptId: 'cad_degrees_of_freedom',
              conceptName: '2D Sketch Degrees of Freedom',
              question: 'When creating a symmetrical mounting lug, why does adding a centerline symmetry constraint reduce remaining DOF from 2 to 1?',
              options: [
                'It binds symmetrical vertices to mirror across the axis, eliminating independent lateral translation',
                'It converts the sketch profile into a solid 3D extrusion directly',
                'It locks both horizontal and vertical position to the absolute origin',
                'It sets tangent continuity across all surrounding arcs'
              ],
              correctIndex: 0,
              explanation: 'Symmetry constraint mirrors positions across an axis, coupling 2 independent coordinate pairs into 1.',
              misconceptionMap: {
                1: 'Confusing 2D sketch constraint solver with 3D solid extrusion operations',
                2: 'Assuming symmetry fixes origin location rather than relative counterpart spacing',
                3: 'Confusing symmetry geometric constraint with tangential curvature continuity'
              }
            },
            {
              id: 'q_dof_2',
              conceptId: 'cad_degrees_of_freedom',
              conceptName: '2D Sketch Degrees of Freedom',
              question: 'What is the required state of sketch DOF before an extrusion feature is safe for production parametric updates?',
              options: [
                'Exactly 0 (Fully Constrained, indicated in green)',
                '1 or 2 DOF to allow dynamic stretching',
                'Negative DOF (Over-constrained)',
                'DOF is irrelevant once dimensions are typed'
              ],
              correctIndex: 0,
              explanation: 'Fully constrained sketches (0 DOF) prevent unintended geometry inversion when global parameters change.',
              misconceptionMap: {
                1: 'Believing under-constrained sketches provide healthy flexibility rather than modeling instability',
                2: 'Misunderstanding over-constrained red solver conflicts as robust locking',
                3: 'Treating dimension annotations as static without constraint graph validation'
              }
            }
          ]
        },
        {
          id: 'timeline_mech_2',
          timeOffset: '18:45',
          conceptId: 'cad_safety_factor_fea',
          conceptName: 'FEA Stress & Factor of Safety',
          summary: 'Von Mises stress evaluation against yield strength (FOS >= 2.0).',
          questions: [
            {
              id: 'q_fos_1',
              conceptId: 'cad_safety_factor_fea',
              conceptName: 'FEA Stress & Factor of Safety',
              question: 'If an Al 6061-T6 bracket (yield strength 276 MPa) experiences peak Von Mises stress of 118.5 MPa under 500 N, what is the Factor of Safety?',
              options: [
                '2.33 (Compliant with FOS >= 2.0 requirement)',
                '0.43 (Immediate failure under static load)',
                '1.00 (At the threshold of plastic deformation)',
                '3.50 (Calculated via tensile strength instead)'
              ],
              correctIndex: 0,
              explanation: 'FOS = Yield Strength / Peak Von Mises = 276 / 118.5 = 2.33.',
              misconceptionMap: {
                1: 'Inverted the FOS ratio (computed stress / yield instead of yield / stress)',
                2: 'Assumed static load implies neutral unity safety factor',
                3: 'Used ultimate tensile strength instead of yield limit for structural elasticity'
              }
            },
            {
              id: 'q_fos_2',
              conceptId: 'cad_safety_factor_fea',
              conceptName: 'FEA Stress & Factor of Safety',
              question: 'Under an overload of 2500 N, the bracket stress reaches 592.5 MPa. What physical event occurs?',
              options: [
                'Permanent plastic deformation and failure (FOS = 0.47 < 1.0)',
                'Elastic springback with zero permanent strain',
                'Linear thermal expansion without structural yielding',
                'Stress automatically redistributes safely to the hub'
              ],
              correctIndex: 0,
              explanation: 'Because Von Mises (592.5 MPa) exceeds yield (276 MPa), the material undergoes irreversible plastic deformation.',
              misconceptionMap: {
                1: 'Assuming metals remain strictly elastic regardless of applied force magnitude',
                2: 'Confusing mechanical shear stress with thermal expansion gradients',
                3: 'Believing FEA stress concentrations disperse without geometric redesign'
              }
            }
          ]
        }
      ]
    };
  }

  // Web Dev / Systems track
  return {
    timeline: [
      {
        id: 'timeline_web_1',
        timeOffset: '04:15',
        conceptId: 'web_apache_docroot',
        conceptName: 'Apache DocumentRoot & File Hierarchy',
        summary: 'Mapping URI paths to server document root vs local user desktop directories.',
        questions: [
          {
            id: 'q_docroot_1',
            conceptId: 'web_apache_docroot',
            conceptName: 'Apache DocumentRoot & File Hierarchy',
            question: 'When Apache is configured with DocumentRoot "C:/xampp/htdocs", why does a browser request to "http://localhost/index.html" fail with 404 if the file is saved at "C:/Users/Student/Desktop/index.html"?',
            options: [
              'Apache only looks inside DocumentRoot (C:/xampp/htdocs) and rejects access outside for security and path mapping',
              'Apache does not support HTML files saved with Windows line endings',
              'The browser requires port 8080 explicitly to read Desktop files',
              'Desktop files are automatically encrypted by the operating system kernel'
            ],
            correctIndex: 0,
            explanation: 'DocumentRoot defines the root of the server filesystem exposed over HTTP. Files outside are unreachable by the daemon.',
            misconceptionMap: {
              1: 'Confused line endings with file path accessibility',
              2: 'Assumed changing port number allows web server to escape its DocumentRoot boundary',
              3: 'Attributed path resolution errors to OS file encryption'
            }
          },
          {
            id: 'q_docroot_2',
            conceptId: 'web_apache_docroot',
            conceptName: 'Apache DocumentRoot & File Hierarchy',
            question: 'To serve a file at "http://localhost/courses/catalog.php", where must the PHP script physically reside in the virtual environment?',
            options: [
              'C:\\xampp\\htdocs\\courses\\catalog.php',
              'C:\\xampp\\courses\\catalog.php',
              'C:\\Users\\Student\\courses\\catalog.php',
              'C:\\Windows\\System32\\courses\\catalog.php'
            ],
            correctIndex: 0,
            explanation: 'The request path "/courses/catalog.php" is appended directly onto DocumentRoot: C:\\xampp\\htdocs + \\courses\\catalog.php.',
            misconceptionMap: {
              1: 'Omitted the mandatory "htdocs" subfolder, saving in parent xampp folder',
              2: 'Saved under personal user home directory instead of Apache DocumentRoot',
              3: 'Confused web server directory with Windows system executable folder'
            }
          }
        ]
      },
      {
        id: 'timeline_web_2',
        timeOffset: '16:40',
        conceptId: 'pdo_mysql_port',
        conceptName: 'PDO MySQL Connection & Port Architecture',
        summary: 'Database daemon ports (3306 vs 80) and DSN string configuration.',
        questions: [
          {
            id: 'q_port_1',
            conceptId: 'pdo_mysql_port',
            conceptName: 'PDO MySQL Connection & Port Architecture',
            question: 'A student writes `new PDO("mysql:host=localhost;port=80;dbname=courses", "root", "")` and gets "Connection Refused". What is the root cause?',
            options: [
              'Port 80 is the HTTP web server port, whereas MySQL daemon listens on port 3306 by default',
              'MySQL requires port 8080 when connecting via PDO',
              'The PDO constructor does not accept a port parameter in the DSN',
              'The password parameter cannot be an empty string in local development'
            ],
            correctIndex: 0,
            explanation: 'MySQL runs on TCP port 3306. Port 80 is reserved for Apache HTTP. Connecting a database client to an HTTP socket results in connection failure.',
            misconceptionMap: {
              1: 'Confused proxy port 8080 with database daemon socket port',
              2: 'Mistakenly believed PDO DSN syntax forbids the port parameter',
              3: 'Assumed credential formatting was rejected rather than socket refusal'
            }
          },
          {
            id: 'q_port_2',
            conceptId: 'pdo_mysql_port',
            conceptName: 'PDO MySQL Connection & Port Architecture',
            question: 'What is the correct PDO Data Source Name (DSN) to connect to a local MySQL database named "students" running on standard port?',
            options: [
              'mysql:host=localhost;port=3306;dbname=students;charset=utf8mb4',
              'http://localhost:3306/students',
              'sql://root@localhost:80/students',
              'pdo://mysql/localhost/students'
            ],
            correctIndex: 0,
            explanation: 'PDO DSN for MySQL starts with "mysql:host=...;port=...;dbname=...".',
            misconceptionMap: {
              1: 'Used HTTP URL scheme instead of database DSN string format',
              2: 'Confused database connection URI with web server port 80',
              3: 'Invented non-standard "pdo://" protocol prefix'
            }
          }
        ]
      },
      {
        id: 'timeline_web_3',
        timeOffset: '28:10',
        conceptId: 'sql_injection_defense',
        conceptName: 'Prepared Statements & SQL Injection Defense',
        summary: 'Parameterized query compilation vs string concatenation vulnerability.',
        questions: [
          {
            id: 'q_sql_1',
            conceptId: 'sql_injection_defense',
            conceptName: 'Prepared Statements & SQL Injection Defense',
            question: 'Why does `$stmt = $pdo->prepare("SELECT * FROM courses WHERE code = :code"); $stmt->execute([":code" => $input]);` prevent SQL injection?',
            options: [
              'The SQL statement is pre-compiled by the database engine, treating user input purely as literal data rather than executable tokens',
              'It automatically removes all single quotes and spaces from the input string',
              'It forces the query to execute inside an isolated sandbox thread',
              'PDO automatically encrypts the table before performing the select query'
            ],
            correctIndex: 0,
            explanation: 'Parameterized queries separate the query structure/AST from values. Values are never parsed as SQL code regardless of characters.',
            misconceptionMap: {
              1: 'Believing prepared statements rely on naive character stripping or regex escaping',
              2: 'Confusing query parameterization with OS thread sandboxing',
              3: 'Believing query security involves on-the-fly table encryption'
            }
          },
          {
            id: 'q_sql_2',
            conceptId: 'sql_injection_defense',
            conceptName: 'Prepared Statements & SQL Injection Defense',
            question: 'What vulnerability exists in `$sql = "SELECT * FROM students WHERE name = \'" . $_GET["name"] . "\'";`?',
            options: [
              'SQL Injection: An attacker can pass `\' OR 1=1 --` to alter query semantics and dump the entire table',
              'Cross-Site Scripting (XSS): The browser will execute injected JavaScript directly inside the database',
              'Buffer Overflow: The string concatenation crashes the Apache daemon memory stack',
              'No vulnerability: As long as the table has an index on name, it is secure'
            ],
            correctIndex: 0,
            explanation: 'Direct string concatenation allows user input to escape the string literal and inject malicious SQL syntax clauses.',
            misconceptionMap: {
              1: 'Confused backend SQL Injection with frontend browser Cross-Site Scripting (XSS)',
              2: 'Confused high-level interpreted query syntax with low-level C buffer overflow',
              3: 'Believed database indexes provide security protection against syntax manipulation'
            }
          }
        ]
      }
    ]
  };
}

export function getInterventionSuggestionsFallback(students: any[], dkmNodes?: any[]) {
  const atRiskStudents = students.filter(s => {
    const redCount = Object.values(s.topic_mastery || {}).filter((v: any) => Number(v) < 0.5).length;
    const isAlex = s.student_id === 'CSE_STU_9021' || (s.overall_mastery || 0) < 0.35;
    return redCount >= 3 || isAlex;
  });

  const targetStudents = atRiskStudents.length > 0 ? atRiskStudents : students.slice(0, 2);

  return [
    {
      id: `int_sug_${Date.now()}_1`,
      studentId: targetStudents[0]?.student_id || 'CSE_STU_9021',
      studentName: targetStudents[0]?.name || 'Alex Rivera',
      conceptId: 'web_apache_docroot',
      conceptName: 'Apache DocumentRoot & File Hierarchy',
      severity: 'high' as const,
      issueType: 'REPEATED_DIRECTORY_TRAP',
      suggestedAction: 'Assign targeted 10-minute micro-lab in Web Dev Practical Lab with proactive Tier 1 path visualization.',
      rationale: 'Student repeatedly saved project files into C:/Users/Student/Desktop rather than C:/xampp/htdocs, leading to repeated 404s and pL stall at 0.28.',
      tutorMessage: 'Let’s master web server file layout: When Apache receives a request for /index.html, it only looks inside C:/xampp/htdocs. Try creating your files directly in that directory.',
      socraticQuestion: 'If you want to view a page at http://localhost/lab/test.php, in which exact folder inside C:/xampp/htdocs must test.php be saved?',
      status: 'pending' as const,
      outcome: 'pending' as const,
      createdAt: new Date().toISOString()
    },
    {
      id: `int_sug_${Date.now()}_2`,
      studentId: targetStudents[0]?.student_id || 'CSE_STU_9021',
      studentName: targetStudents[0]?.name || 'Alex Rivera',
      conceptId: 'pdo_mysql_port',
      conceptName: 'PDO MySQL Connection & Port Architecture',
      severity: 'medium' as const,
      issueType: 'DAEMON_PORT_CONFUSION',
      suggestedAction: 'Deploy interactive socket diagram comparing HTTP Port 80 daemon vs MySQL Port 3306 daemon.',
      rationale: 'Telemetry indicates 3 consecutive connection failures using port 80 in MySQL DSN string.',
      tutorMessage: 'Remember that network services listen on dedicated TCP ports. Port 80 is for HTTP web traffic, while MySQL listens on port 3306.',
      socraticQuestion: 'What error code does the operating system return when you attempt to connect a database driver to a port where no database service is listening?',
      status: 'pending' as const,
      outcome: 'pending' as const,
      createdAt: new Date().toISOString()
    }
  ];
}


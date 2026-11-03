import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import confetti from 'canvas-confetti';
import {
  Box,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Maximize2,
  Minimize2,
  Cpu,
  Shield,
  Eye,
  Info,
  ChevronRight,
  Split,
  Scale,
  Activity,
  ArrowRight,
  BookOpen,
  Terminal,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Video,
  X,
  Flame,
  ArrowDown,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { useTutor } from '../../context/TutorContext';
import { recordPedagogicalEvent } from '../../context/tutorSync';
import { TutoringResponse } from '../../types';

interface MaterialDef {
  id: string;
  name: string;
  density: number; // g/cm³
  yieldStrength: number; // MPa
  color: string;
  roughness: number;
  metalness: number;
}

const MATERIALS: Record<string, MaterialDef> = {
  'al-6061': {
    id: 'al-6061',
    name: 'Al 6061-T6',
    density: 2.7,
    yieldStrength: 276,
    color: '#b0bcc8',
    roughness: 0.35,
    metalness: 0.85,
  },
  'aisi-1018': {
    id: 'aisi-1018',
    name: 'AISI 1018 Steel',
    density: 7.87,
    yieldStrength: 370,
    color: '#6e7987',
    roughness: 0.45,
    metalness: 0.9,
  },
  'ti-6al-4v': {
    id: 'ti-6al-4v',
    name: 'Ti-6Al-4V',
    density: 4.43,
    yieldStrength: 880,
    color: '#90989f',
    roughness: 0.3,
    metalness: 0.8,
  },
  abs: {
    id: 'abs',
    name: 'ABS Polymer',
    density: 1.04,
    yieldStrength: 45,
    color: '#d97736',
    roughness: 0.6,
    metalness: 0.1,
  },
};

type VisualStyle = 'shaded_edges' | 'shaded' | 'wireframe' | 'stress';

interface ConsoleEntry {
  id: string;
  command?: string;
  output: string;
  isError?: boolean;
  timestamp?: string;
}

interface MilestoneDef {
  id: number;
  slug: string;
  title: string;
  description: string;
  targetParams: {
    d1?: number;
    symmetry?: boolean;
    tangent?: boolean;
    fillet?: number;
  };
}

const MILESTONES: MilestoneDef[] = [
  {
    id: 1,
    slug: 'units',
    title: '1. Units & Drafting Standard',
    description: 'Verify ISO/ASME standard metric units (millimeters [mm], grams [g], density [g/cm³]).',
    targetParams: {},
  },
  {
    id: 2,
    slug: 'base rectangle',
    title: '2. Base Profile Rectangle',
    description: 'Establish 100 mm length × 60 mm width rectangular envelope centered at origin.',
    targetParams: { d1: 10 },
  },
  {
    id: 3,
    slug: 'dimensions + symmetry',
    title: '3. Dimensions & Symmetry',
    description: 'Enforce mid-plane symmetry constraint locking 2x Ø12 fastener holes at 70 mm pitch.',
    targetParams: { symmetry: true },
  },
  {
    id: 4,
    slug: 'extrude d1=12',
    title: '4. Extrude Base (d1 = 12 mm)',
    description: 'Extrude planar base profile to nominal thickness d1 = 12.0 mm (±0.1 mm tolerance).',
    targetParams: { d1: 12 },
  },
  {
    id: 5,
    slug: 'bearing hub',
    title: '5. Bearing Hub & Bore',
    description: 'Generate cylindrical hub OD 60 mm, ID 30 mm coaxial bore at 42 mm elevation.',
    targetParams: {},
  },
  {
    id: 6,
    slug: 'tangent rib',
    title: '6. Tangent Stiffener Rib',
    description: 'Constrain 12 mm web rib with G1 tangency to hub outer diameter (rib volume 6.2 cm³).',
    targetParams: { tangent: true },
  },
  {
    id: 7,
    slug: 'mounting holes',
    title: '7. Mounting Fastener Holes',
    description: 'Cut 2x Ø12 mm mounting clearance holes spaced at 70 mm center-to-center pitch.',
    targetParams: { symmetry: true },
  },
  {
    id: 8,
    slug: 'inspection 139.1 cm3 / 0 DOF',
    title: '8. Inspection (139.1 cm³ / 0 DOF)',
    description: 'Final quality gate: 0 free degrees of freedom, nominal volume 139.1 cm³, mass 375.6 g in Al 6061.',
    targetParams: { d1: 12, symmetry: true, tangent: true },
  },
];

export const CADLab: React.FC = () => {
  const {
    executeTutoring,
    recordObservation,
    activeTrack,
    setSelectedNode,
    dkmNodes,
    islm,
    userProfile,
  } = useTutor();

  // Primary Parametric States
  const [length] = useState<number>(100); // Fixed 100 mm
  const [width] = useState<number>(60); // Fixed 60 mm
  const [d1, setD1] = useState<number>(10); // Base extrusion depth, starts at 10, target 12 mm
  const [filletRadius, setFilletRadius] = useState<number>(3); // Fillet radius in mm
  const [materialKey, setMaterialKey] = useState<string>('al-6061');
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('shaded_edges');
  const [sectionCut, setSectionCut] = useState<boolean>(false);
  const [loadInN, setLoadInN] = useState<number>(500); // Load in Newtons (starts at 500 N)

  // Geometric Constraint Toggles
  const [symmetry, setSymmetry] = useState<boolean>(false);
  const [tangent, setTangent] = useState<boolean>(false);

  // Active View Tab: 3D Viewport, 2D Sketch Overlay, Dual View, or Console
  const [activeTab, setActiveTab] = useState<'3d' | 'sketch' | 'split'>('3d');

  // 4D Viewport Time Scrubber State (Stages 0 to 7)
  // 0: Datum/Axes, 1: Base Sketch, 2: Extrude d1, 3: Hub, 4: Rib, 5: Holes, 6: Fillet, 7: Load/Stress
  const [stage4D, setStage4D] = useState<number>(7);
  const [isPlaying4D, setIsPlaying4D] = useState<boolean>(false);

  // FEA Modal State
  const [isFeaModalOpen, setIsFeaModalOpen] = useState<boolean>(false);

  // Fusion Terminal Console State
  const [consoleInput, setConsoleInput] = useState<string>('');
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true);
  const [consoleHistory, setConsoleHistory] = useState<ConsoleEntry[]>([
    {
      id: 'init-1',
      output: 'Autodesk Fusion 360 / Parametric Solvers Console [v2.4.1]',
      timestamp: '00:00:00',
    },
    {
      id: 'init-2',
      output: 'Target Part: Bearing Support Bracket (100x60, d1 target 12mm, Vol 139.1 cm³). Type "help" for commands.',
      timestamp: '00:00:00',
    },
  ]);
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Tutorial Sync Player State
  const [activeMilestoneId, setActiveMilestoneId] = useState<number>(1);
  const [teacherVideoUrl, setTeacherVideoUrl] = useState<string>('');
  const [isVideoFieldOpen, setIsVideoFieldOpen] = useState<boolean>(false);

  // Validation State & Socratic Tutoring
  const [validationResult, setValidationResult] = useState<{
    status: 'idle' | 'error' | 'passed';
    errorType?: 'cad_constraint_error' | 'cad_tolerance_mismatch';
    message?: string;
    tier?: number;
    tutoring?: TutoringResponse | null;
  }>({ status: 'idle' });

  const [isValidating, setIsValidating] = useState<boolean>(false);

  // Degrees of Freedom: (symmetry ? 0 : 1) + (tangent ? 0 : 1)
  const dof = (symmetry ? 0 : 1) + (tangent ? 0 : 1);

  // Current Material
  const currentMaterial = MATERIALS[materialKey] || MATERIALS['al-6061'];

  // Exact Volume Formula from specification:
  // Volume (cm3) = L*W*d1/1000 - 2*π*6*6*d1/1000 + π*(30²-15²)*30/1000 + 6.2
  // At d1=12, volume must equal 139.1 cm3.
  const volume = useMemo(() => {
    const rawVolume =
      (length * width * d1) / 1000 -
      (2 * Math.PI * 6 * 6 * d1) / 1000 +
      (Math.PI * (30 * 30 - 15 * 15) * 30) / 1000 +
      6.2;
    return Number(rawVolume.toFixed(1));
  }, [length, width, d1]);

  // Mass (g) = volume * density. At d1=12 in Al 6061: 139.1 * 2.70 = 375.57 -> 375.6 g
  const mass = useMemo(() => {
    return Number((volume * currentMaterial.density).toFixed(1));
  }, [volume, currentMaterial]);

  // Closed-Form FEA Stress & Factor of Safety:
  // Specification:
  // max stress (MPa) = load_N * 0.237
  // FOS = yield / stress
  // PASS if FOS >= 2.0
  // Label: "Educational closed-form estimate, not a finite-element solver"
  // At 500 N in Al 6061 (yield 276): stress = 118.5 MPa, FOS = 2.33 (PASS)
  const { maxStress, fos, isFosSafe } = useMemo(() => {
    const stress = Number((loadInN * 0.237).toFixed(1));
    const calculatedFos = Number(
      (currentMaterial.yieldStrength / Math.max(stress, 0.001)).toFixed(2)
    );
    return {
      maxStress: stress,
      fos: calculatedFos,
      isFosSafe: calculatedFos >= 2.0,
    };
  }, [loadInN, currentMaterial]);

  // Auto-scroll console to bottom
  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleHistory, isConsoleOpen]);

  // 4D Viewport Playback Loop
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying4D) {
      timer = setInterval(() => {
        setStage4D(prev => {
          if (prev >= 7) {
            setIsPlaying4D(false);
            return 7;
          }
          return prev + 1;
        });
      }, 1300);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying4D]);

  // Three.js Mount Ref
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const bracketGroupRef = useRef<THREE.Group | null>(null);

  // Initialize and Update Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#070c16');

    // 2. Camera setup
    const initialWidth = container.clientWidth || 600;
    const initialHeight = container.clientHeight || 450;
    const camera = new THREE.PerspectiveCamera(45, initialWidth / initialHeight, 1, 1000);
    camera.position.set(130, 95, 140);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    rendererRef.current = renderer;
    renderer.setSize(initialWidth, initialHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;

    // Clear old canvases if any
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 20, 0);
    controls.maxPolarAngle = Math.PI / 2 + 0.1;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(80, 120, 100);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.6);
    fillLight.position.set(-80, 50, -80);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.4);
    rimLight.position.set(0, -50, -100);
    scene.add(rimLight);

    // 6. Ground Grid & Datum Axes
    const grid = new THREE.GridHelper(200, 20, 0x1e3a5f, 0x0f2038);
    grid.position.y = -0.1;
    scene.add(grid);

    const axes = new THREE.AxesHelper(30);
    axes.position.set(-70, 0.1, -50);
    scene.add(axes);

    // 7. Bracket Group
    const bracketGroup = new THREE.Group();
    bracketGroupRef.current = bracketGroup;
    scene.add(bracketGroup);

    // 8. Animation Loop
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 9. ResizeObserver for responsive canvas without warnings
    const resizeObserver = new ResizeObserver(entries => {
      if (!entries || !entries.length) return;
      const { width: newWidth, height: newHeight } = entries[0].contentRect;
      if (newWidth > 0 && newHeight > 0) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    });
    resizeObserver.observe(container);

    // Cleanup on unmount - Strict WebGL safety
    return () => {
      resizeObserver.disconnect();
      if (animFrameIdRef.current !== null) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      controls.dispose();

      // Dispose all scene geometries and materials
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else if (object.material) {
            object.material.dispose();
          }
        } else if (object instanceof THREE.LineSegments) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
            else object.material.dispose();
          }
        }
      });

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      bracketGroupRef.current = null;
    };
  }, []);

  // Update Bracket 3D Mesh when Parameters, Visual Styles or 4D Stage Change
  useEffect(() => {
    const bracketGroup = bracketGroupRef.current;
    if (!bracketGroup) return;

    // Clear previous geometries safely
    while (bracketGroup.children.length > 0) {
      const child = bracketGroup.children[0];
      bracketGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else if (child.material) child.material.dispose();
      } else if (child instanceof THREE.LineSegments) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
        else if (child.material) child.material.dispose();
      }
    }

    // Determine effective visual style (Stage 7 automatically displays stress contour if selected)
    const effectiveStyle = stage4D === 7 && visualStyle === 'stress' ? 'stress' : visualStyle;

    // Clipping planes for section-cut
    const clipPlanes = sectionCut
      ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)]
      : [];

    // Helper material generator
    const createMaterial = (baseColor: string | number, opacity = 1.0) => {
      if (effectiveStyle === 'wireframe') {
        return new THREE.MeshBasicMaterial({
          color: baseColor,
          wireframe: true,
          clippingPlanes: clipPlanes,
        });
      }

      if (effectiveStyle === 'stress') {
        return new THREE.MeshStandardMaterial({
          vertexColors: true,
          metalness: 0.2,
          roughness: 0.6,
          clippingPlanes: clipPlanes,
          side: THREE.DoubleSide,
        });
      }

      // Shaded & Shaded with Edges
      return new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: currentMaterial.roughness,
        metalness: currentMaterial.metalness,
        clippingPlanes: clipPlanes,
        side: THREE.DoubleSide,
        transparent: opacity < 1.0,
        opacity,
      });
    };

    const edgeLineMat = new THREE.LineBasicMaterial({
      color: 0x111e30,
      linewidth: 1.5,
    });

    const addMeshWithEdges = (geom: THREE.BufferGeometry, mat: THREE.Material) => {
      // If stress view or Stage 7 load view, compute vertex colors
      if (effectiveStyle === 'stress') {
        const count = geom.attributes.position.count;
        const colors = new Float32Array(count * 3);
        const pos = geom.attributes.position;
        for (let i = 0; i < count; i++) {
          const y = pos.getY(i);
          const x = pos.getX(i);
          // Normalized stress factor from 0 (blue) to 1 (red)
          const factor = Math.min(
            1.0,
            Math.max(0.0, (y / 45) * 0.7 + (Math.abs(x) < 20 ? 0.35 : 0.05))
          );
          let r = 0,
            g = 0,
            b = 0;
          if (factor < 0.25) {
            b = 1;
            g = factor * 4;
          } else if (factor < 0.5) {
            g = 1;
            b = 1 - (factor - 0.25) * 4;
          } else if (factor < 0.75) {
            g = 1;
            r = (factor - 0.5) * 4;
          } else {
            r = 1;
            g = 1 - (factor - 0.75) * 4;
          }
          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;
        }
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }

      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      bracketGroup.add(mesh);

      if (effectiveStyle === 'shaded_edges') {
        const edges = new THREE.EdgesGeometry(geom, 25);
        const line = new THREE.LineSegments(edges, edgeLineMat);
        bracketGroup.add(line);
      }
    };

    // 4D Stage 1: If stage4D is 1, render 2D sketch profile wireframe on datum XY plane
    if (stage4D === 1) {
      const sketchOutlineGeom = new THREE.BufferGeometry();
      const pts = [
        new THREE.Vector3(-50, 0, -30),
        new THREE.Vector3(50, 0, -30),
        new THREE.Vector3(50, 0, 30),
        new THREE.Vector3(-50, 0, 30),
        new THREE.Vector3(-50, 0, -30),
      ];
      sketchOutlineGeom.setFromPoints(pts);
      const sketchLine = new THREE.Line(
        sketchOutlineGeom,
        new THREE.LineBasicMaterial({ color: dof === 0 ? 0x10b981 : 0x3b82f6, linewidth: 2 })
      );
      bracketGroup.add(sketchLine);
      return;
    }

    if (stage4D < 2) {
      // Stage 0: datum only
      return;
    }

    // 1. Base Plate (100 x d1 x 60) - Visible if stage4D >= 2
    const baseGeom = new THREE.BoxGeometry(100, d1, 60);
    baseGeom.translate(0, d1 / 2, 0);
    const baseMat = createMaterial(currentMaterial.color);
    addMeshWithEdges(baseGeom, baseMat);

    // 2. Fastener Holes: 2 x Ø12 @ 70 mm pitch (X = -35, +35) - Visible if stage4D >= 5
    if (stage4D >= 5) {
      const holeRadius = 6;
      const holeHeight = d1 + 0.4;
      [-35, 35].forEach(xPos => {
        const holeGeom = new THREE.CylinderGeometry(holeRadius, holeRadius, holeHeight, 32, 1, true);
        holeGeom.translate(xPos, d1 / 2, 0);
        const holeMat = new THREE.MeshBasicMaterial({
          color: 0x09101c,
          side: THREE.BackSide,
          clippingPlanes: clipPlanes,
        });
        const holeMesh = new THREE.Mesh(holeGeom, holeMat);
        bracketGroup.add(holeMesh);

        // Hole rim accents
        const rimGeom = new THREE.RingGeometry(holeRadius - 0.2, holeRadius + 0.8, 32);
        rimGeom.rotateX(-Math.PI / 2);
        rimGeom.translate(xPos, d1 + 0.05, 0);
        const rimMat = new THREE.MeshBasicMaterial({ color: 0x22354e, side: THREE.DoubleSide });
        bracketGroup.add(new THREE.Mesh(rimGeom, rimMat));
      });
    }

    // 3. Hub (OD 60 -> R30, ID 30 -> R15, Height 42, Hub Width 30) - Visible if stage4D >= 3
    if (stage4D >= 3) {
      const hubOuterGeom = new THREE.CylinderGeometry(30, 30, 30, 48, 1, true);
      hubOuterGeom.rotateX(Math.PI / 2);
      hubOuterGeom.translate(0, 42, 0);
      addMeshWithEdges(hubOuterGeom, createMaterial(currentMaterial.color));

      // Hub Inner Bore (ID 30 -> R15)
      const hubBoreGeom = new THREE.CylinderGeometry(15, 15, 30.2, 48, 1, true);
      hubBoreGeom.rotateX(Math.PI / 2);
      hubBoreGeom.translate(0, 42, 0);
      const boreMat = new THREE.MeshBasicMaterial({
        color: 0x09101c,
        side: THREE.BackSide,
        clippingPlanes: clipPlanes,
      });
      bracketGroup.add(new THREE.Mesh(hubBoreGeom, boreMat));

      // Hub end annular face caps
      [-15, 15].forEach(zPos => {
        const capGeom = new THREE.RingGeometry(15, 30, 48);
        capGeom.translate(0, 0, zPos);
        const capMat = createMaterial(currentMaterial.color);
        const capMesh = new THREE.Mesh(capGeom, capMat);
        bracketGroup.add(capMesh);

        if (effectiveStyle === 'shaded_edges') {
          const capEdge = new THREE.EdgesGeometry(capGeom, 30);
          bracketGroup.add(new THREE.LineSegments(capEdge, edgeLineMat));
        }
      });
    }

    // 4. Tangent Rib (12 mm Web) - Visible if stage4D >= 4
    if (stage4D >= 4) {
      const ribShape = new THREE.Shape();
      ribShape.moveTo(-35, d1);
      ribShape.lineTo(35, d1);
      if (tangent) {
        ribShape.lineTo(24, 38);
        ribShape.quadraticCurveTo(0, 45, -24, 38);
      } else {
        ribShape.lineTo(28, 28);
        ribShape.lineTo(0, 35);
        ribShape.lineTo(-28, 28);
      }
      ribShape.lineTo(-35, d1);

      const ribExtrudeSettings = {
        depth: 12,
        bevelEnabled: filletRadius > 0.5 && stage4D >= 6,
        bevelSegments: 4,
        steps: 1,
        bevelSize: Math.min(filletRadius * 0.4, 2),
        bevelThickness: Math.min(filletRadius * 0.4, 2),
      };

      const ribGeom = new THREE.ExtrudeGeometry(ribShape, ribExtrudeSettings);
      ribGeom.translate(0, 0, -6);
      addMeshWithEdges(ribGeom, createMaterial(currentMaterial.color));
    }

    // 5. Fillets - Visible if stage4D >= 6
    if (stage4D >= 6 && filletRadius >= 1) {
      const filletGeom = new THREE.CylinderGeometry(filletRadius, filletRadius, 28, 16);
      filletGeom.rotateZ(Math.PI / 2);
      filletGeom.translate(0, d1 + filletRadius * 0.6, -14);
      const filletMat = createMaterial(currentMaterial.color, 0.9);
      bracketGroup.add(new THREE.Mesh(filletGeom, filletMat));

      const filletGeom2 = filletGeom.clone();
      filletGeom2.translate(0, 0, 28);
      bracketGroup.add(new THREE.Mesh(filletGeom2, filletMat));
    }

    // 6. Stage 7: Applied Load Vector Arrow pointing down onto bearing hub
    if (stage4D >= 7) {
      const arrowDir = new THREE.Vector3(0, -1, 0);
      const arrowOrigin = new THREE.Vector3(0, 80, 0);
      const arrowLength = 32;
      const arrowColor = isFosSafe ? 0x10b981 : 0xef4444;
      const arrow = new THREE.ArrowHelper(arrowDir, arrowOrigin, arrowLength, arrowColor, 10, 6);
      bracketGroup.add(arrow);
    }
  }, [
    d1,
    filletRadius,
    materialKey,
    visualStyle,
    sectionCut,
    symmetry,
    tangent,
    currentMaterial,
    stage4D,
    isFosSafe,
  ]);

  // Execute FEA Calculation & Observation Recording
  const runFeaAnalysis = (customLoad?: number) => {
    const targetLoad = customLoad !== undefined ? customLoad : loadInN;
    const computedStress = Number((targetLoad * 0.237).toFixed(1));
    const computedFos = Number(
      (currentMaterial.yieldStrength / Math.max(computedStress, 0.001)).toFixed(2)
    );
    const passed = computedFos >= 2.0;

    // Log Pedagogical Event
    recordPedagogicalEvent({
      studentId: userProfile?.id || 'default_student',
      type: 'CAD_FEA_SIMULATION',
      conceptId: 'cad_stress_fos',
      topicId: 'cad_stress_fos',
      payload: {
        loadInN: targetLoad,
        maxStressMpa: computedStress,
        fos: computedFos,
        isFosSafe: passed,
        yieldStrengthMpa: currentMaterial.yieldStrength,
        material: currentMaterial.name,
      },
      synthetic: false,
    });

    // Prompt requirement: fea.run below FOS 2.0 records an incorrect observation on concept (h)
    if (!passed) {
      recordObservation({
        conceptId: 'cad_stress_fos',
        isCorrect: false,
        isIndependent: false,
        errorCategory: 'cad_tolerance_mismatch',
        tierUsed: 3,
        source: 'sandbox',
      });
    } else {
      recordObservation({
        conceptId: 'cad_stress_fos',
        isCorrect: true,
        isIndependent: true,
        tierUsed: 1,
        source: 'sandbox',
      });
    }

    return {
      load: targetLoad,
      stress: computedStress,
      fos: computedFos,
      passed,
    };
  };

  // Fusion Terminal Command Interpreter
  const handleExecuteConsoleCommand = (cmdText: string) => {
    const raw = cmdText.trim();
    if (!raw) return;

    const timestamp = new Date().toLocaleTimeString();
    const tokens = raw.split(/\s+/);
    const verb = tokens[0].toLowerCase();
    const nowId = `cmd-${Date.now()}`;

    let reply = '';
    let isError = false;

    if (verb === 'help') {
      reply = `Autodesk Fusion Parametric CLI Reference:
• help                                - Display available commands
• param.set <name> <value>            - Update parameter (e.g. param.set d1 12mm, param.set fillet 4mm, param.set load 500N)
• sketch.constrain <symmetry|tangent> - Enforce geometric constraint (e.g. sketch.constrain symmetry, sketch.constrain tangent)
• material.set <name>                 - Assign material (al-6061, aisi-1018, ti-6al-4v, abs)
• view.set <style>                    - Set viewport render mode (shaded, shaded_edges, wireframe, stress)
• fea.run [--load 500N]               - Run closed-form structural stress & FOS evaluation
• inspect                             - Output active model dimensions, volume, mass, constraints, and DOF
• clear                               - Clear console terminal history`;
    } else if (verb === 'clear') {
      setConsoleHistory([]);
      setConsoleInput('');
      return;
    } else if (verb === 'param.set') {
      const paramName = (tokens[1] || '').toLowerCase();
      const rawVal = tokens[2] || '';

      if (!paramName) {
        reply = 'Error: Missing parameter name. Usage: param.set <d1|fillet|load> <value>';
        isError = true;
      } else if (!rawVal) {
        reply = `Error: Missing value for parameter '${paramName}'. Example: param.set d1 12mm`;
        isError = true;
      } else {
        const numVal = parseFloat(rawVal.replace(/[^\d.-]/g, ''));
        if (isNaN(numVal)) {
          reply = `Error: Invalid numerical value '${rawVal}'. Example: param.set d1 12mm`;
          isError = true;
        } else if (paramName === 'd1') {
          setD1(numVal);
          // Recalculate preview volume
          const prevVol = (
            (length * width * numVal) / 1000 -
            (2 * Math.PI * 6 * 6 * numVal) / 1000 +
            (Math.PI * (30 * 30 - 15 * 15) * 30) / 1000 +
            6.2
          ).toFixed(1);
          reply = `[OK] Parameter 'd1' set to ${numVal} mm. Computed solid volume: ${prevVol} cm³.`;
        } else if (paramName === 'fillet' || paramName === 'r') {
          setFilletRadius(numVal);
          reply = `[OK] Parameter 'fillet' set to ${numVal} mm (G1 shoulder transition).`;
        } else if (paramName === 'load' || paramName === 'load_n' || paramName === 'force') {
          setLoadInN(Math.round(numVal));
          reply = `[OK] Parameter 'load' set to ${Math.round(numVal)} N.`;
        } else {
          reply = `Error: Unknown parameter '${paramName}'. Supported parameters: d1, fillet, load`;
          isError = true;
        }
      }
    } else if (verb === 'sketch.constrain') {
      const constraint = (tokens[1] || '').toLowerCase();
      const flag = (tokens[2] || '').toLowerCase();

      if (constraint === 'symmetry') {
        const nextState = flag === 'off' || flag === 'false' ? false : true;
        setSymmetry(nextState);
        reply = `[OK] Constraint 'symmetry' set to ${nextState ? 'LOCKED (mid-plane alignment active)' : 'FREE'}. Free DOF: ${
          (nextState ? 0 : 1) + (tangent ? 0 : 1)
        }.`;
      } else if (constraint === 'tangent') {
        const nextState = flag === 'off' || flag === 'false' ? false : true;
        setTangent(nextState);
        reply = `[OK] Constraint 'tangent' set to ${nextState ? 'LOCKED (G1 slope continuity on hub OD)' : 'FREE (cusp discontinuity)'}. Free DOF: ${
          (symmetry ? 0 : 1) + (nextState ? 0 : 1)
        }.`;
      } else {
        reply = `Error: Unknown constraint '${constraint}'. Supported constraints: symmetry, tangent. Example: sketch.constrain symmetry`;
        isError = true;
      }
    } else if (verb === 'material.set') {
      const targetMat = (tokens[1] || '').toLowerCase();
      let matchedKey = '';

      if (targetMat.includes('6061') || targetMat.includes('al')) matchedKey = 'al-6061';
      else if (targetMat.includes('1018') || targetMat.includes('steel') || targetMat.includes('aisi'))
        matchedKey = 'aisi-1018';
      else if (targetMat.includes('ti') || targetMat.includes('titanium')) matchedKey = 'ti-6al-4v';
      else if (targetMat.includes('abs') || targetMat.includes('polymer')) matchedKey = 'abs';

      if (matchedKey && MATERIALS[matchedKey]) {
        setMaterialKey(matchedKey);
        const m = MATERIALS[matchedKey];
        reply = `[OK] Material assigned to ${m.name} (Density: ${m.density} g/cm³, Yield: ${m.yieldStrength} MPa).`;
      } else {
        reply = `Error: Unknown material '${targetMat}'. Supported materials: al-6061, aisi-1018, ti-6al-4v, abs`;
        isError = true;
      }
    } else if (verb === 'view.set') {
      const targetStyle = (tokens[1] || '').toLowerCase();
      let matchedStyle: VisualStyle | null = null;

      if (targetStyle.includes('wire')) matchedStyle = 'wireframe';
      else if (targetStyle.includes('stress') || targetStyle.includes('fea')) matchedStyle = 'stress';
      else if (targetStyle.includes('edge') || targetStyle === 'shaded_edges')
        matchedStyle = 'shaded_edges';
      else if (targetStyle.includes('shaded')) matchedStyle = 'shaded';

      if (matchedStyle) {
        setVisualStyle(matchedStyle);
        reply = `[OK] Viewport visual style set to '${matchedStyle}'.`;
      } else {
        reply = `Error: Unknown view style '${targetStyle}'. Available: shaded, shaded_edges, wireframe, stress`;
        isError = true;
      }
    } else if (verb === 'fea.run') {
      let targetLoad = loadInN;
      const loadFlagIdx = tokens.findIndex(t => t.startsWith('--load') || t === '-l');
      if (loadFlagIdx !== -1) {
        let loadStr = '';
        if (tokens[loadFlagIdx].includes('=')) {
          loadStr = tokens[loadFlagIdx].split('=')[1];
        } else if (tokens[loadFlagIdx + 1]) {
          loadStr = tokens[loadFlagIdx + 1];
        }
        const parsed = parseFloat(loadStr.replace(/[^\d.-]/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          targetLoad = Math.round(parsed);
          setLoadInN(targetLoad);
        }
      }

      const res = runFeaAnalysis(targetLoad);
      setIsFeaModalOpen(true);
      reply = `[FEA Structural Analysis Result]
Model: Bearing Support Bracket | Material: ${currentMaterial.name} (Yield: ${currentMaterial.yieldStrength} MPa)
• Applied Radial Load: ${res.load} N
• Max Equivalent Stress: ${res.stress} MPa (closed-form σ = load × 0.237)
• Factor of Safety (FOS): ${res.fos} (FOS = yield / stress)
• Status: ${res.passed ? 'PASS (FOS ≥ 2.0 Satisfied)' : 'FAIL (FOS < 2.0 Below Engineering Threshold)'}
[Notice: Educational closed-form estimate, not a finite-element solver]`;
    } else if (verb === 'inspect') {
      reply = `--- Solid Model Inspection ---
• Envelope: ${length} mm × ${width} mm × d1 = ${d1.toFixed(1)} mm
• Hub Geometry: Outer Ø60 mm, Inner Ø30 mm, Height 42 mm, Width 30 mm
• Fillet Radius: ${filletRadius.toFixed(1)} mm
• Material: ${currentMaterial.name} (Density: ${currentMaterial.density} g/cm³, Yield: ${currentMaterial.yieldStrength} MPa)
• Solid Volume: ${volume} cm³ ${volume === 139.1 ? '(PASS - Exact Nominal Envelope 139.1)' : `(Deviates by ${Math.abs(volume - 139.1).toFixed(1)} cm³)`}
• Part Mass: ${mass} g
• Constraints: Symmetry = [${symmetry ? 'LOCKED' : 'FREE'}], Tangency = [${tangent ? 'LOCKED' : 'FREE'}]
• Degrees of Freedom (DOF): ${dof} ${dof === 0 ? '(0 DOF: Fully Constrained)' : `(${dof} Free DOF: Under-constrained)`}`;
    } else {
      reply = `Error: Unknown command '${tokens[0]}'. Type 'help' for available commands.`;
      isError = true;
    }

    // Append to History
    setConsoleHistory(prev => [
      ...prev,
      {
        id: nowId,
        command: raw,
        output: reply,
        isError,
        timestamp,
      },
    ]);

    // Record Event
    recordPedagogicalEvent({
      studentId: userProfile?.id || 'default_student',
      type: 'CAD_CONSOLE_COMMAND',
      conceptId: 'cad_driving_parameters',
      topicId: 'cad_lab',
      payload: {
        command: raw,
        verb,
        isError,
      },
      synthetic: false,
    });

    setConsoleInput('');
  };

  // Milestone Click Handler
  const handleSelectMilestone = (m: MilestoneDef) => {
    setActiveMilestoneId(m.id);
    if (m.targetParams.d1 !== undefined) setD1(m.targetParams.d1);
    if (m.targetParams.symmetry !== undefined) setSymmetry(m.targetParams.symmetry);
    if (m.targetParams.tangent !== undefined) setTangent(m.targetParams.tangent);
    if (m.targetParams.fillet !== undefined) setFilletRadius(m.targetParams.fillet);

    // Auto sync 4D Stage to milestone
    const stageMap: Record<number, number> = {
      1: 0,
      2: 1,
      3: 2,
      4: 2,
      5: 3,
      6: 4,
      7: 5,
      8: 7,
    };
    if (stageMap[m.id] !== undefined) {
      setStage4D(stageMap[m.id]);
    }
  };

  // Validation Handler
  const handleValidateModel = async () => {
    setIsValidating(true);
    setValidationResult({ status: 'idle' });

    try {
      // Rule 1: Check Degrees of Freedom first (Strict order)
      if (dof > 0) {
        recordObservation({
          conceptId: 'cad_dof_2d',
          isCorrect: false,
          isIndependent: false,
          errorCategory: 'cad_constraint_error',
          tierUsed: 2,
          source: 'sandbox',
        });

        const response = await executeTutoring(
          `Validation error: Under-constrained 2D sketch detected with free Degrees of Freedom (DOF = ${dof}). Symmetry: ${symmetry ? 'Constrained' : 'Free'}, Tangency: ${tangent ? 'G1 Tangent' : 'Cusp Free'}. Entities are rendering in blue.`,
          `// Bearing Support Bracket Constraints\nDOF = ${dof};\nSymmetryConstraint = ${symmetry};\nTangentConstraint = ${tangent};\nStatus = "UNDER_CONSTRAINED";`,
          `cad_constraint_error: ${dof} degrees of freedom remaining. Sketch profile entities are floating with free translational vectors.`,
          'CAD_LAB_TUTORING'
        );

        setValidationResult({
          status: 'error',
          errorType: 'cad_constraint_error',
          tier: 2,
          message:
            'Constraint Violation: The sketch contains free degrees of freedom (DOF > 0). Blue sketch entities remain unanchored.',
          tutoring: response,
        });
        return;
      }

      // Rule 2: Check Driving Parameter Tolerance (|d1 - 12| <= 0.1)
      if (Math.abs(d1 - 12) > 0.1) {
        recordObservation({
          conceptId: 'cad_driving_parameters',
          isCorrect: false,
          isIndependent: false,
          errorCategory: 'cad_tolerance_mismatch',
          tierUsed: 3,
          source: 'sandbox',
        });

        const response = await executeTutoring(
          `Validation error: Base extrusion depth d1 is ${d1} mm (volume = ${volume} cm3, mass = ${mass} g). Target dimensional envelope requires exact nominal depth.`,
          `// Driving Parameter Inspection\nconst d1 = ${d1}; // Current depth\nconst volume = ${volume}; // cm3\nconst mass = ${mass}; // g\nconst toleranceDelta = ${Math.abs(d1 - 12).toFixed(2)};`,
          `cad_tolerance_mismatch: Computed volume ${volume} cm³ deviates from the design envelope specification. Extrusion depth tolerance exceeds ±0.1 mm limit.`,
          'CAD_LAB_TUTORING'
        );

        setValidationResult({
          status: 'error',
          errorType: 'cad_tolerance_mismatch',
          tier: 3,
          message: `Tolerance Mismatch: Solid volume reads ${volume} cm³ (d1 = ${d1} mm). The primary extrusion depth exceeds allowable tolerance.`,
          tutoring: response,
        });
        return;
      }

      // Rule 3: Model Passes with full rubric!
      recordObservation({
        conceptId: 'cad_extrude_operations',
        isCorrect: true,
        isIndependent: true,
        tierUsed: 1,
        source: 'sandbox',
      });

      confetti({
        particleCount: 110,
        spread: 70,
        origin: { y: 0.6 },
      });

      setValidationResult({
        status: 'passed',
        message:
          'Specification Verified: All geometric constraints and dimensional parameters pass engineering criteria!',
      });
    } catch (err) {
      console.error('Validation execution error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleResetToInitial = () => {
    setD1(10);
    setSymmetry(false);
    setTangent(false);
    setFilletRadius(3);
    setLoadInN(500);
    setSectionCut(false);
    setStage4D(7);
    setValidationResult({ status: 'idle' });
  };

  return (
    <div className="space-y-6">
      {/* CAD Lab Header Bar */}
      <div className="bg-[#0b1322] border border-[#1b2b44] rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-blue-950 text-blue-400 border border-blue-800">
                Exercise #CAD-204
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                Bearing Support Bracket
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold border transition-colors ${
                  dof === 0
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/80'
                    : 'bg-blue-950/80 text-blue-400 border-blue-700/80'
                }`}
              >
                {dof === 0 ? '✓ 0 DOF (Fully Constrained)' : `⚠ ${dof} Free DOF (Under-constrained)`}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                ISLM Scaffolding: <strong className="text-indigo-300">Tier {islm.scaffolding_tier_required || 1}</strong>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Parametric 3D CAD Virtual Laboratory</span>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-normal">
                Fusion 360 / SolidWorks Solver
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Design and dimension a standardized mechanical bearing support bracket. Enforce sketch topology (symmetry
              and rib tangency), calibrate the base extrusion parameter <span className="font-mono text-blue-300">d1</span> to
              reach nominal volume <span className="font-mono text-emerald-400 font-bold">139.1 cm³</span>, and audit structural safety.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setIsFeaModalOpen(true)}
              className="px-3 py-1.5 bg-[#121f35] hover:bg-[#1a2d4d] text-cyan-300 border border-cyan-800/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Flame className="w-3.5 h-3.5 text-cyan-400" />
              <span>FEA Structural Analysis</span>
            </button>
            <button
              onClick={handleResetToInitial}
              className="px-3 py-1.5 bg-[#121c2d] hover:bg-[#1a273e] text-slate-300 border border-[#23354f] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Bracket</span>
            </button>
            <button
              onClick={handleValidateModel}
              disabled={isValidating}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                isValidating
                  ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
              }`}
            >
              {isValidating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Solving Constraints...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Validate Parametric Model</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Tutorial Sync Player (8 Milestones Stepper + Optional Teacher Video URL) */}
      <div className="bg-[#080e18] border border-[#1a2a40] rounded-2xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              Tutorial Sync Player (8 Core Milestones)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsVideoFieldOpen(!isVideoFieldOpen)}
              className="text-[11px] text-slate-400 hover:text-blue-300 font-mono flex items-center gap-1 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{isVideoFieldOpen ? 'Hide Video Settings' : 'Teacher Video URL'}</span>
            </button>
          </div>
        </div>

        {/* Optional Teacher Video Input Field */}
        {isVideoFieldOpen && (
          <div className="bg-[#0d1624] border border-[#1e304b] rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-300 font-semibold">
                Teacher Video URL (Optional Embed — YouTube, Vimeo, or Direct MP4):
              </span>
              {teacherVideoUrl && (
                <button
                  onClick={() => setTeacherVideoUrl('')}
                  className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                >
                  Clear Video
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="e.g. https://www.youtube.com/embed/dQw4w9WgXcQ or direct video stream"
              value={teacherVideoUrl}
              onChange={e => setTeacherVideoUrl(e.target.value)}
              className="w-full bg-[#080d16] border border-[#23354f] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* If video URL exists, render embed player */}
        {teacherVideoUrl && (
          <div className="w-full aspect-video max-h-[300px] bg-black rounded-xl overflow-hidden border border-[#1e304b]">
            {teacherVideoUrl.includes('youtube') || teacherVideoUrl.includes('vimeo') ? (
              <iframe
                src={teacherVideoUrl}
                title="Tutorial Video Stream"
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={teacherVideoUrl}
                controls
                className="w-full h-full object-contain"
              />
            )}
          </div>
        )}

        {/* 8 Milestones Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
          {MILESTONES.map(m => {
            const isSelected = activeMilestoneId === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectMilestone(m)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-950/80 border-blue-500 shadow-md ring-1 ring-blue-500/50'
                    : 'bg-[#0d1624] border-[#18263a] hover:border-slate-500 text-slate-300'
                }`}
              >
                <div className="text-[11px] font-bold truncate text-white">{m.title}</div>
                <div className="text-[9px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                  {m.description}
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px] font-mono">
                  <span className={isSelected ? 'text-blue-300 font-bold' : 'text-slate-500'}>
                    Apply Step
                  </span>
                  {isSelected && <span className="text-emerald-400">●</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main CAD Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 3D Viewport, 4D Time Scrubber, 2D Sketch Plane & Console (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#080e18] border border-[#1a2a40] rounded-2xl overflow-hidden flex flex-col shadow-xl">
            {/* Viewport Control Bar */}
            <div className="bg-[#0c1524] border-b border-[#18263a] px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
              {/* Tab Selector */}
              <div className="flex items-center bg-[#070b12] p-0.5 rounded-lg border border-[#1b293d]">
                <button
                  onClick={() => setActiveTab('3d')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activeTab === '3d'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  3D Viewport
                </button>
                <button
                  onClick={() => setActiveTab('sketch')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activeTab === 'sketch'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  2D Sketch Plane
                </button>
                <button
                  onClick={() => setActiveTab('split')}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activeTab === 'split'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Dual View
                </button>
              </div>

              {/* Viewport Render Styles & Section Cut */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={visualStyle}
                  onChange={e => setVisualStyle(e.target.value as VisualStyle)}
                  className="bg-[#121c2e] text-slate-300 border border-[#22354e] rounded-lg px-2.5 py-1 text-[11px] font-mono outline-none cursor-pointer"
                >
                  <option value="shaded_edges">Shaded + Edges</option>
                  <option value="shaded">Smooth Shaded</option>
                  <option value="wireframe">Wireframe</option>
                  <option value="stress">FEA Stress Contour</option>
                </select>

                <button
                  onClick={() => setSectionCut(!sectionCut)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                    sectionCut
                      ? 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                      : 'bg-[#121c2e] text-slate-400 border-[#22354e] hover:text-slate-200'
                  }`}
                  title="Toggle section-cut clipping plane along central bore"
                >
                  <Split className="w-3 h-3" />
                  <span>Section Cut</span>
                </button>
              </div>
            </div>

            {/* Viewport Content Area */}
            <div className="relative min-h-[420px] h-[480px] bg-[#070c16]">
              {/* 3D WebGL Canvas */}
              <div
                ref={mountRef}
                className={`w-full h-full ${activeTab === 'sketch' ? 'hidden' : 'block'}`}
              />

              {/* 2D Sketch Plane SVG Canvas */}
              {(activeTab === 'sketch' || activeTab === 'split') && (
                <div
                  className={`bg-[#070e1b] flex flex-col justify-between p-4 ${
                    activeTab === 'split'
                      ? 'absolute bottom-3 right-3 w-80 h-64 border border-[#253d5e] rounded-xl shadow-2xl z-20 backdrop-blur-md bg-[#070e1b]/95'
                      : 'w-full h-full'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-400" />
                      <span>Sketch1: Datum XY Profile</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                        dof === 0
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : 'bg-blue-950 text-blue-400 border-blue-800'
                      }`}
                    >
                      {dof === 0 ? 'Black: Fully Constrained (0 DOF)' : 'Blue: Under-constrained'}
                    </span>
                  </div>

                  {/* Parametric SVG Sketch Renderer */}
                  <div className="flex-1 flex items-center justify-center p-2 select-none overflow-hidden">
                    <svg viewBox="-60 -45 120 90" className="w-full h-full max-h-[340px]">
                      <defs>
                        <pattern id="cadGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#102035" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect x="-60" y="-45" width="120" height="90" fill="url(#cadGrid)" />

                      {/* Coordinate Axes */}
                      <line x1="-58" y1="0" x2="58" y2="0" stroke="#1e3a5f" strokeWidth="0.7" strokeDasharray="2,2" />
                      <line x1="0" y1="-43" x2="0" y2="43" stroke="#1e3a5f" strokeWidth="0.7" strokeDasharray="2,2" />

                      {/* Base Rectangle: 100 mm x 60 mm (X: -50..+50, Y: -30..+30) */}
                      <rect
                        x="-50"
                        y="-30"
                        width="100"
                        height="60"
                        fill="none"
                        stroke={dof === 0 ? '#10b981' : '#3b82f6'}
                        strokeWidth={dof === 0 ? '1.5' : '2'}
                        rx="1"
                      />

                      {/* 2 x Ø12 Holes @ 70 mm pitch (X = -35, +35) */}
                      <circle
                        cx="-35"
                        cy="0"
                        r="6"
                        fill="#070c14"
                        stroke={symmetry ? '#10b981' : '#3b82f6'}
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="35"
                        cy="0"
                        r="6"
                        fill="#070c14"
                        stroke={symmetry ? '#10b981' : '#3b82f6'}
                        strokeWidth="1.5"
                      />

                      {/* Hub Outline Center Projection (R=30, ID R=15) */}
                      <circle cx="0" cy="0" r="30" fill="none" stroke="#223a5e" strokeWidth="1" strokeDasharray="3,3" />
                      <circle cx="0" cy="0" r="15" fill="none" stroke="#223a5e" strokeWidth="0.8" strokeDasharray="2,2" />

                      {/* Rib Tangent Geometry */}
                      <path
                        d={
                          tangent
                            ? 'M -25 -25 Q 0 -30 25 -25 L 25 25 Q 0 30 -25 25 Z'
                            : 'M -25 -20 L 0 -15 L 25 -20 L 25 20 L 0 15 L -25 20 Z'
                        }
                        fill="none"
                        stroke={tangent ? '#10b981' : '#3b82f6'}
                        strokeWidth="1.4"
                      />

                      <circle cx="0" cy="0" r="1.5" fill="#ef4444" />
                      <text x="2" y="-2" fill="#94a3b8" fontSize="3.5" fontFamily="monospace">
                        (0,0)
                      </text>
                      <text x="-48" y="-33" fill="#64748b" fontSize="3" fontFamily="monospace">
                        L: 100 mm
                      </text>
                      <text x="52" y="0" fill="#64748b" fontSize="3" fontFamily="monospace">
                        W: 60
                      </text>
                      <text x="-38" y="11" fill="#64748b" fontSize="3" fontFamily="monospace">
                        2x Ø12 @ 70 pitch
                      </text>
                    </svg>
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between border-t border-[#192b42] pt-2">
                    <span>
                      Solver Entity Color:{' '}
                      <strong className={dof === 0 ? 'text-emerald-400' : 'text-blue-400'}>
                        {dof === 0 ? 'Black/Emerald (0 Free DOF)' : 'Blue (Positive Free DOF)'}
                      </strong>
                    </span>
                    <span>Pitch: 70 mm</span>
                  </div>
                </div>
              )}

              {/* Viewport Live HUD Overlay */}
              <div className="absolute top-3 left-3 bg-[#08101e]/90 border border-[#1a2d47] rounded-xl p-3 backdrop-blur-md text-[11px] font-mono space-y-1.5 pointer-events-none shadow-lg">
                <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold">Live Solid Properties</div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Total Volume:</span>
                  <span className={`font-bold ${volume === 139.1 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {volume.toFixed(1)} cm³
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Total Mass:</span>
                  <span className="font-bold text-white">{mass.toFixed(1)} g</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">Material:</span>
                  <span className="text-blue-300 font-semibold">{currentMaterial.name}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-[#16273e] pt-1">
                  <span className="text-slate-400">Static FOS:</span>
                  <span className={`font-bold ${isFosSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fos} {isFosSafe ? '(Safe ≥ 2.0)' : '(Unsafe < 2.0)'}
                  </span>
                </div>
              </div>

              {/* Viewport Orbit Helper */}
              <div className="absolute bottom-3 left-3 bg-[#0a1220]/80 border border-[#1c2d46] px-2.5 py-1 rounded-lg text-[10px] font-mono text-slate-400 pointer-events-none">
                Left Drag: Rotate • Right Drag: Pan • Scroll: Zoom
              </div>
            </div>

            {/* 4D Viewport Feature Build Order Time Scrubber */}
            <div className="bg-[#0b1424] border-t border-[#18273d] p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlaying4D(!isPlaying4D)}
                    className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer"
                    title={isPlaying4D ? 'Pause 4D Build Animation' : 'Play 4D Build Animation'}
                  >
                    {isPlaying4D ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setStage4D(prev => Math.max(0, prev - 1))}
                    disabled={stage4D <= 0}
                    className="p-1 bg-[#121c2d] hover:bg-[#1a2940] disabled:opacity-40 text-slate-300 rounded cursor-pointer"
                  >
                    <SkipBack className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setStage4D(prev => Math.min(7, prev + 1))}
                    disabled={stage4D >= 7}
                    className="p-1 bg-[#121c2d] hover:bg-[#1a2940] disabled:opacity-40 text-slate-300 rounded cursor-pointer"
                  >
                    <SkipForward className="w-3 h-3" />
                  </button>
                  <span className="font-bold text-slate-200">
                    4D Viewport Build Order:
                  </span>
                </div>

                <div className="text-[11px]">
                  <span className="text-blue-400 font-bold">
                    {stage4D === 0 && 'Stage 0/7: Datum & Origin Axes'}
                    {stage4D === 1 && 'Stage 1/7: 2D Base Profile Sketch (100×60 mm)'}
                    {stage4D === 2 && `Stage 2/7: Base Solid Extrusion (d1 = ${d1} mm)`}
                    {stage4D === 3 && 'Stage 3/7: Bearing Hub OD 60 / ID 30 @ H42 mm'}
                    {stage4D === 4 && 'Stage 4/7: Tangent Stiffener Rib (12 mm Web)'}
                    {stage4D === 5 && 'Stage 5/7: Fastener Holes (2x Ø12 @ 70 pitch)'}
                    {stage4D === 6 && `Stage 6/7: Fillet & Rounds (R = ${filletRadius} mm)`}
                    {stage4D === 7 && `Stage 7/7: Rated Load Application (${loadInN} N) & Stress Contour`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="7"
                  step="1"
                  value={stage4D}
                  onChange={e => setStage4D(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-400 shrink-0 font-bold">
                  {stage4D}/7
                </span>
              </div>
            </div>
          </div>

          {/* Fusion Console (Terminal Panel) */}
          <div className="bg-[#070c14] border border-[#192b42] rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-[#0b1320] border-b border-[#18263a] px-4 py-2 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-slate-200">Fusion Console</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                  Active
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExecuteConsoleCommand('help')}
                  className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  help
                </button>
                <button
                  onClick={() => setConsoleHistory([])}
                  className="text-[10px] text-slate-400 hover:text-rose-300 cursor-pointer"
                >
                  clear
                </button>
                <button
                  onClick={() => setIsConsoleOpen(!isConsoleOpen)}
                  className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {isConsoleOpen ? 'Collapse' : 'Expand'}
                </button>
              </div>
            </div>

            {isConsoleOpen && (
              <div className="p-3 font-mono text-[11px] space-y-2">
                {/* Console Log History */}
                <div className="h-44 overflow-y-auto space-y-1.5 pr-1 select-text scrollbar-thin">
                  {consoleHistory.map(entry => (
                    <div key={entry.id} className="leading-relaxed">
                      {entry.command && (
                        <div className="text-blue-400 font-bold flex items-center gap-1">
                          <span className="text-slate-500">&gt;</span>
                          <span>{entry.command}</span>
                        </div>
                      )}
                      <div
                        className={`whitespace-pre-wrap pl-2 ${
                          entry.isError ? 'text-rose-400' : 'text-slate-300'
                        }`}
                      >
                        {entry.output}
                      </div>
                    </div>
                  ))}
                  <div ref={consoleBottomRef} />
                </div>

                {/* Console Command Input */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleExecuteConsoleCommand(consoleInput);
                  }}
                  className="flex items-center gap-2 border-t border-[#162539] pt-2"
                >
                  <span className="text-emerald-400 font-bold">fusion&gt;</span>
                  <input
                    type="text"
                    placeholder="e.g. param.set d1 12mm | sketch.constrain symmetry | fea.run --load 500N"
                    value={consoleInput}
                    onChange={e => setConsoleInput(e.target.value)}
                    className="flex-1 bg-transparent text-white font-mono text-xs outline-none placeholder-slate-600"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold cursor-pointer"
                  >
                    Run
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Validation Result / Socratic Dialogue Box */}
          {validationResult.status !== 'idle' && (
            <div
              className={`border rounded-2xl p-5 shadow-xl transition-all ${
                validationResult.status === 'passed'
                  ? 'bg-emerald-950/20 border-emerald-800/80 text-emerald-200'
                  : 'bg-[#12111d] border-amber-800/70 text-slate-200'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {validationResult.status === 'passed' ? (
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-extrabold text-sm text-white">
                      {validationResult.status === 'passed'
                        ? 'Mechanical CAD Validation: PASSED (100% Rubric Score)'
                        : `Socratic Diagnostic: ${validationResult.errorType}`}
                    </h3>
                    {validationResult.tier && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                        Scaffolding Tier {validationResult.tier} Guidance
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {validationResult.message}
                  </p>

                  {/* Passed Rubric Breakdown */}
                  {validationResult.status === 'passed' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-2 border-t border-emerald-900/40">
                      <div className="bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl">
                        <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Geometric Accuracy</div>
                        <div className="text-base font-black text-white mt-0.5">100%</div>
                        <div className="text-[10px] text-slate-400">Volume 139.1 cm³ • Mass 375.6 g (Al 6061)</div>
                      </div>
                      <div className="bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl">
                        <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Parametric Efficiency</div>
                        <div className="text-base font-black text-white mt-0.5">100%</div>
                        <div className="text-[10px] text-slate-400">0 DOF • G1 Tangent continuity locked</div>
                      </div>
                      <div className="bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-xl">
                        <div className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Best Practices</div>
                        <div className="text-base font-black text-white mt-0.5">100%</div>
                        <div className="text-[10px] text-slate-400">FOS ≥ 2.0 • Transition fillets present</div>
                      </div>
                    </div>
                  )}

                  {/* Socratic Scaffolding Response */}
                  {validationResult.tutoring?.scaffolding_response && (
                    <div className="mt-3 bg-[#0b101c] border border-indigo-900/60 rounded-xl p-3.5 space-y-2">
                      <div className="text-[11px] font-mono text-indigo-400 font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Socratic Tutor Reflection (Anti-Answer Shield Active)</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {validationResult.tutoring.scaffolding_response.tutor_message}
                      </p>
                      {validationResult.tutoring.scaffolding_response.socratic_question && (
                        <div className="bg-[#101828] border border-blue-900/50 rounded-lg p-2.5 text-xs text-blue-200 font-medium">
                          <strong>Guiding Inquiry:</strong> {validationResult.tutoring.scaffolding_response.socratic_question}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Feature Tree, Constraints, Sliders & Materials (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Feature Timeline (Feature Tree) */}
          <div className="bg-[#080e18] border border-[#192b42] rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-wide uppercase font-mono flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>Feature Timeline (Solid Tree)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">6 Operations</span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1626] border border-[#192b42]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-slate-200">Sketch1 (Base & Holes)</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    dof === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-blue-400'
                  }`}
                >
                  {dof === 0 ? '0 DOF' : `${dof} Free DOF`}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1626] border border-[#192b42]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-slate-200">Extrude1 (Base Depth d1)</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    Math.abs(d1 - 12) <= 0.1 ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                  }`}
                >
                  {d1.toFixed(1)} mm
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1626] border border-[#192b42]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-slate-200">Hub Cylinder (OD 60 / ID 30 @ H42)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Fixed Datum A
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1626] border border-[#192b42]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-slate-200">Tangent Rib (12mm Web, 6.2 cm³)</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    tangent ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                  }`}
                >
                  {tangent ? 'G1 Tangent' : 'Cusp Discontinuity'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1626] border border-[#192b42]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-slate-200">Fastener Holes (2x Ø12 @ 70 pitch)</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    symmetry ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                  }`}
                >
                  {symmetry ? 'Symmetric' : 'Asymmetric'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#0c1626] border border-[#192b42]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">Fillet1 (Transition R = {filletRadius} mm)</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Geometric Constraints Control Card */}
          <div className="bg-[#080e18] border border-[#192b42] rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-wide uppercase font-mono flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Sketch Constraint Solvers</span>
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  dof === 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-blue-950 text-blue-400'
                }`}
              >
                DOF = {dof}
              </span>
            </div>

            <div className="space-y-2.5">
              {/* Symmetry Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c1524] border border-[#1d2f4a]">
                <div>
                  <div className="text-xs font-semibold text-white">Symmetry across Mid-Plane</div>
                  <div className="text-[10px] text-slate-400">Mirrors 2x Ø12 fastener holes at 70 mm pitch</div>
                </div>
                <button
                  onClick={() => setSymmetry(!symmetry)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    symmetry ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>

              {/* Rib Tangency Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c1524] border border-[#1d2f4a]">
                <div>
                  <div className="text-xs font-semibold text-white">Rib Tangency to Hub (G1)</div>
                  <div className="text-[10px] text-slate-400">Eliminates slope cusp; smooth transition to OD 60</div>
                </div>
                <button
                  onClick={() => setTangent(!tangent)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                    tangent ? 'bg-emerald-600 justify-end' : 'bg-slate-700 justify-start'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white shadow-md" />
                </button>
              </div>
            </div>
          </div>

          {/* Driving Parameters Controls */}
          <div className="bg-[#080e18] border border-[#192b42] rounded-2xl p-4 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-wide uppercase font-mono flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                <span>Driving Parametric Dimensions</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Tolerance: ±0.1 mm</span>
            </div>

            {/* Base Extrusion Depth d1 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Base Extrusion Depth (d1):</span>
                <span className="font-mono font-bold text-blue-400 text-sm">{d1.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="6"
                max="24"
                step="0.5"
                value={d1}
                onChange={e => setD1(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>6.0 mm</span>
                <span className="text-blue-400 font-semibold">Starts: 10.0 mm (Target: 12.0 mm)</span>
                <span>24.0 mm</span>
              </div>
            </div>

            {/* Fillet Radius */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Transition Fillet Radius (R):</span>
                <span className="font-mono font-bold text-indigo-400 text-sm">{filletRadius.toFixed(1)} mm</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8"
                step="0.5"
                value={filletRadius}
                onChange={e => setFilletRadius(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.5 mm (Sharp)</span>
                <span>8.0 mm (Generous)</span>
              </div>
            </div>

            {/* Applied Bearing Load */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Applied Bearing Load:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">{loadInN} N</span>
              </div>
              <input
                type="range"
                min="250"
                max="5000"
                step="50"
                value={loadInN}
                onChange={e => setLoadInN(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>250 N</span>
                <span className="text-emerald-400 font-semibold">500 N (Vector Test)</span>
                <span>5000 N</span>
              </div>
            </div>
          </div>

          {/* Physical Material & Mass Card */}
          <div className="bg-[#080e18] border border-[#192b42] rounded-2xl p-4 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white tracking-wide uppercase font-mono flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-blue-400" />
                <span>Physical Material & Mass</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">{currentMaterial.density} g/cm³</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.values(MATERIALS).map(mat => (
                <button
                  key={mat.id}
                  onClick={() => setMaterialKey(mat.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    materialKey === mat.id
                      ? 'bg-blue-950/70 border-blue-500 text-white shadow-md'
                      : 'bg-[#0c1524] border-[#1c2d46] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{mat.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {mat.density} g/cm³ • {mat.yieldStrength} MPa
                  </div>
                </button>
              ))}
            </div>

            {/* Mass & Structural Summary */}
            <div className="bg-[#0a1220] border border-[#17263b] rounded-xl p-3 font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Solid Volume:</span>
                <span className={`font-bold ${volume === 139.1 ? 'text-emerald-400' : 'text-slate-200'}`}>
                  {volume} cm³ {volume === 139.1 && '✓ (Exact Target)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Computed Mass:</span>
                <span
                  className={`font-bold ${
                    volume === 139.1 && materialKey === 'al-6061' ? 'text-emerald-400' : 'text-slate-200'
                  }`}
                >
                  {mass} g {volume === 139.1 && materialKey === 'al-6061' && '✓ (375.6 g in Al 6061)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Max Von Mises Stress:</span>
                <span className="text-slate-200">{maxStress} MPa</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#18283e] pt-1">
                <span className="text-slate-400">Factor of Safety (FOS):</span>
                <span className={`font-bold ${isFosSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fos} {isFosSafe ? '(Target ≥ 2.0 Satisfied)' : '(Below Target 2.0)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEA Structural Analysis Modal */}
      {isFeaModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#090f1b] border border-[#1e324f] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-[#18263a] pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-extrabold text-white">
                  FEA Static Stress & Factor of Safety (FOS)
                </h2>
              </div>
              <button
                onClick={() => setIsFeaModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mandatory Educational Disclaimer Banner */}
            <div className="bg-blue-950/50 border border-blue-800/80 rounded-xl p-3 text-xs text-blue-200 leading-relaxed font-sans">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-blue-300 font-mono">
                <Info className="w-4 h-4 text-blue-400" />
                <span>Notice</span>
              </div>
              Educational closed-form estimate, not a finite-element solver
            </div>

            {/* Test Vector Verification Banner */}
            <div className="bg-[#0e1728] border border-[#1f3352] rounded-xl p-3 font-mono text-xs space-y-1">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Benchmark Verification Vector:
              </div>
              <div className="text-slate-300">
                At <span className="text-white font-bold">500 N</span> in <span className="text-white font-bold">Al 6061-T6</span> (Yield = 276 MPa):
              </div>
              <div className="text-emerald-400 font-semibold">
                → Max Stress = 118.5 MPa • Factor of Safety (FOS) = 2.33 (PASS ≥ 2.0)
              </div>
            </div>

            {/* Live Model Evaluation Breakdown */}
            <div className="bg-[#0b1322] border border-[#1a2b42] rounded-xl p-4 font-mono text-xs space-y-3">
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-[#17253a]">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Active Material</span>
                  <span className="text-white font-bold text-sm">{currentMaterial.name}</span>
                  <span className="text-slate-400 text-[10px] block">Yield: {currentMaterial.yieldStrength} MPa</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Applied Force</span>
                  <span className="text-amber-400 font-bold text-sm">{loadInN} N</span>
                  <span className="text-slate-400 text-[10px] block">Downwards on bearing hub</span>
                </div>
              </div>

              {/* Stress & FOS Result Card */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#070d18] p-3 rounded-lg border border-[#142339]">
                  <div className="text-[10px] text-slate-400 uppercase">Max Von Mises Stress</div>
                  <div className="text-xl font-black text-white mt-0.5">{maxStress} MPa</div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">σ = Load × 0.237</div>
                </div>

                <div className="bg-[#070d18] p-3 rounded-lg border border-[#142339]">
                  <div className="text-[10px] text-slate-400 uppercase">Factor of Safety (FOS)</div>
                  <div className={`text-xl font-black mt-0.5 ${isFosSafe ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {fos}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans mt-0.5">FOS = Yield / Stress</div>
                </div>
              </div>

              {/* Status Badge */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between ${
                  isFosSafe
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isFosSafe ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  )}
                  <div>
                    <div className="font-bold text-sm">
                      {isFosSafe ? 'PASS: Design Margin Acceptable' : 'FAIL: Yield Criteria Exceeded'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans">
                      {isFosSafe
                        ? 'Target FOS ≥ 2.0 achieved for ductile machinery service.'
                        : 'FOS is below 2.0; component risks permanent plastic deformation or fatigue failure.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Load Presets */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Load Presets:</span>
                <button
                  onClick={() => {
                    setLoadInN(500);
                    runFeaAnalysis(500);
                  }}
                  className="px-2.5 py-1 bg-[#121c2c] hover:bg-[#1a273b] border border-[#23354c] rounded-lg text-xs font-mono text-cyan-300 cursor-pointer"
                >
                  500 N (Vector)
                </button>
                <button
                  onClick={() => {
                    setLoadInN(1000);
                    runFeaAnalysis(1000);
                  }}
                  className="px-2.5 py-1 bg-[#121c2c] hover:bg-[#1a273b] border border-[#23354c] rounded-lg text-xs font-mono text-slate-300 cursor-pointer"
                >
                  1000 N
                </button>
                <button
                  onClick={() => {
                    setLoadInN(2500);
                    runFeaAnalysis(2500);
                  }}
                  className="px-2.5 py-1 bg-[#121c2c] hover:bg-[#1a273b] border border-[#23354c] rounded-lg text-xs font-mono text-slate-300 cursor-pointer"
                >
                  2500 N (High)
                </button>
              </div>

              <button
                onClick={() => {
                  runFeaAnalysis(loadInN);
                  setStage4D(7);
                  setVisualStyle('stress');
                  setIsFeaModalOpen(false);
                }}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                Apply & View 3D Stress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

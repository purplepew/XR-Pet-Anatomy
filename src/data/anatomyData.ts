export type PetSpeciesId = 'dog' | 'cat';

export type AnatomicalLayerId = 'skin' | 'muscle' | 'skeleton' | 'organs';

export interface AnatomicalLayerMeta {
  id: AnatomicalLayerId;
  label: string;
  shortLabel: string;
  latinName: string;
  description: string;
  accentHex: string;
  depthOrder: number;
}

export interface OrganInfo {
  id: string;
  name: string;
  latinName: string;
  system: string;
  biologicalFunction: string;
  clinicalNotes: {
    dog: string;
    cat: string;
  };
  vitalMetrics: {
    dog: string;
    cat: string;
  };
  colorHex: string;
  highlightHex: string;
  /** Normalized 3D anchor position relative to the pet torso root (x: left/right, y: height above marker, z: cranial/caudal) */
  relativePosition: {
    dog: [number, number, number];
    cat: [number, number, number];
  };
}

export interface FlashcardMarkerSpec {
  speciesId: PetSpeciesId;
  markerCode: string;
  commonName: string;
  scientificName: string;
  breedReference: string;
  physicalDimensionsMm: string;
  /** 4x4 binary fiducial matrix (1 = dark module, 0 = white module) inside a black border */
  fiducialMatrix: number[][];
  summary: string;
  restingHeartRateBpm: string;
  respiratoryRateBpm: string;
  bodyTempCelsius: string;
  vertebralFormula: string;
}

export const ANATOMICAL_LAYERS: AnatomicalLayerMeta[] = [
  {
    id: 'skin',
    label: 'Exterior Skin',
    shortLabel: 'Skin',
    latinName: 'Integumentum Commune',
    description: 'Epidermal, dermal, and follicular coat barrier regulating thermoregulation and sensory reception.',
    accentHex: '#D97706',
    depthOrder: 0,
  },
  {
    id: 'muscle',
    label: 'Muscular System',
    shortLabel: 'Muscles',
    latinName: 'Systema Musculare',
    description: 'Striated skeletal musculature driving quadruped locomotion, posture, and joint stabilization.',
    accentHex: '#E11D48',
    depthOrder: 1,
  },
  {
    id: 'skeleton',
    label: 'Skeletal Structure',
    shortLabel: 'Skeleton',
    latinName: 'Systema Skeletale',
    description: 'Mineralized axial and appendicular endoskeleton shielding thoracic and cranial viscera.',
    accentHex: '#E2E8F0',
    depthOrder: 2,
  },
  {
    id: 'organs',
    label: 'Internal Organs',
    shortLabel: 'Organs',
    latinName: 'Viscera Interna',
    description: 'Thoracic, abdominal, and cranial organ systems maintaining metabolic and cardiovascular homeostasis.',
    accentHex: '#0EA5E9',
    depthOrder: 3,
  },
];

export const FLASHCARD_MARKERS: Record<PetSpeciesId, FlashcardMarkerSpec> = {
  dog: {
    speciesId: 'dog',
    markerCode: 'AR-MK-CANIS-01',
    commonName: 'Domestic Dog',
    scientificName: 'Canis lupus familiaris',
    breedReference: 'Mesaticephalic Working Canine',
    physicalDimensionsMm: '120 mm × 85 mmFiducial Card',
    fiducialMatrix: [
      [1, 0, 1, 1],
      [0, 1, 0, 0],
      [1, 1, 0, 1],
      [0, 0, 1, 0],
    ],
    summary: 'Deep-chested cursorial carnivore adapted for sustained aerobic endurance and high cardiac output.',
    restingHeartRateBpm: '70 – 120 BPM',
    respiratoryRateBpm: '15 – 30 breaths/min',
    bodyTempCelsius: '38.3 – 39.2 °C',
    vertebralFormula: 'C7 T13 L7 S3 Cd20',
  },
  cat: {
    speciesId: 'cat',
    markerCode: 'AR-MK-FELIS-02',
    commonName: 'Domestic Cat',
    scientificName: 'Felis catus',
    breedReference: 'Obligate Carnivore Feline',
    physicalDimensionsMm: '120 mm × 85 mm Fiducial Card',
    fiducialMatrix: [
      [0, 1, 1, 0],
      [1, 0, 0, 1],
      [0, 1, 1, 1],
      [1, 1, 0, 0],
    ],
    summary: 'Hyper-flexible ambush predator with vestigial clavicles, elastic spinal discs, and specialized protein metabolism.',
    restingHeartRateBpm: '140 – 220 BPM',
    respiratoryRateBpm: '20 – 30 breaths/min',
    bodyTempCelsius: '38.1 – 39.2 °C',
    vertebralFormula: 'C7 T13 L7 S3 Cd22',
  },
};

export const INTERNAL_ORGANS: OrganInfo[] = [
  {
    id: 'heart',
    name: 'Heart',
    latinName: 'Cor',
    system: 'Cardiovascular System',
    biologicalFunction:
      'Four-chambered muscular pump positioned between the 3rd and 6th intercostal spaces. Propels deoxygenated venous blood to the pulmonary circuit via the right ventricle and delivers oxygenated arterial blood to systemic tissues via the thick-walled left ventricle.',
    clinicalNotes: {
      dog: 'Ovoid cone oriented at a 45° angle to the sternum; apex rests near the diaphragm.',
      cat: 'More horizontally situated along the ventral thoracic floor with higher intrinsic sinus node rate.',
    },
    vitalMetrics: {
      dog: '0.75% of body mass · ~95 BPM',
      cat: '0.45% of body mass · ~175 BPM',
    },
    colorHex: '#DC2626',
    highlightHex: '#F87171',
    relativePosition: {
      dog: [0.02, 0.96, 0.34],
      cat: [0.02, 0.80, 0.31],
    },
  },
  {
    id: 'lungs',
    name: 'Lungs',
    latinName: 'Pulmones',
    system: 'Respiratory System',
    biologicalFunction:
      'Paired elastic parenchymal organs divided into cranial, middle, caudal, and accessory lobes. Facilitate alveolar gas exchange—diffusing inspired oxygen into pulmonary capillaries while expelling metabolic carbon dioxide.',
    clinicalNotes: {
      dog: 'High collateral ventilation and large tidal volume capacity supporting aerobic sprinting.',
      cat: 'Delicate bronchial tree with smooth muscle responsive to sympathetic bronchodilation.',
    },
    vitalMetrics: {
      dog: '6 Lobes (2 Left, 4 Right) · Tidal Vol ~12 mL/kg',
      cat: '6 Lobes (2 Left, 4 Right) · Tidal Vol ~10 mL/kg',
    },
    colorHex: '#FB7185',
    highlightHex: '#FDA4AF',
    relativePosition: {
      dog: [0.0, 1.07, 0.24],
      cat: [0.0, 0.89, 0.22],
    },
  },
  {
    id: 'brain',
    name: 'Brain',
    latinName: 'Encephalon',
    system: 'Central Nervous System',
    biologicalFunction:
      'Protected inside the neurocranium, integrating olfactory, auditory, visual, and proprioceptive inputs. Coordinates voluntary motor commands via the cerebral cortex and fine postural balance via the cerebellum.',
    clinicalNotes: {
      dog: 'Enlarged olfactory bulb (~40× human relative receptor density) dominating rostral prosencephalon.',
      cat: 'Highly developed visual cortex, superior colliculi, and vestibular cerebellar pathways for aerial righting.',
    },
    vitalMetrics: {
      dog: '~2.2 billion cortical neurons',
      cat: '~760 million cortical neurons',
    },
    colorHex: '#F472B6',
    highlightHex: '#F9A8D4',
    relativePosition: {
      dog: [0.0, 1.46, 0.82],
      cat: [0.0, 1.19, 0.72],
    },
  },
  {
    id: 'liver',
    name: 'Liver',
    latinName: 'Hepar',
    system: 'Hepatic & Metabolic System',
    biologicalFunction:
      'Six-lobed parenchymal gland cradled immediately caudal to the diaphragm. Performs bile synthesis for lipid emulsification, portal blood detoxification, glycogen storage, and plasma protein production.',
    clinicalNotes: {
      dog: 'Gallbladder sits between right medial and quadrate lobes; robust glucuronidation enzymes.',
      cat: 'Bilobed pancreatic-biliary sphincter (Ampulla of Vater); requires continuous dietary arginine and taurine.',
    },
    vitalMetrics: {
      dog: '3.4% of body mass · 6 Hepatic Lobes',
      cat: '3.1% of body mass · 6 Hepatic Lobes',
    },
    colorHex: '#991B1B',
    highlightHex: '#EF4444',
    relativePosition: {
      dog: [-0.03, 0.94, 0.02],
      cat: [-0.03, 0.78, 0.02],
    },
  },
  {
    id: 'stomach',
    name: 'Stomach',
    latinName: 'Ventriculus (Gaster)',
    system: 'Digestive System',
    biologicalFunction:
      'J-shaped muscular reservoir located in the cranial left abdomen. Secretes hydrochloric acid (pH 1.5–2.0) and pepsinogen to denature dietary proteins and sterilize ingested matter before pyloric emptying into the duodenum.',
    clinicalNotes: {
      dog: 'Highly distensible fundus capable of expanding up to 4× resting volume after large meals.',
      cat: 'Compact lumen adapted for frequent, small, high-protein prey meals with rapid gastric transit.',
    },
    vitalMetrics: {
      dog: 'Gastric pH 1.5 · Transit 4 – 8 hrs',
      cat: 'Gastric pH 1.8 · Transit 3 – 6 hrs',
    },
    colorHex: '#F59E0B',
    highlightHex: '#FCD34D',
    relativePosition: {
      dog: [0.09, 0.92, -0.14],
      cat: [0.08, 0.76, -0.12],
    },
  },
  {
    id: 'kidneys',
    name: 'Kidneys',
    latinName: 'Renes',
    system: 'Renal & Urinary System',
    biologicalFunction:
      'Paired retroperitoneal bean-shaped organs filtering systemic blood plasma through ratusan thousands of nephrons. Regulate extracellular fluid volume, electrolyte balance, acid-base pH, and erythropoietin secretion.',
    clinicalNotes: {
      dog: 'Smooth unipapillary cortex; right kidney sits more cranially in the renal fossa of the caudate liver lobe.',
      cat: 'Prominent capsular subcapsular veins and high urine-concentrating capacity (specific gravity > 1.040).',
    },
    vitalMetrics: {
      dog: '~415,000 nephrons per kidney',
      cat: '~200,000 nephrons per kidney',
    },
    colorHex: '#B45309',
    highlightHex: '#FBBF24',
    relativePosition: {
      dog: [0.0, 1.08, -0.30],
      cat: [0.0, 0.89, -0.26],
    },
  },
  {
    id: 'spleen',
    name: 'Spleen',
    latinName: 'Lien (Splen)',
    system: 'Lymphatic & Hematologic System',
    biologicalFunction:
      'Elongated falciform vascular organ tethered to the greater curvature of the stomach via the gastrosplenic ligament. Acts as an erythrocyte reservoir, filters senescent red blood cells, and mounts humoral immune responses.',
    clinicalNotes: {
      dog: 'Sinusoidal storage spleen capable of contracting to autotransfuse up to 20% more circulating RBCs during exercise.',
      cat: 'Non-sinusoidal spleen focused primarily on immunological surveillance and hematocrit filtration.',
    },
    vitalMetrics: {
      dog: 'Stores 15–20% of total RBC volume',
      cat: 'Compact non-sinusoidal parenchyma',
    },
    colorHex: '#7C2D12',
    highlightHex: '#FB923C',
    relativePosition: {
      dog: [0.15, 0.86, -0.22],
      cat: [0.13, 0.72, -0.18],
    },
  },
  {
    id: 'intestines',
    name: 'Intestinal Tract',
    latinName: 'Intestinum Tenue et Crassum',
    system: 'Gastrointestinal Tract',
    biologicalFunction:
      'Coiled tubular tract comprising the duodenum, jejunum, ileum, cecum, and colon. Completes enzymatic digestion via pancreatic proteases and lipases, absorbs nutrients across villous enterocytes, and reabsorbs water.',
    clinicalNotes: {
      dog: 'Intestinal length is ~4.5× body length, reflecting omnivorous-adapted carnivore starch and protein digestion.',
      cat: 'Short intestinal ratio (~3.2× body length) optimized strictly for rapid animal protein and fat assimilation.',
    },
    vitalMetrics: {
      dog: 'Length ~3.5 – 4.8 m · 4.5× body ratio',
      cat: 'Length ~1.4 – 1.8 m · 3.2× body ratio',
    },
    colorHex: '#EA580C',
    highlightHex: '#FDBA74',
    relativePosition: {
      dog: [0.0, 0.82, -0.42],
      cat: [0.0, 0.69, -0.35],
    },
  },
];

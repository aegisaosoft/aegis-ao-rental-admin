import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import companyService from '../services/companyService';
import { Company } from '../services/companyService';
import { Building2, ArrowLeft, Save, X, Sparkles, Zap, Crown } from 'lucide-react';
import Layout from '../components/Layout';
import { translationService } from '../services/translationService';
import { SUPPORTED_LANGUAGES } from '../types/translation.types';

// Country options grouped by continent
const countriesByContinent = {
  'North America': [
    'Anguilla', 'Antigua and Barbuda', 'Bahamas', 'Barbados', 'Belize', 'Bermuda',
    'British Virgin Islands', 'Canada', 'Cayman Islands', 'Costa Rica',
    'Cuba', 'Dominica', 'Dominican Republic', 'El Salvador', 'Greenland',
    'Grenada', 'Guatemala', 'Haiti', 'Honduras', 'Jamaica', 'Mexico',
    'Montserrat', 'Nicaragua', 'Panama', 'Puerto Rico', 'Saint Kitts and Nevis',
    'Saint Lucia', 'Saint Pierre and Miquelon', 'Saint Vincent and the Grenadines',
    'Trinidad and Tobago', 'Turks and Caicos Islands', 'United States',
    'US Virgin Islands'
  ],
  'South America': [
    'Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador',
    'French Guiana', 'Guyana', 'Paraguay', 'Peru', 'Suriname',
    'Uruguay', 'Venezuela'
  ]
};

// Languages used in aegis-rental-www
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

const AI_INTEGRATION_OPTIONS = ['free', 'claude', 'premium'] as const;
type AiIntegrationOption = typeof AI_INTEGRATION_OPTIONS[number];

const normalizeAiIntegration = (value?: string | null): AiIntegrationOption => {
  if (!value) {
    return 'claude';
  }
  const normalized = value.toLowerCase() as AiIntegrationOption;
  return (AI_INTEGRATION_OPTIONS as readonly string[]).includes(normalized) ? normalized : 'claude';
};

const AI_PLAN_CONFIG: Record<
  AiIntegrationOption,
  {
    title: string;
    subtitle: string;
    price: string;
    badge?: string;
    Icon: React.ComponentType<{ className?: string }>;
    borderClass: string;
    gradientClass?: string;
    badgeClass?: string;
  }
> = {
  free: {
    title: 'Free',
    subtitle: 'Smart rule-based recommendations',
    price: '$0',
    Icon: Zap,
    borderClass: 'border-emerald-300',
    gradientClass: '',
  },
  claude: {
    title: 'Claude AI',
    subtitle: 'Advanced AI recommendations',
    price: '$0.007/request',
    badge: 'Best Value',
    Icon: Sparkles,
    borderClass: 'border-indigo-300',
    gradientClass: 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500 text-white',
    badgeClass: 'bg-indigo-100 text-indigo-700',
  },
  premium: {
    title: 'Premium',
    subtitle: 'GPT-4 + HD Voice',
    price: '$0.045/request',
    Icon: Crown,
    borderClass: 'border-amber-300',
    gradientClass: '',
  },
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'anguilla': 'XCD',
  'antigua and barbuda': 'XCD',
  'bahamas': 'BSD',
  'barbados': 'BBD',
  'belize': 'BZD',
  'bermuda': 'BMD',
  'british virgin islands': 'USD',
  'canada': 'CAD',
  'cayman islands': 'KYD',
  'costa rica': 'CRC',
  'cuba': 'CUP',
  'dominica': 'XCD',
  'dominican republic': 'DOP',
  'el salvador': 'USD',
  'greenland': 'DKK',
  'grenada': 'XCD',
  'guatemala': 'GTQ',
  'haiti': 'HTG',
  'honduras': 'HNL',
  'jamaica': 'JMD',
  'mexico': 'MXN',
  'montserrat': 'XCD',
  'nicaragua': 'NIO',
  'panama': 'PAB',
  'puerto rico': 'USD',
  'saint kitts and nevis': 'XCD',
  'saint lucia': 'XCD',
  'saint pierre and miquelon': 'EUR',
  'saint vincent and the grenadines': 'XCD',
  'trinidad and tobago': 'TTD',
  'turks and caicos islands': 'USD',
  'united states': 'USD',
  'us virgin islands': 'USD',
  'argentina': 'ARS',
  'bolivia': 'BOB',
  'brazil': 'BRL',
  'chile': 'CLP',
  'colombia': 'COP',
  'ecuador': 'USD',
  'french guiana': 'EUR',
  'guyana': 'GYD',
  'paraguay': 'PYG',
  'peru': 'PEN',
  'suriname': 'SRD',
  'uruguay': 'UYU',
  'venezuela': 'VES'
};

const CURRENCY_OPTIONS = [
  { code: 'ARS', label: 'Argentine Peso (ARS)' },
  { code: 'BBD', label: 'Barbadian Dollar (BBD)' },
  { code: 'BMD', label: 'Bermudian Dollar (BMD)' },
  { code: 'BOB', label: 'Bolivian Boliviano (BOB)' },
  { code: 'BRL', label: 'Brazilian Real (BRL)' },
  { code: 'BSD', label: 'Bahamian Dollar (BSD)' },
  { code: 'BZD', label: 'Belize Dollar (BZD)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'CLP', label: 'Chilean Peso (CLP)' },
  { code: 'COP', label: 'Colombian Peso (COP)' },
  { code: 'CRC', label: 'Costa Rican Colón (CRC)' },
  { code: 'CUP', label: 'Cuban Peso (CUP)' },
  { code: 'DKK', label: 'Danish Krone (DKK)' },
  { code: 'DOP', label: 'Dominican Peso (DOP)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GTQ', label: 'Guatemalan Quetzal (GTQ)' },
  { code: 'GYD', label: 'Guyanese Dollar (GYD)' },
  { code: 'HNL', label: 'Honduran Lempira (HNL)' },
  { code: 'HTG', label: 'Haitian Gourde (HTG)' },
  { code: 'JMD', label: 'Jamaican Dollar (JMD)' },
  { code: 'KYD', label: 'Cayman Islands Dollar (KYD)' },
  { code: 'MXN', label: 'Mexican Peso (MXN)' },
  { code: 'NIO', label: 'Nicaraguan Córdoba (NIO)' },
  { code: 'PAB', label: 'Panamanian Balboa (PAB)' },
  { code: 'PEN', label: 'Peruvian Sol (PEN)' },
  { code: 'PYG', label: 'Paraguayan Guaraní (PYG)' },
  { code: 'SRD', label: 'Surinamese Dollar (SRD)' },
  { code: 'TTD', label: 'Trinidad & Tobago Dollar (TTD)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'UYU', label: 'Uruguayan Peso (UYU)' },
  { code: 'VES', label: 'Venezuelan Bolívar (VES)' },
  { code: 'XCD', label: 'Eastern Caribbean Dollar (XCD)' }
].sort((a, b) => a.label.localeCompare(b.label));

const getCurrencyForCountry = (country?: string | null): string => {
  const normalized = country?.trim().toLowerCase() ?? '';
  return COUNTRY_CURRENCY_MAP[normalized] || 'USD';
};

const SVG_ICON_OPTIONS: { value: string; label: string }[] = [
  {
    label: 'Star',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3.25l2.574 5.215 5.756.837-4.165 4.06.983 5.73L12 16.9l-5.148 2.192.983-5.73-4.165-4.06 5.756-.837L12 3.25z"/></svg>'
  },
  {
    label: 'Shield',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.25l8 3v6.112c0 4.213-2.732 8.186-6.825 9.753a2.5 2.5 0 0 1-1.75 0C6.332 19.548 3.6 15.575 3.6 11.362V5.25l8-3z"/></svg>'
  },
  {
    label: 'Car',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 4.5h11l2 6.5v7c0 .552-.448 1-1 1h-1a1 1 0 0 1-1-1v-1h-9v1a1 1 0 0 1-1 1h-1c-.552 0-1-.448-1-1v-7l2-6.5zm1.3 2L6.3 10.5h11.4L16.2 6.5H7.8zM8 13.5a1.5 1.5 0 1 0 0 3h.01a1.5 1.5 0 0 0 0-3H8zm8 0a1.5 1.5 0 1 0 0 3h.01a1.5 1.5 0 0 0 0-3H16z"/></svg>'
  },
  {
    label: 'Check',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.285 6.707l-11 11a1 1 0 0 1-1.414 0l-4.5-4.5 1.414-1.414L8.5 15.086l10.293-10.293 1.492 1.914z"/></svg>'
  },
  {
    label: 'Discount',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4.5 5.25a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H14l-2 3-2-3h-2.5a3 3 0 0 1-3-3v-9zM9 8.25a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm6 4.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-6.75 3.5l7.5-7.5-1.5-1.5-7.5 7.5 1.5 1.5z"/></svg>'
  },
  {
    label: 'Fuel',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M7 3.75h6a1.5 1.5 0 0 1 1.5 1.5v13.5H5.5V5.25A1.5 1.5 0 0 1 7 3.75zm10 3h1a1 1 0 0 1 1 1v9.689a1.75 1.75 0 1 1-1.5 0V8.75h-.5a1 1 0 0 1-1-1v-3a1 1 0 1 1 2 0v2z"/></svg>'
  },
  {
    label: 'Road',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 3h8l3 18h-4l-1-6h-4l-1 6H5l3-18zm4 6l-.5-3h-1l-.5 3h2zm.5 3h-3l-.5 3h4l-.5-3z"/></svg>'
  },
  {
    label: 'Location',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.25a7.25 7.25 0 0 0-7.25 7.25c0 4.582 5.53 9.954 6.92 11.238a.5.5 0 0 0 .66 0c1.39-1.284 6.92-6.656 6.92-11.238A7.25 7.25 0 0 0 12 2.25zm0 9.5a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5z"/></svg>'
  },
  {
    label: 'Heart',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-6.5-4.35-9-8.4A5.25 5.25 0 0 1 7.77 3.62a4.2 4.2 0 0 1 4.23 1.93 4.2 4.2 0 0 1 4.23-1.93 5.25 5.25 0 0 1 4.77 8.98C18.5 16.65 12 21 12 21z"/></svg>'
  },
  {
    label: 'Car Profile',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9.5h1.2l1.4-3.5h10.8l1.4 3.5H20a2 2 0 0 1 2 2v4.75a1.75 1.75 0 0 1-3.5 0V15h-1v1.25a1.75 1.75 0 0 1-3.5 0V15H10v1.25a1.75 1.75 0 0 1-3.5 0V15h-1v1.25a1.75 1.75 0 1 1-3.5 0V11.5a2 2 0 0 1 2-2zm4.25 4.25a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm7.5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"/></svg>'
  },
  {
    label: 'Watch',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M9 2h6l.75 3h.75a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5h-.75L15 22H9l-.75-3H7.5A2.5 2.5 0 0 1 5 16.5v-9A2.5 2.5 0 0 1 7.5 5h.75L9 2zm3 5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 1.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm-.75 1.5v2.25l1.75 1.05.75-1.23-1.25-.75V10H11.25z"/></svg>'
  },
  {
    label: 'Stopwatch',
    value: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10.5 1.5h3v1.5H16v1.5h-7V3h1.5V1.5zM12 6.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zm0 1.5a5 5 0 1 0 .001 10.001A5 5 0 0 0 12 8zm-.75 1.5h1.5v3.25l2.25 1.3-.75 1.3-3-1.75V9.5z"/></svg>'
  }
];

// Interface for language text object
type LocalizedTextMap = Record<string, string>;

interface SectionNotePicture {
  url: string;
}

type PictureValue = {
  url: string;
};

interface SectionNote {
  picture: SectionNotePicture;
  symbolForeColor: string;
  symbol: string;
  foreColor: string;
  backColor: string;
  title: LocalizedTextMap;
  caption: LocalizedTextMap;
  text: LocalizedTextMap;
}

interface Section {
  backColor: string;
  foreColor: string;
  notesLayout: 'vertical' | 'horizontal';
  alignment: 'left' | 'right' | 'center';
  backgroundImage: PictureValue;
  title: LocalizedTextMap;
  description: LocalizedTextMap;
  notes: SectionNote[];
}

const createEmptyLocalizedMap = (): LocalizedTextMap => {
  const map: LocalizedTextMap = {};
  LANGUAGES.forEach(lang => {
    map[lang.code] = '';
  });
  return map;
};

const ensureLocalizedMap = (value: any): LocalizedTextMap => {
  const map = createEmptyLocalizedMap();
  if (value && typeof value === 'object') {
    LANGUAGES.forEach(lang => {
      if (typeof value[lang.code] === 'string') {
        map[lang.code] = value[lang.code];
      }
    });
  }
  return map;
};

const createEmptyNote = (): SectionNote => ({
  picture: { url: '' },
  symbolForeColor: '#1f2937',
  symbol: '',
  foreColor: '',
  backColor: '',
  title: createEmptyLocalizedMap(),
  caption: createEmptyLocalizedMap(),
  text: createEmptyLocalizedMap()
});

const createEmptySection = (): Section => ({
  backColor: '#ffffff',
  foreColor: '#000000',
  notesLayout: 'vertical',
  alignment: 'left',
  backgroundImage: { url: '' },
  title: createEmptyLocalizedMap(),
  description: createEmptyLocalizedMap(),
  notes: [createEmptyNote()]
});

const normalizePicture = (picture: any): SectionNotePicture => {
  if (picture && typeof picture === 'object') {
    if (typeof picture.url === 'string') {
      return { url: picture.url };
    }
    if (typeof picture.picturePng === 'string') {
      return { url: picture.picturePng };
    }
  }
  if (typeof picture === 'string') {
    return { url: picture };
  }
  return { url: '' };
};

const normalizeNote = (note: any): SectionNote => ({
  picture: normalizePicture(note?.picture ?? note?.picturePng ?? ''),
  symbolForeColor: note?.symbolForeColor ?? '#1f2937',
  symbol: note?.symbol ?? '',
  foreColor: note?.foreColor ?? '',
  backColor: note?.backColor ?? '',
  title: ensureLocalizedMap(note?.title),
  caption: ensureLocalizedMap(note?.caption),
  text: ensureLocalizedMap(note?.text)
});

const normalizeSection = (section: any): Section => ({
  backColor: section?.backColor ?? '#ffffff',
  foreColor: section?.foreColor ?? '#000000',
  notesLayout: section?.notesLayout === 'horizontal' ? 'horizontal' : 'vertical',
  alignment: ['left', 'right', 'center'].includes(section?.alignment)
    ? section.alignment
    : 'left',
  backgroundImage: normalizePicture(section?.backgroundImage ?? section?.backgroundImageUrl ?? ''),
  title: ensureLocalizedMap(section?.title),
  description: ensureLocalizedMap(section?.description),
  notes:
    Array.isArray(section?.notes) && section.notes.length > 0
      ? section.notes.map((note: any) => normalizeNote(note))
      : [createEmptyNote()]
});

const ensureSectionsNormalized = (sections: Section[]): Section[] => {
  if (!sections.length) {
    return [createEmptySection()];
  }
  return sections.map(section => ({
    ...section,
    title: ensureLocalizedMap(section.title),
    description: ensureLocalizedMap(section.description),
    alignment: ['left', 'right', 'center'].includes(section.alignment)
      ? section.alignment
      : 'left',
    backgroundImage: normalizePicture(section.backgroundImage),
    notes:
      section.notes && section.notes.length
        ? section.notes.map(note => ({
            ...note,
            picture: normalizePicture(note.picture),
            title: ensureLocalizedMap(note.title),
            caption: ensureLocalizedMap(note.caption),
            text: ensureLocalizedMap(note.text)
          }))
        : [createEmptyNote()]
  }));
};

const convertLegacyTextsToSections = (legacy: any[]): Section[] => {
  const sections: Section[] = [];

  legacy.forEach((languageEntry: any) => {
    const langCode = typeof languageEntry?.language === 'string' ? languageEntry.language : 'en';
    const legacySections = Array.isArray(languageEntry?.sections) ? languageEntry.sections : [];

    legacySections.forEach((legacySection: any, sectionIndex: number) => {
      if (!sections[sectionIndex]) {
        sections[sectionIndex] = createEmptySection();
      }
      const section = sections[sectionIndex];

      section.backColor = legacySection?.backColor ?? section.backColor;
      section.foreColor = legacySection?.foreColor ?? section.foreColor;
      section.notesLayout =
        legacySection?.notesLayout === 'horizontal' ? 'horizontal' : section.notesLayout;
      section.title[langCode] = legacySection?.title ?? '';
      section.description[langCode] = legacySection?.description ?? '';

      const legacyNotes = Array.isArray(legacySection?.notes) ? legacySection.notes : [];
      legacyNotes.forEach((legacyNote: any, noteIndex: number) => {
        if (!section.notes[noteIndex]) {
          section.notes[noteIndex] = createEmptyNote();
        }
        const note = section.notes[noteIndex];

        const normalizedPicture = normalizePicture(
          legacyNote?.picture ?? legacyNote?.picturePng ?? note.picture
        );
        if (!note.picture?.url && normalizedPicture.url) {
          note.picture = normalizedPicture;
        }
        note.symbolForeColor = legacyNote?.symbolForeColor ?? note.symbolForeColor;
        note.symbol = legacyNote?.symbol ?? note.symbol;
        note.foreColor = legacyNote?.foreColor ?? note.foreColor;
        note.backColor = legacyNote?.backColor ?? note.backColor;
        note.title[langCode] = legacyNote?.title ?? '';
        note.caption[langCode] = legacyNote?.caption ?? '';
        note.text[langCode] = legacyNote?.text ?? '';
      });
    });
  });

  return ensureSectionsNormalized(sections.length ? sections : [createEmptySection()]);
};

// Parse JSON string to array, or initialize with default structure
const parseSections = (jsonString?: string): Section[] => {
  if (!jsonString || jsonString.trim() === '') {
    return [createEmptySection()];
  }

  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      const isLegacyFormat = parsed.some(
        item => item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'language')
      );
      if (isLegacyFormat) {
        return convertLegacyTextsToSections(parsed);
      }

      return ensureSectionsNormalized(parsed.map(normalizeSection));
    }
  } catch (e) {
    console.error('Failed to parse texts JSON:', e);
  }

  return [createEmptySection()];
};

// LanguageTextEditor Component - Shows one language at a time
interface LanguageTextEditorProps {
  languageCode: string;
  value?: string;
  onChange: (value: string) => void;
  openFilePicker: (accept: string, onFileLoad: (dataUrl: string) => void) => void;
}

const LanguageTextEditor: React.FC<LanguageTextEditorProps> = ({ languageCode, value, onChange, openFilePicker }) => {
  const [sections, setSections] = useState<Section[]>(() => parseSections(value));
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
  const [collapsedNotes, setCollapsedNotes] = useState<Record<number, Record<number, boolean>>>({});
  // Update local state when value prop changes
  useEffect(() => {
    setCollapsedSections(prev => {
      const nextState: Record<number, boolean> = {};
      sections.forEach((_, idx) => {
        nextState[idx] = Object.prototype.hasOwnProperty.call(prev, idx) ? prev[idx] : true;
      });
      return nextState;
    });

    setCollapsedNotes(prev => {
      const nextState: Record<number, Record<number, boolean>> = {};
      sections.forEach((section, sectionIdx) => {
        const prevSectionState = prev[sectionIdx] || {};
        const nextSectionState: Record<number, boolean> = {};
        section.notes.forEach((_, noteIdx) => {
          nextSectionState[noteIdx] = Object.prototype.hasOwnProperty.call(prevSectionState, noteIdx)
            ? prevSectionState[noteIdx]
            : true;
        });
        nextState[sectionIdx] = nextSectionState;
      });
      return nextState;
    });
  }, [sections]);

  useEffect(() => {
    setSections(parseSections(value));
  }, [value]);

  // Get current language data
  // Language code comes from active tab selection and is not editable
  const currentLang = LANGUAGES.find(l => l.code === languageCode) || LANGUAGES[0];

  const handleSectionsUpdate = (updatedSections: Section[]) => {
    const normalized = ensureSectionsNormalized(updatedSections);
    setSections(normalized);
    try {
      const jsonString = JSON.stringify(normalized, null, 2);
      onChange(jsonString);
    } catch (e) {
      console.error('Failed to stringify sections:', e);
    }
  };

  const handleSectionChange = (index: number, field: 'title' | 'description', value: string) => {
    const updatedSections = sections.map((section, idx) =>
      idx === index
        ? {
            ...section,
            [field]: {
              ...section[field],
              [languageCode]: value
            }
          }
        : section
    );
    handleSectionsUpdate(updatedSections);
  };

  const handleSectionColorChange = (index: number, field: 'backColor' | 'foreColor', value: string) => {
    const updatedSections = sections.map((section, idx) =>
      idx === index
        ? {
            ...section,
            [field]: value
          }
        : section
    );
    handleSectionsUpdate(updatedSections);
  };

  const handleSectionLayoutChange = (index: number, value: 'vertical' | 'horizontal') => {
    const updatedSections = sections.map((section, idx) =>
      idx === index
        ? {
            ...section,
            notesLayout: value
          }
        : section
    );
    handleSectionsUpdate(updatedSections);
  };

  const handleSectionAlignmentChange = (index: number, value: 'left' | 'right' | 'center') => {
    const updatedSections = sections.map((section, idx) =>
      idx === index
        ? {
            ...section,
            alignment: value
          }
        : section
    );
    handleSectionsUpdate(updatedSections);
  };

  const handleSectionBackgroundChange = (index: number, value: string) => {
    const updatedSections = sections.map((section, idx) =>
      idx === index
        ? {
            ...section,
            backgroundImage: { url: value }
          }
        : section
    );
    handleSectionsUpdate(updatedSections);
  };

  const handleSectionBackgroundUpload = (index: number) => {
    openFilePicker('image/*', (dataUrl) => {
      handleSectionBackgroundChange(index, dataUrl);
    });
  };

  const handleSectionBackgroundClear = (index: number) => {
    handleSectionBackgroundChange(index, '');
  };

  const handleAddSection = () => {
    handleSectionsUpdate([...sections, createEmptySection()]);
  };

  const handleRemoveSection = (index: number) => {
    const updatedSections = sections.filter((_, i) => i !== index);
    handleSectionsUpdate(updatedSections.length > 0 ? updatedSections : [createEmptySection()]);
  };

  const toggleSectionCollapse = (index: number) => {
    setCollapsedSections(prev => {
      const next = { ...prev };
      const isCollapsed = Object.prototype.hasOwnProperty.call(next, index) ? next[index] : true;
      next[index] = !isCollapsed;
      return next;
    });
  };

  const toggleNoteCollapse = (sectionIndex: number, noteIndex: number) => {
    setCollapsedNotes(prev => {
      const next = { ...prev };
      const sectionState = next[sectionIndex] ? { ...next[sectionIndex] } : {};
      const isCollapsed = Object.prototype.hasOwnProperty.call(sectionState, noteIndex) ? sectionState[noteIndex] : true;
      sectionState[noteIndex] = !isCollapsed;
      next[sectionIndex] = sectionState;
      return next;
    });
  };

  const handleNoteChange = (
    sectionIndex: number,
    noteIndex: number,
    field: 'symbol' | 'symbolForeColor' | 'text' | 'foreColor' | 'backColor' | 'caption' | 'title',
    value: string
  ) => {
    const updatedSections = sections.map((section, idx) => {
      if (idx !== sectionIndex) return section;
      const notes = section.notes.map((note, nIdx) => {
        if (nIdx !== noteIndex) return note;

        if (field === 'title' || field === 'caption' || field === 'text') {
          return {
            ...note,
            [field]: {
              ...note[field],
              [languageCode]: value
            }
          };
        }

        return { ...note, [field]: value };
      });
      return { ...section, notes };
    });
    handleSectionsUpdate(updatedSections);
  };

  const handlePictureChange = (sectionIndex: number, noteIndex: number, value: string) => {
    const updatedSections = sections.map((section, idx) => {
      if (idx !== sectionIndex) return section;
      const notes = section.notes.map((note, nIdx) =>
        nIdx === noteIndex ? { ...note, picture: { url: value } } : note
      );
      return { ...section, notes };
    });
    handleSectionsUpdate(updatedSections);
  };

  const handleAddNote = (sectionIndex: number) => {
    const updatedSections = sections.map((section, idx) => {
      if (idx !== sectionIndex) return section;
      return {
        ...section,
        notes: [...section.notes, createEmptyNote()]
      };
    });
    handleSectionsUpdate(updatedSections);
  };

  const handleRemoveNote = (sectionIndex: number, noteIndex: number) => {
    const updatedSections = sections.map((section, idx) => {
      if (idx !== sectionIndex) return section;
      const notes = section.notes.filter((_, nIdx) => nIdx !== noteIndex);
      return {
        ...section,
        notes: notes.length > 0 ? notes : [createEmptyNote()]
      };
    });
    handleSectionsUpdate(updatedSections);
  };

  const handleNotePictureUpload = (sectionIndex: number, noteIndex: number) => {
    openFilePicker('image/*', (dataUrl) => {
      handlePictureChange(sectionIndex, noteIndex, dataUrl);
      setCollapsedNotes(prev => {
        const next = { ...prev };
        const sectionState = next[sectionIndex] ? { ...next[sectionIndex] } : {};
        sectionState[noteIndex] = false;
        next[sectionIndex] = sectionState;
        return next;
      });
    });
  };

  const handleNotePictureClear = (sectionIndex: number, noteIndex: number) => {
    handlePictureChange(sectionIndex, noteIndex, '');
  };

  const languageCollapsed = collapsedSections || {};
  const notesCollapsed = collapsedNotes || {};

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {sections.map((section, index) => {
          const isSectionCollapsed = Object.prototype.hasOwnProperty.call(languageCollapsed, index) ? languageCollapsed[index] : true;

          return (
            <div key={`${languageCode}-section-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleSectionCollapse(index)}
                    className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-full text-gray-600 hover:text-blue-600 hover:border-blue-400"
                    aria-label={isSectionCollapsed ? 'Expand section' : 'Collapse section'}
                  >
                    <span className="text-lg leading-none">{isSectionCollapsed ? '▶' : '▼'}</span>
                  </button>
                  <div>
                    <h4 className="text-md font-semibold text-gray-700">Section {index + 1}</h4>
                  {(section.title[languageCode] || section.description[languageCode]) && (
                      <p className="text-sm text-gray-500 max-w-md truncate">
                      {section.title[languageCode] || section.description[languageCode] || ''}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSection(index)}
                  className="text-sm text-red-600 hover:text-red-700 disabled:text-gray-400"
                  disabled={sections.length === 1}
                >
                  Delete
                </button>
              </div>

            {!isSectionCollapsed && (
              <div className="space-y-6 mt-4">
                <div className="space-y-4 rounded-md border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-semibold text-gray-700">Shared Settings</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Section Background Color
                      </label>
                      <p className="text-xs text-gray-500 mb-2">Shared across all languages</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={section.backColor && /^#([0-9A-Fa-f]{6})$/.test(section.backColor) ? section.backColor : '#ffffff'}
                          onChange={(e) => handleSectionColorChange(index, 'backColor', e.target.value)}
                          className="h-10 w-12 border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          value={section.backColor}
                          onChange={(e) => handleSectionColorChange(index, 'backColor', e.target.value)}
                          placeholder="#FFFFFF"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Section Foreground Color
                      </label>
                      <p className="text-xs text-gray-500 mb-2">Shared across all languages</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={section.foreColor && /^#([0-9A-Fa-f]{6})$/.test(section.foreColor) ? section.foreColor : '#000000'}
                          onChange={(e) => handleSectionColorChange(index, 'foreColor', e.target.value)}
                          className="h-10 w-12 border border-gray-300 rounded"
                        />
                        <input
                          type="text"
                          value={section.foreColor}
                          onChange={(e) => handleSectionColorChange(index, 'foreColor', e.target.value)}
                          placeholder="#000000"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes Layout</label>
                    <p className="text-xs text-gray-500 mb-2">Shared across all languages</p>
                    <div className="flex gap-4">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name={`notes-layout-shared-${index}`}
                          value="vertical"
                          checked={section.notesLayout === 'vertical'}
                          onChange={() => handleSectionLayoutChange(index, 'vertical')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Vertical</span>
                      </label>
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="radio"
                          name={`notes-layout-shared-${index}`}
                          value="horizontal"
                          checked={section.notesLayout === 'horizontal'}
                          onChange={() => handleSectionLayoutChange(index, 'horizontal')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Horizontal</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Section Alignment</label>
                    <p className="text-xs text-gray-500 mb-2">Shared across all languages</p>
                    <div className="flex flex-wrap gap-2">
                      {(['left', 'center', 'right'] as const).map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleSectionAlignmentChange(index, option)}
                          className={`px-3 py-1 text-sm rounded border transition ${
                            section.alignment === option
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section Background Image
                    </label>
                    <p className="text-xs text-gray-500 mb-2">Shared across all languages</p>
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <input
                          type="text"
                          value={section.backgroundImage?.url || ''}
                          onChange={(e) => handleSectionBackgroundChange(index, e.target.value)}
                          placeholder="https://example.com/background.jpg"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSectionBackgroundUpload(index)}
                            className="px-3 py-2 text-sm border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50"
                          >
                            Upload
                          </button>
                          {section.backgroundImage?.url && (
                            <button
                              type="button"
                              onClick={() => handleSectionBackgroundClear(index)}
                              className="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                      {section.backgroundImage?.url && (
                        <img
                          src={section.backgroundImage.url}
                          alt={`Section ${index + 1} background preview`}
                          className="h-24 w-full max-w-xl object-cover rounded border border-gray-200"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title ({currentLang.name})
                    </label>
                    <input
                      type="text"
                      value={section.title[languageCode] ?? ''}
                      onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                      placeholder={`Enter section title in ${currentLang.name}`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description ({currentLang.name})
                    </label>
                    <textarea
                      value={section.description[languageCode] ?? ''}
                      onChange={(e) => handleSectionChange(index, 'description', e.target.value)}
                      placeholder={`Enter section description in ${currentLang.name}`}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-gray-700">Notes</h5>
                      <button
                        type="button"
                        onClick={() => handleAddNote(index)}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        Add Note
                      </button>
                    </div>

                    {section.notes.map((note, noteIdx) => {
                      const isNoteCollapsed =
                        notesCollapsed[index]?.[noteIdx] ?? true;
                      const currentTitle = section.notes[noteIdx].title[languageCode] || '';

                      return (
                        <div key={`${languageCode}-section-${index}-note-${noteIdx}`} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                          <div className="space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => toggleNoteCollapse(index, noteIdx)}
                                  className="flex items-center justify-center w-7 h-7 border border-gray-300 rounded-full text-gray-600 hover:text-blue-600 hover:border-blue-400"
                                  aria-label={isNoteCollapsed ? 'Expand note' : 'Collapse note'}
                                >
                                  <span className="text-base leading-none">{isNoteCollapsed ? '▶' : '▼'}</span>
                                </button>
                                <div className="flex flex-col">
                                  <span className="text-xs font-semibold text-gray-600 uppercase">Note {noteIdx + 1}</span>
                                  <span className="text-xs text-gray-500 truncate max-w-xs">
                                    {currentTitle || 'No title set'}
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveNote(index, noteIdx)}
                                className="self-start md:self-center text-xs text-red-600 hover:text-red-700 disabled:text-gray-400"
                                disabled={section.notes.length === 1}
                              >
                                Delete
                              </button>
                            </div>

                            {!isNoteCollapsed && (
                              <div className="space-y-4">
                                <div className="space-y-3 rounded border border-gray-200 bg-white p-3">
                                  <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    Shared Settings
                                  </h6>

                                  <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-600">Picture URL</label>
                                    <p className="text-[11px] text-gray-500">Shared across all languages</p>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                      <input
                                        type="text"
                                        value={note.picture?.url || ''}
                                        onChange={(e) => handlePictureChange(index, noteIdx, e.target.value)}
                                        placeholder="https://example.com/image.png"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleNotePictureUpload(index, noteIdx)}
                                          className="px-3 py-2 text-sm border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50"
                                        >
                                          Upload
                                        </button>
                                        {note.picture?.url && (
                                          <button
                                            type="button"
                                            onClick={() => handleNotePictureClear(index, noteIdx)}
                                            className="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100"
                                          >
                                            Clear
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    {note.picture?.url && (
                                      <img
                                        src={note.picture.url}
                                        alt={`Note ${noteIdx + 1} preview`}
                                        className="h-20 w-auto rounded border border-gray-200 object-cover"
                                      />
                                    )}
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Symbol</label>
                                    <p className="text-[11px] text-gray-500 mb-2">Shared across all languages</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xl w-9 h-9 flex items-center justify-center border border-gray-200 rounded bg-white">
                                          {note.symbol && note.symbol.trim().startsWith('<svg') ? (
                                            <span
                                              className="inline-block w-6 h-6"
                                              style={{ color: note.symbolForeColor || '#1f2937' }}
                                              dangerouslySetInnerHTML={{ __html: note.symbol }}
                                            />
                                          ) : (
                                            <span className="text-gray-400">—</span>
                                          )}
                                        </span>
                                        <select
                                          value={note.symbol}
                                          onChange={(e) => handleNoteChange(index, noteIdx, 'symbol', e.target.value)}
                                          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                          <option value="">Select an icon…</option>
                                          {SVG_ICON_OPTIONS.map(option => (
                                            <option key={option.label} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="flex items-center gap-2 md:justify-end">
                                        <span className="text-xs text-gray-600">Color</span>
                                        <input
                                          type="color"
                                          value={note.symbolForeColor && /^#([0-9A-Fa-f]{6})$/.test(note.symbolForeColor) ? note.symbolForeColor : '#1f2937'}
                                          onChange={(e) => handleNoteChange(index, noteIdx, 'symbolForeColor', e.target.value)}
                                          className="h-8 w-10 border border-gray-300 rounded"
                                        />
                                        <input
                                          type="text"
                                          value={note.symbolForeColor}
                                          onChange={(e) => handleNoteChange(index, noteIdx, 'symbolForeColor', e.target.value)}
                                          placeholder="#1F2937"
                                          className="w-28 px-2 py-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-xs"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Custom SVG (optional)</label>
                                    <p className="text-[11px] text-gray-500 mb-2">Shared across all languages</p>
                                    <textarea
                                      value={note.symbol}
                                      onChange={(e) => handleNoteChange(index, noteIdx, 'symbol', e.target.value)}
                                      placeholder="Paste SVG markup if you need a custom icon"
                                      rows={3}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-xs"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Fore Color</label>
                                    <p className="text-[11px] text-gray-500 mb-2">Shared across all languages</p>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="color"
                                        value={note.foreColor && /^#([0-9A-Fa-f]{6})$/.test(note.foreColor) ? note.foreColor : '#000000'}
                                        onChange={(e) => handleNoteChange(index, noteIdx, 'foreColor', e.target.value)}
                                        className="h-10 w-12 border border-gray-300 rounded"
                                      />
                                      <input
                                        type="text"
                                        value={note.foreColor}
                                        onChange={(e) => handleNoteChange(index, noteIdx, 'foreColor', e.target.value)}
                                        placeholder="#000000"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      />
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Back Color</label>
                                    <p className="text-[11px] text-gray-500 mb-2">Shared across all languages</p>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="color"
                                        value={note.backColor && /^#([0-9A-Fa-f]{6})$/.test(note.backColor) ? note.backColor : '#ffffff'}
                                        onChange={(e) => handleNoteChange(index, noteIdx, 'backColor', e.target.value)}
                                        className="h-10 w-12 border border-gray-300 rounded"
                                      />
                                      <input
                                        type="text"
                                        value={note.backColor}
                                        onChange={(e) => handleNoteChange(index, noteIdx, 'backColor', e.target.value)}
                                        placeholder="#FFFFFF"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-3 rounded border border-gray-200 bg-white p-3">
                                  <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                                    {currentLang.name} Content
                                  </h6>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Note Title ({currentLang.name})
                                    </label>
                                    <input
                                      type="text"
                                      value={note.title[languageCode] ?? ''}
                                      onChange={(e) => handleNoteChange(index, noteIdx, 'title', e.target.value)}
                                      placeholder={`Note ${noteIdx + 1} title`}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Caption ({currentLang.name})
                                    </label>
                                    <input
                                      type="text"
                                      value={note.caption[languageCode] ?? ''}
                                      onChange={(e) => handleNoteChange(index, noteIdx, 'caption', e.target.value)}
                                      placeholder="Short caption for this note"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Text ({currentLang.name})
                                    </label>
                                    <textarea
                                      value={note.text[languageCode] ?? ''}
                                      onChange={(e) => handleNoteChange(index, noteIdx, 'text', e.target.value)}
                                      placeholder="Enter note text"
                                      rows={3}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={handleAddSection}
          className="inline-flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
        >
          Add Section
        </button>
      </div>
    </div>
  );
};


const CompanyForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'design' | 'content' | 'texts' | 'business' | 'ai'>('basic');
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>('en');
  const [translateFromLanguage, setTranslateFromLanguage] = useState<string>('en');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  
  const [formData, setFormData] = useState<Partial<Company>>({
    companyName: '',
    email: '',
    subdomain: undefined, // Optional - can be set manually
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    logoUrl: '',
    faviconUrl: '',
    country: '',
    currency: 'USD',
    language: 'en',
    about: JSON.stringify([createEmptySection()], null, 2),
    website: '',
    customCss: '',
    videoLink: '',
    bannerLink: '',
    backgroundLink: '',
    bookingIntegrated: false,
    taxId: '',
    stripeAccountId: '',
    blinkKey: '',
    aiIntegration: 'claude',
    texts: undefined,
    isActive: true
  });
  const [hasStoredStripeAccount, setHasStoredStripeAccount] = useState(false);
  const [removeStripeAccount, setRemoveStripeAccount] = useState(false);

  const normalizedSubdomain =
    formData.subdomain && formData.subdomain.trim()
      ? formData.subdomain.trim().toLowerCase()
      : '';
  const websiteDisplay = normalizedSubdomain
    ? `https://${normalizedSubdomain}.aegis-rental.com`
    : '';

  type MediaFieldKey = 'logoUrl' | 'faviconUrl' | 'bannerLink' | 'backgroundLink' | 'videoLink';

  const triggerFilePicker = useCallback((accept: string, onFileLoad: (dataUrl: string) => void) => {
    if (typeof document === 'undefined') {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    const cleanup = () => {
      input.value = '';
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        cleanup();
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onFileLoad(reader.result);
        }
        cleanup();
      };
      reader.onerror = () => {
        console.error('Failed to read selected file');
        cleanup();
      };
      reader.readAsDataURL(file);
    };

    document.body.appendChild(input);
    input.click();
  }, []);

  const handleMediaUpload = useCallback((field: MediaFieldKey, accept: string) => {
    triggerFilePicker(accept, (dataUrl) => {
      setFormData(prev => ({
        ...prev,
        [field]: dataUrl
      }));
    });
  }, [triggerFilePicker]);

  const handleMediaClear = useCallback((field: MediaFieldKey) => {
    setFormData(prev => ({
      ...prev,
      [field]: ''
    }));
  }, []);

  // Translate all untranslated fields - uses source language if it has content, otherwise finds best available source
  const translateSections = useCallback(async (
    sectionsJson: string,
    sourceLanguage: string,
    onTranslated: (translatedJson: string) => void
  ) => {
    if (!sectionsJson || sectionsJson.trim() === '') {
      return;
    }

    setIsTranslating(true);
    try {
      const sections = JSON.parse(sectionsJson) as Section[];
      const languageCodes = LANGUAGES.map(l => l.code);
      const updatedSections = JSON.parse(JSON.stringify(sections)) as Section[]; // Deep clone

      // Helper function to find the best source language for a field
      const findBestSourceLanguage = (field: LocalizedTextMap | undefined): string | null => {
        if (!field) return null;
        // First try the selected source language
        if (field[sourceLanguage]?.trim()) {
          return sourceLanguage;
        }
        // Otherwise find the first language with content
        for (const lang of languageCodes) {
          if (field[lang]?.trim()) {
            return lang;
          }
        }
        return null;
      };

      // Helper function to translate a field
      const translateField = async (
        field: LocalizedTextMap | undefined,
        fieldName: string,
        sectionIndex: number,
        noteIndex?: number
      ): Promise<void> => {
        if (!field) return;
        
        const bestSourceLang = findBestSourceLanguage(field);
        if (!bestSourceLang) {
          console.log(`No source text found for ${fieldName} in section ${sectionIndex}${noteIndex !== undefined ? ` note ${noteIndex}` : ''}`);
          return;
        }

        const sourceText = field[bestSourceLang]?.trim() || '';
        if (!sourceText) return;

        // Find all languages that need translation (empty or missing)
        const languagesToTranslate = languageCodes.filter(lang => {
          const existingText = field[lang]?.trim() || '';
          return lang !== bestSourceLang && !existingText;
        });

        if (languagesToTranslate.length === 0) {
          console.log(`All languages already have content for ${fieldName} in section ${sectionIndex}${noteIndex !== undefined ? ` note ${noteIndex}` : ''}`);
          return;
        }

        console.log(`Translating ${fieldName} from ${bestSourceLang} to ${languagesToTranslate.join(', ')} in section ${sectionIndex}${noteIndex !== undefined ? ` note ${noteIndex}` : ''}`);

        // Translate to all missing languages
        for (const targetLang of languagesToTranslate) {
          try {
            const translated = await translationService.translateText(
              sourceText,
              targetLang,
              bestSourceLang
            );
            field[targetLang] = translated;
            console.log(`✓ Translated ${fieldName} to ${targetLang}:`, translated.substring(0, 50) + '...');
          } catch (error) {
            console.error(`✗ Failed to translate ${fieldName} to ${targetLang}:`, error);
          }
        }
      };

      // Process each section
      for (let sectionIndex = 0; sectionIndex < updatedSections.length; sectionIndex++) {
        const section = updatedSections[sectionIndex];

        // Translate title
        await translateField(section.title, 'title', sectionIndex);

        // Translate description
        await translateField(section.description, 'description', sectionIndex);

        // Translate notes
        if (section.notes && Array.isArray(section.notes)) {
          for (let noteIndex = 0; noteIndex < section.notes.length; noteIndex++) {
            const note = section.notes[noteIndex];

            // Translate note title
            await translateField(note.title, 'note.title', sectionIndex, noteIndex);

            // Translate note caption
            await translateField(note.caption, 'note.caption', sectionIndex, noteIndex);

            // Translate note text
            await translateField(note.text, 'note.text', sectionIndex, noteIndex);
          }
        }
      }

      // Normalize sections to ensure all required fields are present
      const normalizedSections = ensureSectionsNormalized(updatedSections);
      
      // Validate JSON before stringifying
      try {
        const translatedJson = JSON.stringify(normalizedSections, null, 2);
        // Validate it can be parsed back
        JSON.parse(translatedJson);
        console.log('Translation complete. Translated JSON length:', translatedJson.length);
        console.log('Translated sections count:', normalizedSections.length);
        onTranslated(translatedJson);
      } catch (jsonError) {
        console.error('Failed to serialize translated sections:', jsonError);
        alert('Failed to serialize translated data. Please check the console for details.');
        throw jsonError;
      }
    } catch (error) {
      console.error('Translation error:', error);
      alert(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const handleAiPlanSelect = useCallback((value: AiIntegrationOption) => {
    setFormData(prev => ({
      ...prev,
      aiIntegration: value
    }));
  }, []);

  const loadCompany = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await companyService.getCompanyById(id!);
      console.groupCollapsed('[CompanyForm] loadCompany result');
      console.log('id:', data?.id);
      console.log('companyName:', data?.companyName);
      console.log('raw texts value:', (data as any)?.texts);
      console.groupEnd();
      const normalizedTexts =
        typeof (data as any).texts === 'string'
          ? (data as any).texts
          : (data as any).texts
          ? JSON.stringify((data as any).texts)
          : '';
      console.log('[CompanyForm] normalized texts string length:', normalizedTexts.length);
      const resolvedCurrency = (data?.currency || getCurrencyForCountry(data?.country)).toUpperCase();

      const sanitizedStripeAccount = '';
      const hasStripe = Boolean((data as any)?.hasStripeAccount || (data as any)?.stripeAccountId);
      setHasStoredStripeAccount(hasStripe);
      setRemoveStripeAccount(false);

      const { hasStripeAccount, ...rest } = (data as any) ?? {};
      const incomingAiIntegration = normalizeAiIntegration(
        (rest?.aiIntegration as string | undefined) ??
          (rest?.AiIntegration as string | undefined)
      );

      // Migrate "about" field: if it's plain text or old format, convert to sections format (same as texts)
      let normalizedAbout = rest?.about || '';
      if (normalizedAbout && normalizedAbout.trim()) {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(normalizedAbout);
          // Check if it's already in sections format (array)
          if (Array.isArray(parsed)) {
            // Already in sections format, keep it
            normalizedAbout = JSON.stringify(parsed, null, 2);
          } else if (parsed?.content || parsed?.message) {
            // Old format with content/message - convert to sections format
            const sections = [{
              backColor: '#ffffff',
              foreColor: '#000000',
              notesLayout: 'vertical',
              alignment: 'left',
              backgroundImage: { url: '' },
              title: parsed.content || { en: '', es: '', pt: '', fr: '', de: '' },
              description: parsed.message || { en: '', es: '', pt: '', fr: '', de: '' },
              notes: []
            }];
            normalizedAbout = JSON.stringify(sections, null, 2);
          } else {
            // Plain text - migrate to sections format
            const sections = [{
              backColor: '#ffffff',
              foreColor: '#000000',
              notesLayout: 'vertical',
              alignment: 'left',
              backgroundImage: { url: '' },
              title: { en: '', es: '', pt: '', fr: '', de: '' },
              description: { en: normalizedAbout, es: '', pt: '', fr: '', de: '' },
              notes: []
            }];
            normalizedAbout = JSON.stringify(sections, null, 2);
          }
        } catch {
          // It's plain text - migrate to sections format
          const sections = [{
            backColor: '#ffffff',
            foreColor: '#000000',
            notesLayout: 'vertical',
            alignment: 'left',
            backgroundImage: { url: '' },
            title: { en: '', es: '', pt: '', fr: '', de: '' },
            description: { en: normalizedAbout, es: '', pt: '', fr: '', de: '' },
            notes: []
          }];
          normalizedAbout = JSON.stringify(sections, null, 2);
        }
      } else {
        // Empty or null - initialize with empty sections structure (same as texts)
        normalizedAbout = JSON.stringify([createEmptySection()], null, 2);
      }
 
      setFormData(prev => ({
        ...prev,
        ...rest,
        currency: resolvedCurrency,
        texts: normalizedTexts,
        about: normalizedAbout,
        stripeAccountId: sanitizedStripeAccount,
        aiIntegration: incomingAiIntegration,
        // Convert bookingIntegrated from string to boolean
        bookingIntegrated: rest.bookingIntegrated === 'true' || rest.bookingIntegrated === true
      }));
    } catch (err: any) {
      console.error('Failed to load company:', err);
      setError(err.message || 'Failed to load company');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadCompany();
    }
  }, [id, loadCompany]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      // Prepare data - convert empty strings to null for optional fields
      const { motto, mottoDescription, invitation, ...baseFormData } = formData;

      const submitData = {
        ...baseFormData,
        // Convert empty strings to null/undefined for optional fields
        subdomain: normalizedSubdomain || undefined,
        logoUrl: formData.logoUrl && formData.logoUrl.trim() ? formData.logoUrl : undefined,
        faviconUrl: formData.faviconUrl && formData.faviconUrl.trim() ? formData.faviconUrl : undefined,
        country: formData.country && formData.country.trim() ? formData.country : undefined,
        currency: formData.currency && formData.currency.trim() ? formData.currency.trim().toUpperCase() : undefined,
        language: formData.language && formData.language.trim() ? formData.language : undefined,
        about: formData.about && formData.about.trim() ? formData.about : undefined,
        website: websiteDisplay ? websiteDisplay : undefined,
        customCss: formData.customCss && formData.customCss.trim() ? formData.customCss : undefined,
        videoLink: formData.videoLink && formData.videoLink.trim() ? formData.videoLink : undefined,
        bannerLink: formData.bannerLink && formData.bannerLink.trim() ? formData.bannerLink : undefined,
        backgroundLink: formData.backgroundLink && formData.backgroundLink.trim() ? formData.backgroundLink : undefined,
        taxId: formData.taxId && formData.taxId.trim() ? formData.taxId : undefined,
        stripeAccountId: removeStripeAccount
          ? ''
          : formData.stripeAccountId && formData.stripeAccountId.trim()
            ? formData.stripeAccountId.trim()
            : undefined,
        aiIntegration: normalizeAiIntegration(formData.aiIntegration),
        blinkKey: formData.blinkKey && formData.blinkKey.trim() ? formData.blinkKey : undefined,
        texts: formData.texts && formData.texts.trim() ? formData.texts : undefined,
      };

      console.log('[CompanyForm] Submitting data:', {
        id,
        dataKeys: Object.keys(submitData),
        securityDeposit: submitData.securityDeposit,
        currency: submitData.currency,
        textsLength: submitData.texts?.length || 0,
        fullData: submitData
      });

      if (id) {
        await companyService.updateCompany(id, submitData);
        alert('Company updated successfully!');
      } else {
        await companyService.createCompany(submitData);
        alert('Company created successfully!\n\nNext steps:\n1. Set subdomain manually if not set\n2. Add DNS CNAME record (if subdomain set)\n3. Configure custom domain in Azure\n4. Set up SSL certificate');
      }
      navigate('/companies');
    } catch (err: any) {
      console.error('Failed to save company:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error message:', err.message);
      console.error('Full error object:', JSON.stringify(err.response?.data, null, 2));
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.response?.data?.result?.error || err.message || 'Failed to save company';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (name === 'currency') {
      const nextCurrency = value.toUpperCase();
      setFormData(prev => ({
        ...prev,
        currency: nextCurrency
      }));
      return;
    }

    if (name === 'stripeAccountId') {
      setRemoveStripeAccount(false);
      setFormData(prev => ({
        ...prev,
        stripeAccountId: value
      }));
      return;
    }

    if (name === 'country') {
      const nextCountry = value;
      setFormData(prev => {
        const prevSuggested = getCurrencyForCountry(prev.country).toUpperCase();
        const previousCurrency = (prev.currency || '').toUpperCase();
        const shouldUpdateCurrency =
          !previousCurrency || previousCurrency === prevSuggested;
        const nextCurrencyBase = shouldUpdateCurrency
          ? getCurrencyForCountry(nextCountry)
          : (prev.currency || getCurrencyForCountry(nextCountry));

        return {
          ...prev,
          country: nextCountry,
          currency: nextCurrencyBase.toUpperCase()
        };
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const selectedAiIntegration = normalizeAiIntegration(formData.aiIntegration);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <label className="text-sm uppercase tracking-wide text-gray-500">Company Name</label>
              <h1 className="text-3xl font-bold text-gray-900">
                {formData.companyName ? formData.companyName : (id ? 'Unnamed Company' : 'New Company')}
              </h1>
            </div>
          </div>
          <button 
            type="button" 
            onClick={() => navigate('/companies')}
            className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to List
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 bg-white rounded-lg shadow-lg p-8 pb-32">
          {/* Tab Navigation */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`${
                  activeTab === 'basic'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Basic Information
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('design')}
                className={`${
                  activeTab === 'design'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Design
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('content')}
                className={`${
                  activeTab === 'content'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Content
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('texts');
                  // Ensure activeLanguageTab is set to a valid language
                  if (!LANGUAGES.find(l => l.code === activeLanguageTab)) {
                    setActiveLanguageTab('en');
                  }
                }}
                className={`${
                  activeTab === 'texts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Sections
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('business')}
                className={`${
                  activeTab === 'business'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                Business
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`${
                  activeTab === 'ai'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
              >
                AI Integration
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="pt-6">
          {/* Basic Information Tab */}
          {activeTab === 'basic' && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Basic Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  {id ? 'Company Name (changing)' : 'Company Name'} <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName || ''}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Acme Rentals"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                  required
                  placeholder="contact@company.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-2">
                  Subdomain <span className="text-gray-500 text-xs">(Optional - can be set manually)</span>
                </label>
                <div className="flex items-center">
                <input
                  type="text"
                  id="subdomain"
                  name="subdomain"
                  value={formData.subdomain || ''}
                  onChange={handleChange}
                  pattern="[a-z0-9\-]+"
                  placeholder="company"
                  className="w-full px-4 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md text-gray-700">
                    .aegis-rental.com
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Lowercase letters, numbers, and hyphens only. Leave empty to set later.
                </p>
              </div>

              <div className="md:col-span-2">
                <div className="flex flex-col gap-6 sm:flex-row">
                  <div className="flex-1">
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <select
                      id="country"
                      name="country"
                      value={formData.country || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select Country</option>
                      {Object.entries(countriesByContinent).map(([continent, countries]) => (
                        <optgroup key={continent} label={continent}>
                          {countries.map((country) => (
                            <option key={country} value={country}>
                              {country}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
                    <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      id="currency"
                      name="currency"
                      value={(formData.currency || getCurrencyForCountry(formData.country)).toUpperCase()}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      {CURRENCY_OPTIONS.map(option => (
                        <option key={option.code} value={option.code}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-sm text-gray-500">
                      Automatically selects the common currency for the chosen country. Adjust if the company settles in a different currency.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                  Language
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language || 'en'}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="pt">Português</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </div>
          </section>
          )}

          {/* Design Tab */}
          {activeTab === 'design' && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Branding & Design</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primaryColor"
                    name="primaryColor"
                    value={formData.primaryColor}
                    onChange={handleChange}
                    className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                    placeholder="#007bff"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="secondaryColor"
                    name="secondaryColor"
                    value={formData.secondaryColor}
                    onChange={handleChange}
                    className="h-10 w-16 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) => setFormData(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    placeholder="#6c757d"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Logo URL
              </label>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="url"
                    id="logoUrl"
                    name="logoUrl"
                    value={formData.logoUrl || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleMediaUpload('logoUrl', 'image/*')}
                      className="px-3 py-2 text-sm border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50"
                    >
                      Upload
                    </button>
                    {formData.logoUrl && (
                      <button
                        type="button"
                        onClick={() => handleMediaClear('logoUrl')}
                        className="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {formData.logoUrl && (
                  <img src={formData.logoUrl} alt="Logo preview" className="max-w-xs h-20 object-contain border border-gray-300 rounded" />
                )}
              </div>
            </div>

            <div>
              <label htmlFor="faviconUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Favicon URL
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="url"
                  id="faviconUrl"
                  name="faviconUrl"
                  value={formData.faviconUrl || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/favicon.ico"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleMediaUpload('faviconUrl', 'image/*')}
                    className="px-3 py-2 text-sm border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50"
                  >
                    Upload
                  </button>
                  {formData.faviconUrl && (
                    <button
                      type="button"
                      onClick={() => handleMediaClear('faviconUrl')}
                      className="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {formData.faviconUrl && (
                <img src={formData.faviconUrl} alt="Favicon preview" className="mt-2 h-12 w-12 object-contain border border-gray-300 rounded" />
              )}
            </div>

            <div>
              <label htmlFor="bannerLink" className="block text-sm font-medium text-gray-700 mb-2">
                Banner Image URL
              </label>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="url"
                    id="bannerLink"
                    name="bannerLink"
                    value={formData.bannerLink || ''}
                    onChange={handleChange}
                    placeholder="https://example.com/banner.jpg"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleMediaUpload('bannerLink', 'image/*')}
                      className="px-3 py-2 text-sm border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50"
                    >
                      Upload
                    </button>
                    {formData.bannerLink && (
                      <button
                        type="button"
                        onClick={() => handleMediaClear('bannerLink')}
                        className="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {formData.bannerLink && (
                  <img src={formData.bannerLink} alt="Banner preview" className="w-full max-w-2xl h-48 object-cover border border-gray-300 rounded" />
                )}
              </div>
            </div>

            <div>
              <label htmlFor="backgroundLink" className="block text-sm font-medium text-gray-700 mb-2">
                Background Image URL
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="url"
                  id="backgroundLink"
                  name="backgroundLink"
                  value={formData.backgroundLink || ''}
                  onChange={handleChange}
                  placeholder="https://example.com/background.jpg"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleMediaUpload('backgroundLink', 'image/*')}
                    className="px-3 py-2 text-sm border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50"
                  >
                    Upload
                  </button>
                  {formData.backgroundLink && (
                    <button
                      type="button"
                      onClick={() => handleMediaClear('backgroundLink')}
                      className="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {formData.backgroundLink && (
                <img src={formData.backgroundLink} alt="Background preview" className="mt-2 w-full max-w-2xl h-40 object-cover border border-gray-300 rounded" />
              )}
            </div>

            <div>
              <label htmlFor="videoLink" className="block text-sm font-medium text-gray-700 mb-2">
                Video Link
              </label>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="url"
                    id="videoLink"
                    name="videoLink"
                    value={formData.videoLink || ''}
                    onChange={handleChange}
                    placeholder="https://youtube.com/watch?v=..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleMediaUpload('videoLink', 'video/*')}
                      className="px-3 py-2 text-sm border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50"
                    >
                      Upload
                    </button>
                    {formData.videoLink && (
                      <button
                        type="button"
                        onClick={() => handleMediaClear('videoLink')}
                        className="px-3 py-2 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                {formData.videoLink && (
                  <div className="rounded border border-gray-300 p-2">
                    <video
                      controls
                      className="w-full max-w-2xl rounded"
                      src={formData.videoLink}
                    >
                      Your browser does not support embedded videos.
                    </video>
                  </div>
                )}
              </div>
            </div>

          </section>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
          <>
          <section className="space-y-4 pb-32">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-2xl font-bold text-gray-900">Content & Messaging</h2>
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('[CompanyForm] Clear Content button clicked, id:', id);
                  if (!id) {
                    alert('Company ID is missing');
                    return;
                  }
                  if (window.confirm('Are you sure you want to clear all content? This will set the about field to null and the page will show default text.')) {
                    try {
                      console.log('[CompanyForm] Clearing about field for company:', id);
                      const result = await companyService.clearCompanyAbout(id);
                      console.log('[CompanyForm] Clear about result:', result);
                      // Reload company data to get the updated state
                      await loadCompany();
                      alert('About field cleared successfully!');
                    } catch (error: any) {
                      console.error('[CompanyForm] Failed to clear about field:', error);
                      console.error('[CompanyForm] Error details:', {
                        message: error.message,
                        response: error.response?.data,
                        status: error.response?.status,
                        statusText: error.response?.statusText
                      });
                      alert(`Failed to clear about field: ${error.response?.data?.error || error.message || 'Unknown error'}`);
                    }
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
              >
                Clear Content
              </button>
            </div>
            
            <div className="pt-6">
              <LanguageTextEditor
                languageCode={activeLanguageTab}
                value={formData.about || ''}
                onChange={(value) => {
                  setFormData(prev => ({
                    ...prev,
                    about: value
                  }));
                }}
                openFilePicker={triggerFilePicker}
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2 flex flex-col">
                <span>Website URL</span>
                <span className="text-xs text-gray-500">Read-only for now; generated from the subdomain.</span>
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={websiteDisplay}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 focus:outline-none cursor-not-allowed"
              />
              {normalizedSubdomain && (
                <a
                  href={websiteDisplay}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block text-blue-600 hover:text-blue-700 text-sm"
                >
                  {websiteDisplay}
                </a>
              )}
            </div>

            <div>
              <label htmlFor="customCss" className="block text-sm font-medium text-gray-700 mb-2">
                Custom CSS
              </label>
              <textarea
                id="customCss"
                name="customCss"
                value={formData.customCss || ''}
                onChange={handleChange}
                rows={6}
                placeholder="Custom CSS styles..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Advanced: Add custom CSS to override default styles
              </p>
            </div>
          </section>
          </>
          )}
          

          {/* Texts Tab */}
          {activeTab === 'texts' && (
          <>
            <section className="space-y-4 pb-24">
              <div className="pt-6">
                <LanguageTextEditor
                  languageCode={activeLanguageTab}
                  value={formData.texts}
                  onChange={(value) => setFormData(prev => ({ ...prev, texts: value }))}
                  openFilePicker={triggerFilePicker}
                />
              </div>
            </section>
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-30">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex flex-wrap items-center gap-3 justify-center mb-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Translate from:</label>
                    <select
                      value={translateFromLanguage}
                      onChange={(e) => setTranslateFromLanguage(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                      disabled={isTranslating}
                    >
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const currentValue = formData.texts || '';
                      translateSections(
                        currentValue,
                        translateFromLanguage,
                        (translated) => {
                          setFormData(prev => ({ ...prev, texts: translated }));
                        }
                      );
                    }}
                    disabled={isTranslating}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {isTranslating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Translating...
                      </>
                    ) : (
                      <>
                        <span>🌐</span>
                        Translate
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setActiveLanguageTab(lang.code)}
                      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                        activeLanguageTab === lang.code
                          ? 'bg-blue-600 text-white shadow'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">AI Integration</h2>
              <p className="mt-2 text-sm text-gray-600">
                Choose which AI experience this company should present to customers. You can adjust this at any time.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {AI_INTEGRATION_OPTIONS.map(option => {
                const config = AI_PLAN_CONFIG[option];
                const Icon = config.Icon;
                const isSelected = selectedAiIntegration === option;
                const backgroundClass =
                  isSelected && config.gradientClass ? config.gradientClass : 'bg-white';
                const cardClasses = [
                  'relative flex h-full flex-col gap-4 rounded-2xl border p-6 text-left transition-all duration-200',
                  isSelected
                    ? 'shadow-xl ring-2 ring-offset-2 ring-blue-500 border-transparent'
                    : `hover:border-blue-200 hover:shadow-md ${config.borderClass}`,
                  backgroundClass,
                ].join(' ');

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleAiPlanSelect(option)}
                    className={cardClasses}
                  >
                    {config.badge && (
                      <span
                        className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                          config.badgeClass || 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {config.badge}
                      </span>
                    )}

                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full ${
                        isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <div className={`${isSelected && config.gradientClass ? 'text-white' : 'text-gray-900'}`}>
                      <h3 className="text-lg font-semibold">{config.title}</h3>
                      <p className="mt-1 text-sm opacity-80">{config.subtitle}</p>
                    </div>

                    <div className={`${isSelected && config.gradientClass ? 'text-white' : 'text-gray-800'} font-semibold`}>
                      {config.price}
                    </div>

                    <div className={`mt-auto text-sm ${isSelected && config.gradientClass ? 'text-white text-opacity-80' : 'text-gray-500'}`}>
                      {option === 'free' && 'Runs entirely with rule-based logic. Ideal for simple deployments with no external AI costs.'}
                      {option === 'claude' && 'Calls Anthropic Claude for conversational answers. Requires an Anthropic API key in Settings → AI Integration.'}
                      {option === 'premium' && 'Uses GPT-4 with rich voice output. Requires OpenAI credentials and optional TTS setup in Settings.'}
                    </div>

                    {isSelected && (
                      <span className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-blue-400" aria-hidden="true"></span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
              <strong className="font-semibold">Reminder:</strong> AI modes draw on the global keys stored under <span className="font-medium">Settings → AI Integration</span>.
              Ensure the provider you select has valid credentials configured there.
            </div>
          </section>
          )}

          {/* Business Tab */}
          {activeTab === 'business' && (
          <>
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Business Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="taxId" className="block text-sm font-medium text-gray-700 mb-2">
                  Tax ID
                </label>
                <input
                  type="text"
                  id="taxId"
                  name="taxId"
                  value={formData.taxId || ''}
                  onChange={handleChange}
                  placeholder="12-3456789"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="stripeAccountId" className="block text-sm font-medium text-gray-700 mb-2">
                  Stripe Account ID
                </label>
                <input
                  type="text"
                  id="stripeAccountId"
                  name="stripeAccountId"
                  value={formData.stripeAccountId || ''}
                  onChange={handleChange}
                  placeholder="acct_1234567890"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  autoComplete="off"
                />
                {hasStoredStripeAccount ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-500">
                      A Stripe account is already stored securely. Leave this field blank to keep it, enter a new ID to
                      replace it, or check the box below to remove it.
                    </p>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={removeStripeAccount}
                        onChange={(e) => {
                          setRemoveStripeAccount(e.target.checked);
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, stripeAccountId: '' }));
                          }
                        }}
                      />
                      Remove stored Stripe account ID on save
                    </label>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-gray-500">
                    Paste the Stripe connected account ID (e.g., acct_123…) to link payouts. The value will be hidden after
                    saving.
                  </p>
                )}
              </div>

            </div>

            <div className="mt-6">
              <label htmlFor="blinkKey" className="block text-sm font-medium text-gray-700 mb-2">
                BlinkID License Key
              </label>
              <textarea
                id="blinkKey"
                name="blinkKey"
                value={formData.blinkKey || ''}
                onChange={handleChange}
                rows={3}
                placeholder="Enter BlinkID license key for this company domain"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Domain-specific BlinkID license key for driver license scanning
              </p>
            </div>
          </section>

          {/* Settings */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Settings</h2>
            
            <div className="space-y-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="bookingIntegrated"
                  checked={formData.bookingIntegrated || false}
                  onChange={handleChange}
                  className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Booking Integrated</span>
              </label>

              {id && (
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive !== undefined ? formData.isActive : true}
                    onChange={handleChange}
                    className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Active              </span>
                </label>
              )}
            </div>
          </section>
          </>
          )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button 
              type="button" 
              onClick={() => navigate('/companies')}
              className="flex items-center gap-2 bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition"
              disabled={saving}
            >
              <X className="h-5 w-5" />
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving}
            >
              <Save className="h-5 w-5" />
              {saving ? 'Saving...' : (id ? 'Update Company' : 'Create Company')}
            </button>
          </div>
        </form>
        
        {/* Language Bar for Content Tab - Outside form to ensure visibility */}
        {activeTab === 'content' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex flex-wrap items-center gap-3 justify-center mb-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Translate from:</label>
                  <select
                    value={translateFromLanguage}
                    onChange={(e) => setTranslateFromLanguage(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    disabled={isTranslating}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentValue = formData.about || '';
                    translateSections(
                      currentValue,
                      translateFromLanguage,
                      (translated) => {
                        setFormData(prev => ({ ...prev, about: translated }));
                      }
                    );
                  }}
                  disabled={isTranslating || translateFromLanguage === activeLanguageTab}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isTranslating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Translating...
                    </>
                  ) : (
                    <>
                      <span>🌐</span>
                      Translate
                    </>
                  )}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setActiveLanguageTab(lang.code)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                      activeLanguageTab === lang.code
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CompanyForm;


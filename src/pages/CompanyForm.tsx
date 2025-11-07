import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import companyService from '../services/companyService';
import { Company } from '../services/companyService';
import { Building2, ArrowLeft, Save, X } from 'lucide-react';
import Layout from '../components/Layout';

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
interface SectionNotePicture {
  url: string;
}

interface SectionNote {
  picture: SectionNotePicture;
  caption: string;
  symbolForeColor: string;
  symbol: string;
  text: string;
  foreColor: string;
  backColor: string;
}

interface LanguageSection {
  title: string;
  description: string;
  backColor: string;
  foreColor: string;
  notesLayout: 'vertical' | 'horizontal';
  notes: SectionNote[];
}

interface LanguageText {
  language: string;
  sections: LanguageSection[];
}

const createEmptyNote = (): SectionNote => ({
  picture: { url: '' },
  caption: '',
  symbolForeColor: '#1f2937',
  symbol: '',
  text: '',
  foreColor: '',
  backColor: ''
});

const createEmptySection = (): LanguageSection => ({
  title: '',
  description: '',
  backColor: '#ffffff',
  foreColor: '#000000',
  notesLayout: 'vertical',
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

// Parse JSON string to array, or initialize with default structure
const parseTexts = (jsonString?: string): LanguageText[] => {
  if (!jsonString || jsonString.trim() === '') {
    // Return default structure with all languages
    return LANGUAGES.map(lang => ({
      language: lang.code,
      sections: [createEmptySection()]
    })) as LanguageText[];
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
      const texts: LanguageText[] = parsed.map((item: any) => {
        // Backwards compatibility: if title/description exist directly, wrap into sections array
        if (item && Array.isArray(item.sections)) {
          const sections = item.sections.map((section: any): LanguageSection => ({
            title: section?.title ?? '',
            description: section?.description ?? '',
            backColor: section?.backColor ?? '#ffffff',
            foreColor: section?.foreColor ?? '#000000',
            notesLayout: section?.notesLayout === 'horizontal' ? 'horizontal' : 'vertical',
            notes: Array.isArray(section?.notes) && section.notes.length > 0
              ? section.notes.map((note: any): SectionNote => ({
                  picture: normalizePicture(note?.picture ?? note?.picturePng ?? ''),
                  caption: note?.caption ?? '',
                  symbolForeColor: note?.symbolForeColor ?? '#1f2937',
                  symbol: note?.symbol ?? '',
                  text: note?.text ?? '',
                  foreColor: note?.foreColor ?? '',
                  backColor: note?.backColor ?? ''
                }))
              : [createEmptyNote()]
          }));
          return {
            language: item.language ?? 'en',
            sections: sections.length > 0 ? sections : [createEmptySection()]
          };
        }

        return {
          language: item?.language ?? 'en',
          sections: [
            {
              title: item?.title ?? '',
              description: item?.description ?? '',
              backColor: item?.backColor ?? '#ffffff',
              foreColor: item?.foreColor ?? '#000000',
            notesLayout: item?.notesLayout === 'horizontal' ? 'horizontal' : 'vertical',
              notes: [
                {
                  ...createEmptyNote(),
                  picture: normalizePicture(item?.picture ?? item?.picturePng ?? ''),
                  caption: item?.caption ?? '',
                  symbolForeColor: item?.symbolForeColor ?? '#1f2937',
                  symbol: item?.symbol ?? '',
                  text: item?.text ?? '',
                  foreColor: item?.foreColor ?? '',
                  backColor: item?.backColor ?? ''
                }
              ]
            }
          ]
        };
      });

      // Ensure all languages are present
      const existingLanguages = texts.map((item) => item.language);
      LANGUAGES.forEach(lang => {
        if (!existingLanguages.includes(lang.code)) {
          texts.push({
            language: lang.code,
            sections: [createEmptySection()]
          });
        }
      });

      return texts;
    }
    // If not an array, return default
    return LANGUAGES.map(lang => ({
      language: lang.code,
      sections: [createEmptySection()]
    }));
  } catch (e) {
    console.error('Failed to parse texts JSON:', e);
    // Return default structure on parse error
    return LANGUAGES.map(lang => ({
      language: lang.code,
      sections: [createEmptySection()]
    }));
  }
};

// LanguageTextEditor Component - Shows one language at a time
interface LanguageTextEditorProps {
  languageCode: string;
  value?: string;
  onChange: (value: string) => void;
}

const LanguageTextEditor: React.FC<LanguageTextEditorProps> = ({ languageCode, value, onChange }) => {
  const [texts, setTexts] = useState<LanguageText[]>(() => parseTexts(value));
  // Update local state when value prop or languageCode changes
  useEffect(() => {
    setTexts(parseTexts(value));
  }, [value, languageCode]);

  // Get current language data
  // Language code comes from active tab selection and is not editable
  const currentLang = LANGUAGES.find(l => l.code === languageCode) || LANGUAGES[0];
  const textData = texts.find(t => t.language === languageCode) || {
    language: languageCode, // Always use languageCode from props (read-only)
    sections: [createEmptySection()]
  };

  const handleSectionsUpdate = (sections: LanguageSection[]) => {
    const updated = texts.map(item =>
      item.language === languageCode
        ? { ...item, language: languageCode, sections }
        : item
    );

    // Ensure the current language exists (using languageCode from props)
    const currentLangExists = updated.some(item => item.language === languageCode);
    if (!currentLangExists) {
      updated.push({
        language: languageCode, // Use languageCode from props, not from data
        sections: sections.length > 0 ? sections : [createEmptySection()]
      });
    }
    
    // Ensure all languages are present (using language codes from LANGUAGES constant)
    const existingLanguages = updated.map(item => item.language);
    LANGUAGES.forEach(lang => {
      if (!existingLanguages.includes(lang.code)) {
        updated.push({
          language: lang.code, // Use language code from constant, not editable
          sections: [createEmptySection()]
        });
      }
    });
    
    setTexts(updated);
    
    // Convert back to JSON string and notify parent
    try {
      const jsonString = JSON.stringify(updated, null, 2);
      onChange(jsonString);
    } catch (e) {
      console.error('Failed to stringify texts:', e);
    }
  };

  const handleSectionChange = (index: number, field: 'title' | 'description', value: string) => {
    const sections = [...textData.sections];
    sections[index] = {
      ...sections[index],
      [field]: value
    };
    handleSectionsUpdate(sections);
  };

  const handleSectionColorChange = (index: number, field: 'backColor' | 'foreColor', value: string) => {
    const sections = [...textData.sections];
    sections[index] = {
      ...sections[index],
      [field]: value
    };
    handleSectionsUpdate(sections);
  };

  const handleSectionLayoutChange = (index: number, value: 'vertical' | 'horizontal') => {
    const sections = [...textData.sections];
    sections[index] = {
      ...sections[index],
      notesLayout: value
    };
    handleSectionsUpdate(sections);
  };

  const handleAddSection = () => {
    const sections = [...textData.sections, createEmptySection()];
    handleSectionsUpdate(sections);
  };

  const handleRemoveSection = (index: number) => {
    const sections = textData.sections.filter((_, i) => i !== index);
    handleSectionsUpdate(sections.length > 0 ? sections : [createEmptySection()]);
  };

  const handleNoteChange = (
    sectionIndex: number,
    noteIndex: number,
    field: 'symbol' | 'symbolForeColor' | 'text' | 'foreColor' | 'backColor' | 'caption',
    value: string
  ) => {
    const sections = textData.sections.map((section, idx) => {
      if (idx !== sectionIndex) return section;
      const notes = section.notes.map((note, nIdx) =>
        nIdx === noteIndex ? { ...note, [field]: value } : note
      );
      return { ...section, notes };
    });
    handleSectionsUpdate(sections);
  };

  const handlePictureChange = (sectionIndex: number, noteIndex: number, value: string) => {
    const sections = textData.sections.map((section, idx) => {
      if (idx !== sectionIndex) return section;
      const notes = section.notes.map((note, nIdx) =>
        nIdx === noteIndex ? { ...note, picture: { url: value } } : note
      );
      return { ...section, notes };
    });
    handleSectionsUpdate(sections);
  };

  const handleAddNote = (sectionIndex: number) => {
    const sections = textData.sections.map((section, idx) => {
      if (idx !== sectionIndex) return section;
      return {
        ...section,
        notes: [...section.notes, createEmptyNote()]
      };
    });
    handleSectionsUpdate(sections);
  };

  const handleRemoveNote = (sectionIndex: number, noteIndex: number) => {
    const sections = textData.sections.map((section, idx) => {
      if (idx !== sectionIndex) return section;
      const notes = section.notes.filter((_, nIdx) => nIdx !== noteIndex);
      return {
        ...section,
        notes: notes.length > 0 ? notes : [createEmptyNote()]
      };
    });
    handleSectionsUpdate(sections);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-xl font-semibold text-gray-800">
        <span className="text-2xl">{currentLang.flag}</span>
        <span>{currentLang.name}</span>
      </div>

      <div className="space-y-6">
        {textData.sections.map((section, index) => (
          <div key={`${languageCode}-section-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-700">Section {index + 1}</h4>
              <button
                type="button"
                onClick={() => handleRemoveSection(index)}
                className="text-sm text-red-600 hover:text-red-700 disabled:text-gray-400"
                disabled={textData.sections.length === 1}
              >
                Delete
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                  placeholder={`Enter section title in ${currentLang.name}`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={section.description}
                  onChange={(e) => handleSectionChange(index, 'description', e.target.value)}
                  placeholder={`Enter section description in ${currentLang.name}`}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section Background Color</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Section Foreground Color</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes Layout</label>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name={`notes-layout-${languageCode}-${index}`}
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
                      name={`notes-layout-${languageCode}-${index}`}
                      value="horizontal"
                      checked={section.notesLayout === 'horizontal'}
                      onChange={() => handleSectionLayoutChange(index, 'horizontal')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Horizontal</span>
                  </label>
                </div>
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

                {section.notes.map((note, noteIdx) => (
                  <div key={`${languageCode}-section-${index}-note-${noteIdx}`} className="border border-gray-200 rounded-md p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Note {noteIdx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNote(index, noteIdx)}
                        className="text-xs text-red-600 hover:text-red-700 disabled:text-gray-400"
                        disabled={section.notes.length === 1}
                      >
                        Delete
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Picture URL</label>
                        <input
                          type="text"
                          value={note.picture?.url || ''}
                          onChange={(e) => handlePictureChange(index, noteIdx, e.target.value)}
                          placeholder="https://example.com/image.png"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Symbol</label>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
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
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                              <option value="">Select an icon…</option>
                              {SVG_ICON_OPTIONS.map(option => (
                                <option key={option.label} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Custom SVG (optional)</label>
                            <textarea
                              value={note.symbol}
                              onChange={(e) => handleNoteChange(index, noteIdx, 'symbol', e.target.value)}
                              placeholder="Paste SVG markup if you need a custom icon"
                              rows={3}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Symbol Foreground Color</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={note.symbolForeColor && /^#([0-9A-Fa-f]{6})$/.test(note.symbolForeColor) ? note.symbolForeColor : '#1f2937'}
                                onChange={(e) => handleNoteChange(index, noteIdx, 'symbolForeColor', e.target.value)}
                                className="h-10 w-12 border border-gray-300 rounded"
                              />
                              <input
                                type="text"
                                value={note.symbolForeColor}
                                onChange={(e) => handleNoteChange(index, noteIdx, 'symbolForeColor', e.target.value)}
                                placeholder="#1F2937"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                              />
                            </div>
                          </div>

                          <label className="block text-xs font-medium text-gray-600 mb-1">Caption</label>
                          <input
                            type="text"
                            value={note.caption}
                            onChange={(e) => handleNoteChange(index, noteIdx, 'caption', e.target.value)}
                            placeholder="Short caption for this note"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Text</label>
                        <textarea
                          value={note.text}
                          onChange={(e) => handleNoteChange(index, noteIdx, 'text', e.target.value)}
                          placeholder="Enter note text"
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fore Color</label>
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

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
  const [activeTab, setActiveTab] = useState<'basic' | 'design' | 'content' | 'texts' | 'business'>('basic');
  const [activeLanguageTab, setActiveLanguageTab] = useState<string>('en');
  
  const [formData, setFormData] = useState<Partial<Company>>({
    companyName: '',
    email: '',
    subdomain: undefined, // Optional - can be set manually
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    logoUrl: '',
    faviconUrl: '',
    country: '',
    language: 'en',
    motto: '',
    mottoDescription: '',
    about: '',
    website: '',
    customCss: '',
    videoLink: '',
    bannerLink: '',
    backgroundLink: '',
    invitation: '',
    bookingIntegrated: false,
    taxId: '',
    stripeAccountId: '',
    blinkKey: '',
    texts: undefined,
    isActive: true
  });

  const loadCompany = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await companyService.getCompanyById(id!);
      setFormData(data);
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
      const submitData = {
        ...formData,
        // Convert empty strings to null/undefined for optional fields
        subdomain: formData.subdomain && formData.subdomain.trim() ? formData.subdomain.trim().toLowerCase() : undefined,
        logoUrl: formData.logoUrl && formData.logoUrl.trim() ? formData.logoUrl : undefined,
        faviconUrl: formData.faviconUrl && formData.faviconUrl.trim() ? formData.faviconUrl : undefined,
        country: formData.country && formData.country.trim() ? formData.country : undefined,
        language: formData.language && formData.language.trim() ? formData.language : undefined,
        motto: formData.motto && formData.motto.trim() ? formData.motto : undefined,
        mottoDescription: formData.mottoDescription && formData.mottoDescription.trim() ? formData.mottoDescription : undefined,
        about: formData.about && formData.about.trim() ? formData.about : undefined,
        website: formData.website && formData.website.trim() ? formData.website : undefined,
        customCss: formData.customCss && formData.customCss.trim() ? formData.customCss : undefined,
        videoLink: formData.videoLink && formData.videoLink.trim() ? formData.videoLink : undefined,
        bannerLink: formData.bannerLink && formData.bannerLink.trim() ? formData.bannerLink : undefined,
        backgroundLink: formData.backgroundLink && formData.backgroundLink.trim() ? formData.backgroundLink : undefined,
        invitation: formData.invitation && formData.invitation.trim() ? formData.invitation : undefined,
        taxId: formData.taxId && formData.taxId.trim() ? formData.taxId : undefined,
        stripeAccountId: formData.stripeAccountId && formData.stripeAccountId.trim() ? formData.stripeAccountId : undefined,
        blinkKey: formData.blinkKey && formData.blinkKey.trim() ? formData.blinkKey : undefined,
        texts: formData.texts && formData.texts.trim() ? formData.texts : undefined,
      };

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
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to save company';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

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
            <h1 className="text-3xl font-bold text-gray-900">
              {id ? 'Edit Company' : 'Create New Company'}
            </h1>
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

        <form onSubmit={handleSubmit} className="space-y-8 bg-white rounded-lg shadow-lg p-8">
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
                  Company Name <span className="text-red-600">*</span>
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
                  pattern="[a-z0-9-]+"
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

              <div>
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
              <input
                type="url"
                id="logoUrl"
                name="logoUrl"
                value={formData.logoUrl || ''}
                onChange={handleChange}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.logoUrl && (
                <img src={formData.logoUrl} alt="Logo preview" className="mt-2 max-w-xs h-20 object-contain border border-gray-300 rounded" />
              )}
            </div>

            <div>
              <label htmlFor="faviconUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Favicon URL
              </label>
              <input
                type="url"
                id="faviconUrl"
                name="faviconUrl"
                value={formData.faviconUrl || ''}
                onChange={handleChange}
                placeholder="https://example.com/favicon.ico"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="bannerLink" className="block text-sm font-medium text-gray-700 mb-2">
                Banner Image URL
              </label>
              <input
                type="url"
                id="bannerLink"
                name="bannerLink"
                value={formData.bannerLink || ''}
                onChange={handleChange}
                placeholder="https://example.com/banner.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {formData.bannerLink && (
                <img src={formData.bannerLink} alt="Banner preview" className="mt-2 w-full max-w-2xl h-48 object-cover border border-gray-300 rounded" />
              )}
            </div>

            <div>
              <label htmlFor="backgroundLink" className="block text-sm font-medium text-gray-700 mb-2">
                Background Image URL
              </label>
              <input
                type="url"
                id="backgroundLink"
                name="backgroundLink"
                value={formData.backgroundLink || ''}
                onChange={handleChange}
                placeholder="https://example.com/background.jpg"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="videoLink" className="block text-sm font-medium text-gray-700 mb-2">
                Video Link
              </label>
              <input
                type="url"
                id="videoLink"
                name="videoLink"
                value={formData.videoLink || ''}
                onChange={handleChange}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

          </section>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">Content & Messaging</h2>
            
            <div>
              <label htmlFor="motto" className="block text-sm font-medium text-gray-700 mb-2">
                Motto
              </label>
              <input
                type="text"
                id="motto"
                name="motto"
                value={formData.motto || ''}
                onChange={handleChange}
                placeholder="e.g., Your Trusted Rental Partner"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="mottoDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Motto Description
              </label>
              <textarea
                id="mottoDescription"
                name="mottoDescription"
                value={formData.mottoDescription || ''}
                onChange={handleChange}
                rows={2}
                placeholder="e.g., Providing quality rental services since 2024"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="invitation" className="block text-sm font-medium text-gray-700 mb-2">
                Invitation Text
              </label>
              <input
                type="text"
                id="invitation"
                name="invitation"
                value={formData.invitation || ''}
                onChange={handleChange}
                placeholder="e.g., Find & Book a Great Deal Today"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="about" className="block text-sm font-medium text-gray-700 mb-2">
                About
              </label>
              <textarea
                id="about"
                name="about"
                value={formData.about || ''}
                onChange={handleChange}
                rows={4}
                placeholder="Company description..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                Website URL
              </label>
              <input
                type="url"
                id="website"
                name="website"
                value={formData.website || ''}
                onChange={handleChange}
                placeholder="https://company.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
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
          )}

          {/* Texts Tab */}
          {activeTab === 'texts' && (
          <section className="space-y-4">
            
            {/* Language Sub-Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4" aria-label="Language Tabs">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setActiveLanguageTab(lang.code)}
                    className={`${
                      activeLanguageTab === lang.code
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-3 px-3 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Language Content */}
            <div className="pt-6">
              <LanguageTextEditor
                languageCode={activeLanguageTab}
                value={formData.texts}
                onChange={(value) => setFormData(prev => ({ ...prev, texts: value }))}
              />
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
                />
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
      </div>
    </Layout>
  );
};

export default CompanyForm;


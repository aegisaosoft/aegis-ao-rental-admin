# CLAUDE.md — aegis-ao-rental-admin

React 19 + TypeScript admin SPA для управления автопарком.
Backend proxy: `https://aegis-ao-rental-h4hda5gmengyhyc9.canadacentral-01.azurewebsites.net`
Azure Blob для картинок: `https://aegisaorentalstorage.blob.core.windows.net/models/MAKE_MODEL.png`

## Стек

- React 19, TypeScript, Create React App (порт 4000)
- TanStack Table v8, TanStack Query v5
- Tailwind CSS — только Tailwind классы, без inline стилей
- lucide-react — только для иконок
- react-toastify — только для уведомлений
- axios через `src/services/api.ts` — единственная точка HTTP вызовов

## Структура

```
src/
  pages/
    Vehicles.tsx        ← главная страница машин, ЗДЕСЬ основная работа
    Dashboard.tsx
    CompanyList.tsx
    ...
  components/
    Layout.tsx          ← НЕ МЕНЯТЬ
    ConfirmDialog.tsx
    CarImageSearchPanel.tsx  ← СОЗДАТЬ
  services/
    api.ts              ← НЕ МЕНЯТЬ (axios instance + interceptors + auth)
    apiService.ts       ← добавлять новые методы сюда
  context/
    AuthContext.tsx     ← НЕ МЕНЯТЬ
```

## Правила

- HTTP запросы ТОЛЬКО через `apiService` → `api.ts`
- НЕ добавлять npm пакеты
- TypeScript — типизировать всё явно
- async/await + try/catch + `toast.error(...)` для всех ошибок
- Компоненты — только функциональные с hooks

## Паттерн добавления API метода

```typescript
// в src/services/apiService.ts — добавлять в класс ApiService:
async searchCarImages(make: string, model: string, year?: number): Promise<CarImageSearchResult[]> {
  const params = new URLSearchParams({ make, model });
  if (year) params.append('year', year.toString());
  const response = await api.get(`/car-images/search?${params}`);
  return response.data.result || response.data || [];
}

async processAndUploadCarImage(payload: {
  make: string;
  model: string;
  sourceImageUrl: string;
}): Promise<{ blobUrl: string }> {
  const response = await api.post('/car-images/process', payload);
  return response.data.result || response.data;
}
```

Добавить интерфейсы рядом с существующими (`ModelItem` и др.):
```typescript
export interface CarImageSearchResult {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  source: string;
}
```

## Задача: добавить поиск и загрузку картинок

### Что нужно сделать

**1. `src/services/apiService.ts`** — добавить методы `searchCarImages` и `processAndUploadCarImage` (см. паттерн выше).

**2. `src/components/CarImageSearchPanel.tsx`** — создать новый компонент.

Props:
```typescript
interface CarImageSearchPanelProps {
  make: string;      // напр. "TOYOTA"
  model: string;     // напр. "CAMRY"
  years: number[];   // напр. [2024, 2023, 2022]
  onClose: () => void;
  onUploaded: (blobUrl: string) => void;
}
```

State:
```typescript
const [selectedYear, setSelectedYear] = useState(years[0]);
const [images, setImages] = useState<CarImageSearchResult[]>([]);
const [searching, setSearching] = useState(false);
const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
const [uploading, setUploading] = useState(false);
```

Поведение:
- При монтировании и при смене `selectedYear` — вызывать `apiService.searchCarImages(make, model, selectedYear)`
- Кнопка "Process & Upload" вызывает `apiService.processAndUploadCarImage(...)`, затем `toast.success(...)` и `onUploaded(blobUrl)`
- При ошибке — `toast.error(...)`

Layout — slide-over панель 480px справа:
```tsx
<div className="fixed inset-0 z-50 flex justify-end">
  {/* затемнение */}
  <div className="absolute inset-0 bg-black/40" onClick={onClose} />
  {/* панель */}
  <div className="relative w-[480px] h-full bg-white shadow-xl flex flex-col">
    {/* header: "TOYOTA CAMRY" + кнопка X */}
    {/* фильтр: кнопки годов [2024] [2023] [2022] */}
    {/* тело: grid 2 колонки — фото, при выборе ring-2 ring-blue-500 */}
    {/* footer: кнопки Cancel и Process & Upload */}
  </div>
</div>
```

Состояния UI:
- `searching === true` → spinner по центру
- `images.length === 0 && !searching` → "No images found"
- фото выбрано → рамка `ring-2 ring-blue-500`
- `uploading === true` → кнопка "Process & Upload" disabled + Loader2 spinner

**3. `src/pages/Vehicles.tsx`** — минимальные изменения:

Добавить import:
```typescript
import CarImageSearchPanel from '../components/CarImageSearchPanel';
// и добавить Search к существующим lucide-react импортам
```

Добавить state:
```typescript
const [showImageSearch, setShowImageSearch] = useState(false);
```

Добавить кнопку рядом с существующей кнопкой "Re-check images" в блоке Header:
```tsx
{selectedKeys.size === 1 && (() => {
  const selectedRow = filteredRows.find(r => selectedKeys.has(r.key));
  return selectedRow ? (
    <button
      onClick={() => setShowImageSearch(true)}
      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
    >
      <Search className="h-4 w-4" />
      Find Image
    </button>
  ) : null;
})()}
```

Добавить панель перед закрывающим `</Layout>`:
```tsx
{showImageSearch && (() => {
  const selectedRow = filteredRows.find(r => selectedKeys.has(r.key))!;
  return (
    <CarImageSearchPanel
      make={selectedRow.make}
      model={selectedRow.modelName}
      years={selectedRow.years}
      onClose={() => setShowImageSearch(false)}
      onUploaded={(blobUrl) => {
        setRows(prev => prev.map(r =>
          r.key === selectedRow.key
            ? { ...r, imageExists: true, blobUrl }
            : r
        ));
        setShowImageSearch(false);
        setSelectedKeys(new Set());
      }}
    />
  );
})()}
```

## Backend контракт (справочно)

GET `/api/car-images/search?make=TOYOTA&model=CAMRY&year=2023`
```json
[{ "id": "uuid", "thumbnailUrl": "https://...", "fullUrl": "https://...", "source": "cars.com" }]
```

POST `/api/car-images/process`
```json
// request: { "make": "TOYOTA", "model": "CAMRY", "sourceImageUrl": "https://..." }
// response: { "blobUrl": "https://aegisaorentalstorage.blob.core.windows.net/models/TOYOTA_CAMRY.png" }
```

## Команды

```bash
npm start     # dev server на порту 4000
npm run build # production build
```

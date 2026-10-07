import { Student } from '../types/homeroom';

// Standard Vietnamese collator using vi-VN locale for exact alphabet ordering
const viCollator = new Intl.Collator('vi-VN', {
  numeric: true,
  sensitivity: 'variant'
});

/**
 * Splits a full name into Tên (given name - last word) and Họ + Tên đệm (family & middle name)
 * Normalizes Unicode to NFC to prevent discrepancies between precomposed and decomposed diacritics
 */
export function getVietnameseNameParts(fullName: string): { givenName: string; middleAndFamily: string } {
  const trimmed = (fullName || '').trim().normalize('NFC');
  if (!trimmed) return { givenName: '', middleAndFamily: '' };
  
  const parts = trimmed.split(/\s+/);
  const givenName = parts[parts.length - 1]; // Given name (từ cuối cùng của họ tên)
  const middleAndFamily = parts.slice(0, parts.length - 1).join(' '); // Họ và tên đệm
  
  return { givenName, middleAndFamily };
}

export type StudentSortMode = 'default' | 'name_asc' | 'name_desc' | 'code_asc' | 'code_desc';

export function getSortModeLabel(mode: StudentSortMode): string {
  switch (mode) {
    case 'name_asc':
      return 'Tên A–Z';
    case 'name_desc':
      return 'Tên Z–A';
    case 'code_asc':
      return 'Mã học sinh A–Z';
    case 'code_desc':
      return 'Mã học sinh Z–A';
    default:
      return 'Mặc định';
  }
}

/**
 * Sorts students list according to specified mode:
 * - 'default': Preserves original database order without reordering
 * - 'name_asc' / 'name_desc': Sorts by Vietnamese Given Name (Tên - last word),
 *   then by Family & Middle Name (Họ và tên đệm), then Full name, then Code.
 * - 'code_asc' / 'code_desc': Sorts by student code
 * 
 * Note: Does not mutate the input array; returns a new sorted array.
 * Does not alter student properties or IDs.
 */
export function sortStudentsByVietnameseName(
  studentsList: Student[],
  mode: StudentSortMode
): Student[] {
  if (mode === 'default') {
    if (studentsList.some(s => s.stt !== undefined && s.stt !== null)) {
      return [...studentsList].sort((a, b) => {
        const sttA = Number(a.stt) || 999999;
        const sttB = Number(b.stt) || 999999;
        return sttA - sttB;
      });
    }
    return studentsList;
  }

  if (mode === 'code_asc' || mode === 'code_desc') {
    return [...studentsList].sort((a, b) => {
      const codeA = (a.code || '').trim();
      const codeB = (b.code || '').trim();
      const comp = codeA.localeCompare(codeB, 'vi-VN', { numeric: true });
      if (comp !== 0) return mode === 'code_asc' ? comp : -comp;
      return 0;
    });
  }

  return [...studentsList].sort((a, b) => {
    const nameStrA = a.full_name || a.name || '';
    const nameStrB = b.full_name || b.name || '';
    const partsA = getVietnameseNameParts(nameStrA);
    const partsB = getVietnameseNameParts(nameStrB);

    // Ưu tiên 1: TÊN (từ cuối cùng của họ tên)
    let comp = viCollator.compare(partsA.givenName, partsB.givenName);
    
    // Ưu tiên 2: HỌ VÀ TÊN ĐỆM nếu Tên trùng nhau
    if (comp === 0) {
      comp = viCollator.compare(partsA.middleAndFamily, partsB.middleAndFamily);
    }

    // Ưu tiên 3: Toàn bộ họ tên
    if (comp === 0) {
      const normA = nameStrA.trim().normalize('NFC');
      const normB = nameStrB.trim().normalize('NFC');
      comp = viCollator.compare(normA, normB);
    }

    // Ưu tiên 4: STT
    if (comp === 0 && a.stt !== undefined && b.stt !== undefined) {
      comp = (Number(a.stt) || 0) - (Number(b.stt) || 0);
    }

    // Ưu tiên 5: Mã học sinh (đảm bảo tính ổn định tuyệt đối)
    if (comp === 0) {
      const codeA = (a.code || '').trim();
      const codeB = (b.code || '').trim();
      comp = codeA.localeCompare(codeB, 'vi-VN', { numeric: true });
    }

    return mode === 'name_asc' ? comp : -comp;
  });
}


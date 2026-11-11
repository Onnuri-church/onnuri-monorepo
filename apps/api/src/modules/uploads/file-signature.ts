// 업로드 파일의 실제 내용(앞부분 바이트)이 앱이 말한 형식과 맞는지 본다 (SCRUM-173).
// Content-Type은 보내는 쪽이 마음대로 적을 수 있어서, 확장자·형식만 바꾼 다른 파일
// (실행 파일, HTML 등)이 사진인 척 공개 저장소에 올라가는 걸 막으려면 내용을 직접 봐야 한다.
// 외부 라이브러리 없이 각 형식의 고정 시그니처(매직 넘버)만 확인한다.

const ascii = (buffer: Buffer, start: number, end: number) =>
  buffer.subarray(start, end).toString('latin1');

const startsWith = (buffer: Buffer, bytes: number[]) =>
  buffer.length >= bytes.length && bytes.every((byte, i) => buffer[i] === byte);

// ISO 미디어 파일(mp4·mov·3gp·heic)은 4~8바이트에 상자 이름이 온다. 보통 'ftyp'이고,
// 오래된 mov는 다른 상자로 시작하기도 한다.
const boxType = (buffer: Buffer) =>
  buffer.length >= 12 ? ascii(buffer, 4, 8) : '';
const ftypBrand = (buffer: Buffer) =>
  boxType(buffer) === 'ftyp' ? ascii(buffer, 8, 12) : '';

const HEIF_BRANDS = new Set([
  'heic',
  'heix',
  'hevc',
  'hevx',
  'heim',
  'heis',
  'mif1',
  'msf1',
]);
const QUICKTIME_LEADING_BOXES = new Set([
  'ftyp',
  'moov',
  'mdat',
  'wide',
  'free',
  'skip',
  'pnot',
]);

const isJpeg = (b: Buffer) => startsWith(b, [0xff, 0xd8, 0xff]);
const isPng = (b: Buffer) =>
  startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const isGif = (b: Buffer) => ['GIF87a', 'GIF89a'].includes(ascii(b, 0, 6));
const isWebp = (b: Buffer) =>
  ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP';
const isHeif = (b: Buffer) => HEIF_BRANDS.has(ftypBrand(b));
// 폰마다 mp4/mov/3gp 표기가 섞여 들어와서 동영상끼리는 브랜드를 따지지 않는다 — 사진(heic)만 아니면 된다.
const isIsoVideo = (b: Buffer) => ftypBrand(b) !== '' && !isHeif(b);
const isQuicktime = (b: Buffer) =>
  isIsoVideo(b) ||
  (b.length >= 12 &&
    QUICKTIME_LEADING_BOXES.has(boxType(b)) &&
    boxType(b) !== 'ftyp');
const isWebm = (b: Buffer) => startsWith(b, [0x1a, 0x45, 0xdf, 0xa3]);
const isPdf = (b: Buffer) => ascii(b, 0, 5) === '%PDF-';
// 옛 오피스(doc·xls·ppt)와 한글(hwp 5.0)은 OLE 복합 문서, 새 오피스(docx·xlsx·pptx)는 zip이다.
const isOle = (b: Buffer) =>
  startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const isZip = (b: Buffer) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]);
// 텍스트는 시그니처가 없다 — 앞부분에 NUL 바이트가 없으면 글자 파일로 본다 (EUC-KR 등도 통과).
const isText = (b: Buffer) => !b.subarray(0, 8192).includes(0);

const CHECKS: Record<string, (buffer: Buffer) => boolean> = {
  'image/jpeg': isJpeg,
  'image/png': isPng,
  'image/webp': isWebp,
  'image/gif': isGif,
  'image/heic': isHeif,
  'video/mp4': isIsoVideo,
  'video/quicktime': isQuicktime,
  'video/3gpp': isIsoVideo,
  'video/webm': isWebm,
  'application/pdf': isPdf,
  'application/msword': isOle,
  'application/vnd.ms-excel': isOle,
  'application/vnd.ms-powerpoint': isOle,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    isZip,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': isZip,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    isZip,
  'application/x-hwp': isOle,
  'application/haansofthwp': isOle,
  'application/vnd.hancom.hwp': isOle,
  'text/plain': isText,
};

/** 파일 내용이 그 형식의 시그니처와 맞으면 true. 검사 규칙이 없는 형식은 false (받지 않는다). */
export function matchesFileSignature(
  mimetype: string,
  buffer: Buffer,
): boolean {
  const check = CHECKS[mimetype];
  return check ? buffer.length > 0 && check(buffer) : false;
}

const IMAGE_TYPES: [string, (buffer: Buffer) => boolean][] = [
  ['image/jpeg', isJpeg],
  ['image/png', isPng],
  ['image/webp', isWebp],
  ['image/gif', isGif],
  ['image/heic', isHeif],
];

/**
 * 사진은 내용으로 실제 형식을 알아낸다 — 앱·폰이 png를 image/jpeg로 보내는 식의 표기 차이는
 * 흔해서, 사진끼리는 표기가 달라도 받고 저장 확장자는 실제 형식을 따른다. 사진이 아니면 null.
 */
export function detectImageType(buffer: Buffer): string | null {
  return IMAGE_TYPES.find(([, check]) => check(buffer))?.[0] ?? null;
}

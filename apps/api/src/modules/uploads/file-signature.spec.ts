import { detectImageType, matchesFileSignature } from './file-signature';

const bytes = (...values: number[]) => Buffer.from(values);
const text = (value: string) => Buffer.from(value, 'latin1');
const pad = (buffer: Buffer) => Buffer.concat([buffer, Buffer.alloc(16)]);
const ftyp = (brand: string) =>
  pad(Buffer.concat([bytes(0, 0, 0, 0x18), text('ftyp'), text(brand)]));

const JPEG = pad(bytes(0xff, 0xd8, 0xff, 0xe0));
const PNG = pad(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a));
const WEBP = pad(
  Buffer.concat([text('RIFF'), bytes(0, 0, 0, 0), text('WEBP')]),
);
const HTML = text('<!doctype html><script>alert(1)</script>');
const EXE = pad(text('MZ'));

describe('파일 내용 시그니처 (SCRUM-173)', () => {
  it('사진은 실제 형식을 내용으로 알아낸다', () => {
    expect(detectImageType(JPEG)).toBe('image/jpeg');
    expect(detectImageType(PNG)).toBe('image/png');
    expect(detectImageType(WEBP)).toBe('image/webp');
    expect(detectImageType(pad(text('GIF89a')))).toBe('image/gif');
    expect(detectImageType(ftyp('heic'))).toBe('image/heic');
  });

  it('사진이 아닌 내용은 사진으로 보지 않는다 (HTML·실행 파일·동영상)', () => {
    expect(detectImageType(HTML)).toBeNull();
    expect(detectImageType(EXE)).toBeNull();
    expect(detectImageType(ftyp('isom'))).toBeNull();
    expect(detectImageType(Buffer.alloc(0))).toBeNull();
  });

  it('동영상은 mp4·mov·3gp 표기가 섞여도 받되, 사진(heic)이나 다른 파일은 거른다', () => {
    expect(matchesFileSignature('video/mp4', ftyp('isom'))).toBe(true);
    expect(matchesFileSignature('video/mp4', ftyp('qt  '))).toBe(true);
    expect(matchesFileSignature('video/quicktime', ftyp('qt  '))).toBe(true);
    expect(
      matchesFileSignature(
        'video/quicktime',
        pad(Buffer.concat([bytes(0, 0, 0, 8), text('wide')])),
      ),
    ).toBe(true);
    expect(matchesFileSignature('video/3gpp', ftyp('3gp4'))).toBe(true);
    expect(matchesFileSignature('video/mp4', ftyp('heic'))).toBe(false);
    expect(matchesFileSignature('video/mp4', JPEG)).toBe(false);
    expect(
      matchesFileSignature('video/webm', pad(bytes(0x1a, 0x45, 0xdf, 0xa3))),
    ).toBe(true);
  });

  it('문서는 형식별 시그니처를 본다', () => {
    expect(matchesFileSignature('application/pdf', text('%PDF-1.7\n'))).toBe(
      true,
    );
    expect(matchesFileSignature('application/pdf', HTML)).toBe(false);
    const ole = pad(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1));
    expect(matchesFileSignature('application/msword', ole)).toBe(true);
    expect(matchesFileSignature('application/x-hwp', ole)).toBe(true);
    const zip = pad(bytes(0x50, 0x4b, 0x03, 0x04));
    expect(
      matchesFileSignature(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        zip,
      ),
    ).toBe(true);
    expect(matchesFileSignature('application/msword', zip)).toBe(false);
  });

  it('텍스트는 NUL 바이트가 없으면 받는다 (한글 포함)', () => {
    expect(
      matchesFileSignature('text/plain', Buffer.from('셀 모임 안내\n', 'utf8')),
    ).toBe(true);
    expect(matchesFileSignature('text/plain', EXE)).toBe(false);
  });

  it('검사 규칙이 없는 형식은 받지 않는다', () => {
    expect(matchesFileSignature('image/svg+xml', text('<svg/>'))).toBe(false);
  });
});

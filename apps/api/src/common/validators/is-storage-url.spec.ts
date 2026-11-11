import { isStorageUrl, setStoragePublicPrefix } from './is-storage-url';

const PREFIX = 'https://ref.supabase.co/storage/v1/object/public/uploads/';

describe('사진·파일 주소 검증 (SCRUM-190)', () => {
  afterEach(() => setStoragePublicPrefix(null));

  it('우리 저장소 주소만 받는다', () => {
    setStoragePublicPrefix(PREFIX);
    expect(isStorageUrl(`${PREFIX}images/2026/11/a.jpg`)).toBe(true);
    expect(isStorageUrl('https://evil.example/tracker.gif')).toBe(false);
    expect(isStorageUrl(`${PREFIX}`)).toBe(false);
    expect(isStorageUrl(`${PREFIX}../other-bucket/x.jpg`)).toBe(false);
    expect(
      isStorageUrl(
        `https://ref.supabase.co/storage/v1/object/public/uploads-evil/x.jpg`,
      ),
    ).toBe(false);
    expect(isStorageUrl(42)).toBe(false);
  });

  it('null("사진 지우기")은 통과시킨다', () => {
    setStoragePublicPrefix(PREFIX);
    expect(isStorageUrl(null)).toBe(true);
  });

  it('저장소가 설정되지 않은 환경에서는 https 주소면 받는다', () => {
    expect(isStorageUrl('https://example.com/a.jpg')).toBe(true);
    expect(isStorageUrl('http://example.com/a.jpg')).toBe(false);
  });
});

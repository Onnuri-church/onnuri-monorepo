import { Controller, Get, Header } from '@nestjs/common';
import { POLICIES, type PolicyDocument } from '@onnuri/shared';

// 스토어 등록용 공개 웹 페이지 (SCRUM-194) — 개인정보처리방침·이용약관·계정 삭제 안내.
// Google Play·App Store는 앱 밖에서 열리는 주소를 요구한다. 앱 안의 상세보기와 같은 원문(@onnuri/shared)을
// 그대로 그려서, 문구를 고치면 앱과 웹이 함께 바뀐다. 로그인 없이 열리고 외부 리소스는 쓰지 않는다.
const CONTACT_EMAIL = 'onnuriyouth1234@gmail.com';

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · 부산온누리교회 청년부</title>
<style>
  body { margin: 0; background: #fff; color: #1b1d1c; font: 16px/1.7 -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", sans-serif; }
  main { max-width: 720px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  .date { color: #6b706d; font-size: 14px; margin-bottom: 28px; }
  h2 { font-size: 18px; margin: 28px 0 8px; }
  p, li { margin: 6px 0; }
  ul { padding-left: 20px; }
  a { color: #276e4c; }
  footer { margin-top: 48px; color: #6b706d; font-size: 14px; }
</style>
</head>
<body><main>${body}
<footer>부산온누리교회 청년부 · 문의 <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></footer>
</main></body>
</html>`;
}

function renderPolicy(doc: PolicyDocument): string {
  let html = `<h1>${escapeHtml(doc.title)}</h1><div class="date">시행일 ${escapeHtml(doc.effectiveDate)}</div>`;
  let inList = false;
  for (const block of doc.blocks) {
    if (block.type !== 'bullet' && inList) {
      html += '</ul>';
      inList = false;
    }
    if (block.type === 'heading') html += `<h2>${escapeHtml(block.text)}</h2>`;
    if (block.type === 'paragraph') html += `<p>${escapeHtml(block.text)}</p>`;
    if (block.type === 'bullet') {
      if (!inList) html += '<ul>';
      inList = true;
      html += `<li>${escapeHtml(block.text)}</li>`;
    }
  }
  if (inList) html += '</ul>';
  return page(doc.title, html);
}

const ACCOUNT_DELETION = page(
  '계정 삭제 안내',
  `<h1>계정 삭제 안내</h1>
<div class="date">부산온누리교회 청년부 앱</div>
<h2>앱에서 직접 삭제하기</h2>
<ul>
  <li>앱에 로그인한 뒤 <b>MY → 설정 → 회원탈퇴</b>를 누르면 바로 삭제됩니다.</li>
</ul>
<h2>앱을 쓸 수 없는 경우</h2>
<ul>
  <li><a href="mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('계정 삭제 요청')}">${CONTACT_EMAIL}</a>로 가입하신 이름과 로그인 방식(카카오·구글)을 적어 보내 주시면, 본인 확인 후 지체 없이 삭제해 드립니다.</li>
</ul>
<h2>삭제되는 정보와 보관 기간</h2>
<ul>
  <li>탈퇴하면 계정은 즉시 비활성화되고, 로그인 정보(카카오·구글 연결, 이메일)와 기기 알림 토큰은 즉시 삭제됩니다.</li>
  <li>생년월일·성별·연락처·프로필 사진·한 줄 소개는 탈퇴 후 30일이 지나면 파기합니다.</li>
  <li>출석 기록과 게시글·댓글은 청년부 운영 기록으로 탈퇴 후 1년간 보관하며, 이후 작성자를 알 수 없도록 처리합니다.</li>
</ul>
<p>자세한 내용은 <a href="/privacy">개인정보처리방침</a>을 확인해 주세요.</p>`,
);

@Controller()
export class PublicPagesController {
  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy(): string {
    return renderPolicy(POLICIES.privacyPolicy);
  }

  @Get('terms')
  @Header('Content-Type', 'text/html; charset=utf-8')
  terms(): string {
    return renderPolicy(POLICIES.terms);
  }

  @Get('account-deletion')
  @Header('Content-Type', 'text/html; charset=utf-8')
  accountDeletion(): string {
    return ACCOUNT_DELETION;
  }
}

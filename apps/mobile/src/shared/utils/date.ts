/** ISO 시각을 "38분 전"처럼 바꾼다. 상대 표기는 시간이 지나면 값이 변해서 서버가 문구로
 *  만들어 주면 캐시에 굳은 채로 남으므로, 서버는 ISO만 내리고 화면이 이걸 쓴다. */
export function toTimeAgo(isoDate: string): string {
  const minutes = Math.floor((Date.now() - new Date(isoDate).getTime()) / 60_000);
  if (minutes < 5) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

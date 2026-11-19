import { useState } from "react";

/**
 * 값이 null로 비워져도 마지막으로 있던 값을 돌려준다 (SCRUM-261).
 * "상태가 null이면 닫힘"으로 여닫는 모달은 닫는 순간 내용도 같이 비워져서, 사라지는 애니메이션
 * 동안 높이가 줄거나 글자가 빠진 채로 보인다. 그리는 쪽은 이 값으로, 여닫기는 원래 값으로 한다.
 */
export function useRetained<T>(value: T | null): T | null {
  const [last, setLast] = useState(value);
  if (value !== null && value !== last) setLast(value);
  return value ?? last;
}

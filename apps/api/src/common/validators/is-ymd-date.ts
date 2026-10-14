import { registerDecorator, type ValidationOptions } from 'class-validator';

// "YYYY-MM-DD" 형식이면서 달력에 실제로 있는 날짜인지 검사한다.
// @Matches(/^\d{4}-\d{2}-\d{2}$/)만 쓰면 2026-13-45 같은 값이 통과해 new Date가 Invalid Date가 되고,
// Prisma가 던지는 오류가 500으로 나간다 — 400으로 돌려보내려고 형식과 실제 날짜를 같이 본다.
export function isYmdDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function IsYmdDate(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isYmdDate',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName}는 존재하는 날짜(YYYY-MM-DD)여야 합니다.`,
        ...options,
      },
      validator: { validate: (value: unknown) => isYmdDate(value) },
    });
  };
}

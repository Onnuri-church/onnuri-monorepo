import {ComponentProps} from "react";
import {Chip} from "../../shared/components/base/Chip";

type ChipColor = ComponentProps<typeof Chip>["color"];

// 부서 키 → 칩 색. 목록 카드와 상세 화면이 같은 색을 써야 해서 한 곳에 둔다.
const DEPARTMENT_COLOR: Record<string, ChipColor> = {
    sns: "purple",
    praise: "blue",
    broadcast: "red",
    futsal: "yellow",
    design: "green",
    intercession: "orange",
    video: "indigo",
};

// 서버에 새 부서가 생겨도 칩이 안 죽게 하는 폴백.
const FALLBACK_COLOR: ChipColor = "purple";

export function getDepartmentColor(department: string): ChipColor {
    return DEPARTMENT_COLOR[department] ?? FALLBACK_COLOR;
}

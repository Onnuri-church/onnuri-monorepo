import {Text, View} from "react-native";
import {Chip} from "../../../shared/components/base/Chip";
import {getDepartmentColor} from "../departmentColor";

interface PostAuthorProps {
    authorName: string;
    // 부서 키. 서버가 주는 값이라 좁은 유니온으로 박지 않는다 — 모르는 값은 폴백 색으로 떨어진다.
    department: string;
    categoryName: string;
    /** 이미 가공된 표시용 문자열 (예: "05월 27일 · 38분 전"). 화면이 시간 계산을 하지 않는다. */
    date: string;
}

export function PostAuthor({authorName, department, categoryName, date} : PostAuthorProps) {
    return (
        <View className="flex flex-row justify-start items-center gap-2 mt-5">
            <View className="w-10 h-10 rounded-full bg-background-assistive"></View>
            <View>
                <View className="flex flex-row justify-start items-center gap-1">
                    <Text className="text-heading-small">{authorName}</Text>
                    <Chip color={getDepartmentColor(department)} text={categoryName}/>
                </View>
                <Text className="text-body-small text-text-alternative">{date}</Text>
            </View>
        </View>
    )
}

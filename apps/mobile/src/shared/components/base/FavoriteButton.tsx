import { Pressable, Text, View } from "react-native";
import {Icon} from "./Icon";
import {colors} from "../../theme/tokens";

// 사이즈별 확정값. 원 지름과 아이콘 크기를 한 줄에 묶어둔다 — 따로 두면 한쪽만 바뀌어
// 원 안에서 하트가 차지하는 비율이 깨진다.
const SIZE = {
    small: {button: "w-7 h-7", icon: 18},
    md: {button: "w-10 h-10", icon: 25},
} as const;

interface FavoriteButtonProps {
    count?: number,
    // 여백·정렬용이다. 버튼 크기는 size로 정한다 — 여기에 w-*/h-*를 주면 바깥 래퍼만
    // 커지고 원은 그대로라, 크기가 바뀐 것처럼 보이지 않는다.
    className?: string,
    size?: keyof typeof SIZE,
    // 내가 누른 상태인지. 채운 하트로 바뀐다. (DESIGN.md props 규칙상 상호작용 상태를 뜻하는
    // active는 쓰지 않는다 — 이건 눌리는 중이 아니라 데이터 상태다. Header의 bookmarked와 같은 결.)
    favorited?: boolean,
    onPress?: () => void
}

// 버튼 모양은 눌린 상태와 무관하게 같다 — 채운 하트(favorite-fill)로만 구분한다.
const buttonStyle = "flex items-center justify-center border border-semantic-info rounded-full bg-background-normal"

export function FavoriteButton({count, className, size = "small", favorited, onPress}: FavoriteButtonProps) {
    const {button, icon} = SIZE[size];

    return (
        <View className={`${className} flex-row items-center gap-1`}>
            <Pressable className={`${button} ${buttonStyle}`} onPress={onPress}>
                {/* 채운 하트 색은 아이콘이 아니라 여기서 정한다 — svgr이 SVG의 hex를
                    currentColor로 치환하므로 color prop이 그대로 먹는다. */}
                <Icon
                    name={favorited ? "favorite-fill" : "favorite-light"}
                    color={favorited ? colors.semantic.danger : colors.icon.strongest}
                    size={icon}
                />
            </Pressable>
            {count != null && count > 0 && <Text className="text-body-regular text-text-normal">{count}</Text>}
        </View>
    );
}

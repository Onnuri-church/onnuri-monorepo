import { Pressable, Text, View } from "react-native";
import {Icon} from "./Icon";
import {colors} from "../../theme/tokens";

interface FavoriteButtonProps {
    count?: number,
    className?: string,
    // 내가 누른 상태인지. 채운 하트로 바뀐다. (DESIGN.md props 규칙상 상호작용 상태를 뜻하는
    // active는 쓰지 않는다 — 이건 눌리는 중이 아니라 데이터 상태다. Header의 bookmarked와 같은 결.)
    favorited?: boolean,
    onPress?: () => void
}

// 버튼 모양은 눌린 상태와 무관하게 같다 — 채운 하트(favorite-fill)로만 구분한다.
const buttonStyle = "w-7 h-7 flex items-center justify-center border border-semantic-info rounded-full bg-background-normal"

export function FavoriteButton({count, className, favorited, onPress}: FavoriteButtonProps) {
    return (
        <View className={`${className} flex-row items-center gap-1`}>
            <Pressable className={buttonStyle} onPress={onPress}>
                {/* 채운 하트 색은 아이콘이 아니라 여기서 정한다 — svgr이 SVG의 hex를
                    currentColor로 치환하므로 color prop이 그대로 먹는다. */}
                <Icon
                    name={favorited ? "favorite-fill" : "favorite-light"}
                    color={favorited ? colors.semantic.danger : colors.icon.strongest}
                    size={18}
                />
            </Pressable>
            {count != null && count > 0 && <Text className="text-body-regular text-text-normal">{count}</Text>}
        </View>
    );
}

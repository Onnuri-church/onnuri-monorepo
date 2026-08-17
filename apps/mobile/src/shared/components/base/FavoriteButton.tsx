import { Pressable, Text, View } from "react-native";
import {Icon} from "./Icon";
import {colors} from "../../theme/tokens";

interface FavoriteButtonProps {
    count: number,
    className?: string,
    onPress?: () => void
}

export function FavoriteButton({count, className, onPress}: FavoriteButtonProps) {
    return (
        <View className={`${className} flex-row items-center gap-1`}>
            <Pressable className="w-7 h-7 flex items-center justify-center border border-semantic-info rounded-full" onPress={onPress}>
                <Icon name="favorite-light" color={colors.icon.strongest} size={18}/>
            </Pressable>
            <Text className="text-body-regular text-text-normal">{count}</Text>
        </View>
    );
}

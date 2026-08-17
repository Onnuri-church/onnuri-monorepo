import {Text, View} from "react-native";

export function CommentEmpty () {
    return (
        <View className="flex items-center justify-center min-h-36">
            <Text className="text-body-medium text-text-alternative text-center">아직 댓글이 없어요.{"\n"}
                가장 먼저 댓글을 남겨보세요.
            </Text>
        </View>
    )
}
import {ScrollView, View, Text} from "react-native";
import {FavoriteButton} from "../../shared/components/base/FavoriteButton";

export function QtBoardDetailScreen() {
    const handleFavoritePress = () => {

    }

    return (
        <View className="flex-1 bg-background-normal">
            <ScrollView>
                <View className="flex items-start justify-end pb-8 px-5 h-100 bg-background-assistive">
                    {/*이미지*/}

                    <View className="flex flex-row items-center justify-between w-full">
                        <View className="flex flex-row items-center justify-start gap-2">
                            <View className="w-10 h-10 bg-background-assistive rounded-full"></View>
                            <View>
                                <Text className="text-heading-small text-text-disable">원준호</Text>
                                <Text className="text-body-small text-text-disable">
                                    05월 27일 · 38분 전
                                </Text>
                            </View>
                        </View>

                        <FavoriteButton onPress={handleFavoritePress}/>
                    </View>
                </View>
                <View className="py-10 px-5">
                    <View className="flex items-center justify-center">
                        <Text className="text-heading-small text-text-normal text-center">절망, 자기 우상화의 열매{"\n"}룻기 2:16-23</Text>
                    </View>
                    <Text className="mt-12 text-body-regular text-text-neutral">[은혜받은 말씀]
                        룻기 1:17 	룻이 밭에서 저녁까지 줍고 그 주운 것을 떠니 보리가 한 에바쯤 되는지라</Text>
                </View>
            </ScrollView>
        </View>
    )
}

import {useNavigation} from "@react-navigation/native";
import type {NativeStackNavigationProp} from "@react-navigation/native-stack";
import {useLayoutEffect, useRef} from "react";
import {ScrollView, View, Text} from "react-native";
import {AppDialog, type AppDialogRef} from "../../shared/components/base/AppDialog";
import {FavoriteButton} from "../../shared/components/base/FavoriteButton";
import {Header} from "../../shared/components/base/Header";
import type {RootStackParamList} from "../../shared/types/navigation";

export function QtBoardDetailScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const dialogRef = useRef<AppDialogRef>(null);
    // 서버 연동 전 목업 — API가 붙으면 글 작성자 id와 내 id 비교로 교체한다.
    const isMine = true;

    // ⋮는 내 글일 때만 보이고 항목이 화면 데이터(작성자)에 의존하므로,
    // 등록부(RootNavigator)가 아니라 화면이 헤더를 단독 등록한다.
    useLayoutEffect(() => {
        navigation.setOptions({
            header: () => (
                <Header
                    variant="sub"
                    title="큐티나눔"
                    rightAction={isMine ? "more" : "none"}
                    menuItems={[
                        {
                            icon: "edit",
                            label: "수정하기",
                            onPress: () => navigation.navigate("QtBoardWrite"),
                        },
                        {
                            icon: "trash-can",
                            label: "삭제하기",
                            onPress: () => dialogRef.current?.open(),
                        },
                    ]}
                />
            ),
        });
    }, [navigation, isMine]);

    const confirmDelete = () => {
        // 서버 연동 전 — 삭제 API가 붙으면 여기서 호출하고 목록 캐시를 갱신한다.
        dialogRef.current?.close();
        navigation.goBack();
    };

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

            <AppDialog
                ref={dialogRef}
                title="정말 삭제하시겠습니까?"
                description="삭제된 데이터는 복구할 수 없습니다."
                confirmLabel="확인"
                cancelLabel="취소"
                onConfirm={confirmDelete}
            />
        </View>
    )
}

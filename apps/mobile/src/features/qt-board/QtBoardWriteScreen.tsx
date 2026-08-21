import {KeyboardAvoidingView, ScrollView, View} from "react-native";
import {useState} from "react";
import {DateField} from "../../shared/components/composed/DateField";
import {Field} from "../../shared/components/base/Field";
import {PhotoUploadBox} from "../../shared/components/base/PhotoUploadBox";
import {TextAreaField} from "../../shared/components/base/TextAreaField";
import {TextField} from "../../shared/components/base/TextField";
import {Button} from "../../shared/components/base/Button";

export function QtBoardWriteScreen () {
    const [selectDate, setSelectDate] = useState<string | null>(null)
    const [verse, setVerse] = useState("")
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")
    const [backgroundPhotoUri, setBackgroundPhotoUri] = useState<string | null>(null)
    const [bodyPhotoUri, setBodyPhotoUri] = useState<string | null>(null)

    const handleSubmitPress = () => {

    }

    return (
        <View className="flex-1 bg-background-normal">
            {/* 키보드 높이만큼 아래 패딩을 넣어 입력이 가려지지 않게 한다. Android도 필요하다 —
                SDK 57은 edge-to-edge가 항상 켜져 있어 OS가 화면을 줄여주지 않는다(adjustResize 무력화).
                (ProfileSetupScreen은 iOS만 처리하고 있어 같은 문제가 있을 것.) */}
            <KeyboardAvoidingView style={{flex: 1}} behavior="padding">
                <ScrollView
                    className="flex-1 h-full"
                    contentContainerClassName="justify-start pt-8 pb-20 px-5 gap-8"
                    keyboardShouldPersistTaps="handled"
                >
                    <DateField label="날짜" placeholder="날짜를 입력해주세요" value={selectDate} onChange={setSelectDate}/>

                    <View>
                        <Field label="사진">
                            <View className="flex-row items-start gap-4">
                                <PhotoUploadBox
                                    label="배경사진"
                                    imageUri={backgroundPhotoUri}
                                    onChange={setBackgroundPhotoUri}
                                />
                                <PhotoUploadBox
                                    label="본문사진"
                                    imageUri={bodyPhotoUri}
                                    onChange={setBodyPhotoUri}
                                />
                            </View>
                        </Field>
                    </View>

                    <View>
                        <TextField label="말씀" placeholder="예) 룻기 1:8-10" value={verse} onChangeText={setVerse}/>
                    </View>

                    <View>
                        <TextField label="제목" placeholder="제목을 입력해주세요." value={title} onChangeText={setTitle}/>
                    </View>

                    <View>
                        <TextAreaField
                            label="내용"
                            placeholder={"오늘 은혜받은 말씀을 기록해보세요!\n욕설 및 비방은 예고 없이 삭제될 수 있어요."}
                            value={content}
                            onChangeText={setContent}
                        />
                    </View>

                    <View className="mt-16">
                        <Button label="등록하기" onPress={handleSubmitPress}/>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}
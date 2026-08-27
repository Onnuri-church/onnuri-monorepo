import {KeyboardAvoidingView, ScrollView, View} from "react-native";
import {DateField, toDateString} from "../../shared/components/composed/DateField";
import {useState} from "react";
import {Field} from "../../shared/components/base/Field";
import {SelectField} from "../../shared/components/composed/SelectField";
import {TextAreaField} from "../../shared/components/base/TextAreaField";
import {Button} from "../../shared/components/base/Button";
import {TextField} from "../../shared/components/base/TextField";
import {ImageUploadBoxMultiple} from "../../shared/components/base/ImageUploadBoxMultiple";

// 부서 목록 API가 아직 없어서 임시 목록이다 — 실제 부서 목록 확정 시 교체한다.
const DEPARTMENTS = ["유치부", "유년부", "초등부", "중등부", "고등부"]

export function DepartmentActivityWriteScreen () {
    const [selectDate, setSelectDate] = useState<string | null>(toDateString(new Date()))
    const [department, setDepartment] = useState<string | null>(null)
    const [title, setTitle] = useState("")
    const [photoUris, setPhotoUris] = useState<string[]>([])
    const [content, setContent] = useState("")

    const handleSubmitPress = () => {

    }

    return (
        <View className="flex-1 bg-background-normal">
            <KeyboardAvoidingView style={{flex: 1}} behavior="padding">
                <ScrollView
                    className="flex-1 h-full"
                    contentContainerClassName="justify-start pt-8 pb-20 px-5 gap-8"
                    keyboardShouldPersistTaps="handled"
                >
                    <DateField label="날짜" placeholder="날짜를 입력해주세요" value={selectDate} onChange={setSelectDate}/>

                    <SelectField
                        label="부서"
                        placeholder="부서를 선택하세요."
                        options={DEPARTMENTS}
                        value={department}
                        onChange={setDepartment}
                    />

                    <Field label="사진(최대 5장)">
                        <ImageUploadBoxMultiple imageUris={photoUris} onChange={setPhotoUris}/>
                    </Field>

                    <TextField label="제목" placeholder="제목을 입력해주세요." value={title} onChangeText={setTitle}/>

                    <TextAreaField
                        label="내용"
                        placeholder={"오늘 은혜받은 말씀을 기록해보세요!\n욕설 및 비방은 예고 없이 삭제될 수 있어요."}
                        value={content}
                        onChangeText={setContent}
                    />

                    <View className="mt-16">
                        <Button label="등록하기" onPress={handleSubmitPress}/>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    )
}
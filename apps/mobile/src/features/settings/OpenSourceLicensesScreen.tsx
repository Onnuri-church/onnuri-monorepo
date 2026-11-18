import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Linking, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "../../shared/components/base/Icon";
import { colors } from "../../shared/theme/tokens";
import LICENSES from "./licenses.json";

interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  url: string | null;
  author: string | null;
}

// 자주 쓰이는 라이선스 전문. 나머지(Apache-2.0 등 긴 전문)는 SPDX 공식 문서로 연결한다.
const MIT_TEXT = `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const ISC_TEXT = `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;

const BSD_BASE = `Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.`;

const BSD_DISCLAIMER = `THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`;

const LICENSE_TEXTS: Record<string, string> = {
  MIT: MIT_TEXT,
  ISC: ISC_TEXT,
  "BSD-2-Clause": `${BSD_BASE}\n\n${BSD_DISCLAIMER}`,
  "BSD-3-Clause": `${BSD_BASE}\n\n3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.\n\n${BSD_DISCLAIMER}`,
};

// 오픈소스 라이선스 (SCRUM-238) — 앱이 쓰는 오픈소스 패키지와 라이선스. 목록(licenses.json)은
// 의존성을 바꿀 때 apps/mobile에서 스크립트로 다시 뽑는다. 누르면 저작권 표시와 전문이 펼쳐진다.
export function OpenSourceLicensesScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [openName, setOpenName] = useState<string | null>(null);
  const entries = LICENSES as LicenseEntry[];

  return (
    <FlatList
      className="bg-background-normal"
      data={entries}
      keyExtractor={(entry) => entry.name}
      contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
      ListHeaderComponent={
        <Text className="px-5 pb-2 pt-5 text-body-small text-text-alternative">
          {t(
            "온누리 온은 아래 오픈소스 소프트웨어를 사용해요. 각 소프트웨어의 라이선스를 따릅니다.",
          )}
        </Text>
      }
      renderItem={({ item }) => {
        const open = openName === item.name;
        const text = LICENSE_TEXTS[item.license];
        return (
          <View className="border-b border-background-assistive px-5 py-3">
            <Pressable
              className="flex-row items-center justify-between active:opacity-60"
              onPress={() => setOpenName(open ? null : item.name)}
            >
              <View className="flex-1 pr-3">
                <Text className="text-body-main text-text-normal">{item.name}</Text>
                <Text className="text-caption-main text-text-alternative">
                  {item.version} · {item.license}
                </Text>
              </View>
              <Icon
                name={open ? "arrow-drop-down" : "expand-right"}
                size={18}
                color={colors.icon.normal}
              />
            </Pressable>
            {open && (
              <View className="mt-2 gap-2">
                {item.author && (
                  <Text className="text-caption-main text-text-neutral">
                    Copyright (c) {item.author}
                  </Text>
                )}
                {item.url && (
                  <Text
                    className="text-caption-main text-primary-normal underline"
                    onPress={() => void Linking.openURL(item.url!)}
                  >
                    {item.url}
                  </Text>
                )}
                {text ? (
                  <Text className="text-caption-main text-text-alternative">{text}</Text>
                ) : (
                  <Text
                    className="text-caption-main text-primary-normal underline"
                    onPress={() =>
                      void Linking.openURL(
                        `https://spdx.org/licenses/${item.license.replace(/[()]/g, "").split(" ")[0]}.html`,
                      )
                    }
                  >
                    {t("{{license}} 전문 보기", { license: item.license })}
                  </Text>
                )}
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

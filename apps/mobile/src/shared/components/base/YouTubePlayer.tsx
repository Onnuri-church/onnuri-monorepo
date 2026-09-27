import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

// 유튜브 임베드는 요청에 Referer가 없으면 재생을 거부한다(오류 153). 앱 WebView에는 Referer가
// 없으므로 HTML을 이 주소에서 연 것처럼 띄워 붙게 한다 — 유튜브 가이드가 앱은 https://<앱 ID>를
// 쓰라고 한다. 값은 app.json의 android.package.
const EMBED_ORIGIN = "https://com.onnuri.mobile";

interface YouTubePlayerProps {
  videoId: string;
}

function buildHtml(videoId: string) {
  // 사용자가 재생 버튼을 누른 뒤에만 그려지므로 autoplay로 바로 튼다. playsinline이 없으면
  // iOS가 전체화면 플레이어로 튀어나간다.
  const src = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`;
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:transparent}iframe{border:0;width:100%;height:100%}</style>
</head><body><iframe src="${src}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;
}

// 유튜브 영상 플레이어 — WebView에 공식 iframe 임베드를 띄우는 얇은 래퍼. 크기는 부모가 정하고
// 여기서는 채우기만 한다. expo-video는 영상 파일 주소가 필요해 유튜브를 재생할 수 없다.
export function YouTubePlayer({ videoId }: YouTubePlayerProps) {
  return (
    <WebView
      source={{ html: buildHtml(videoId), baseUrl: EMBED_ORIGIN }}
      style={styles.webView}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  // 로딩 중에 흰 화면이 번쩍이지 않게 부모의 어두운 배경을 비춘다.
  webView: { flex: 1, backgroundColor: "transparent" },
});

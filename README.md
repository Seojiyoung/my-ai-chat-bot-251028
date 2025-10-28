# AI Chat with MCP Integration

Next.js 기반의 AI 채팅 애플리케이션으로 Model Context Protocol (MCP)을 통한 외부 도구 통합을 지원합니다.

## 주요 기능

- **AI 채팅**: Gemini 2.0 Flash 모델을 사용한 실시간 스트리밍 채팅
- **MCP 통합**: Model Context Protocol을 통한 외부 도구 연동
- **세션 관리**: 다중 채팅 세션 저장 및 관리
- **함수 호출 시각화**: AI가 사용하는 도구의 입력/출력을 실시간으로 확인
- **전역 연결 관리**: 페이지 이동 시에도 MCP 서버 연결 유지

## 시작하기

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 Gemini API 키를 설정하세요:

```bash
GEMINI_API_KEY=your_api_key_here
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 개발 서버 실행

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 애플리케이션을 확인할 수 있습니다.

## MCP 서버 설정

1. 헤더의 "MCP 설정" 버튼을 클릭합니다
2. "MCP 도구 사용" 토글을 활성화합니다
3. "서버 추가" 버튼으로 새 MCP 서버를 추가합니다
   - 예시: Weather MCP
   - 명령: `npx`
   - 인자: `-y @philschmid/weather-mcp`
4. 추가된 서버의 토글을 활성화하여 연결합니다

## 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **AI SDK**: [@google/genai](https://github.com/googleapis/js-genai)
- **MCP SDK**: [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/sdk)
- **UI**: shadcn/ui + Tailwind CSS
- **상태 관리**: React Hooks + localStorage

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

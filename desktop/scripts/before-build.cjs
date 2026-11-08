// electron-builder beforeBuild 훅 — false 를 돌려주면 앱(desktop/)의 node_modules 수집·재빌드를 하지 않는다.
//
// 왜: desktop/package.json 은 의존성이 하나도 없다. 그러면 electron-builder 가 desktop/ 에서 모듈을 못 찾고
// 저장소 루트로 넘어가, 화면용 의존성(React·Radix 등 수백 MB)을 app.asar 에 통째로 넣는다.
// main.cjs 는 electron·node 내장 모듈만 쓰므로 수집할 것이 없다. 서버 의존성은 extraResources 로 따로 넣는다.
module.exports = async function beforeBuild() {
  return false;
};

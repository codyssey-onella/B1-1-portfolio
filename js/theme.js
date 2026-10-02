/**
 * @file theme.js
 * @description 다크 모드 및 라이트 모드 전환과 로컬 스토리지(localStorage) 상태 영속화를 관리하는 모듈.
 */

// 로컬 스토리지에 테마 상태를 저장할 Key 상수
const THEME_STORAGE_KEY = 'theme';

// 지원하는 테마 값 열거형 상수
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark'
};

/**
 * 브라우저 저장소(localStorage)에서 사용자가 설정했던 테마를 조회한다.
 * 브라우저 보안 정책이나 시크릿 모드에서 발생할 수 있는 스토리지 접근 예외를 안전하게 방어한다.
 * 
 * @returns {string|null} 저장된 테마 문자열 ('light' | 'dark') 또는 null
 */
function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch (error) {
    console.warn('localStorage에 접근할 수 없어 기본 설정을 사용합니다:', error);
    return null;
  }
}

/**
 * 변경된 테마 설정을 브라우저 저장소(localStorage)에 영속화한다.
 * 페이지를 새로고침하거나 브라우저를 다시 열어도 이전 테마 설정이 유지되도록 한다.
 * 
 * @param {string} theme - 저장할 테마 값 ('light' | 'dark')
 */
function setStoredTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.warn('localStorage에 테마를 저장하지 못했습니다:', error);
  }
}

/**
 * 최상위 HTML 요소에 data-theme 속성을 적용하고 토글 버튼의 아이콘 및 접근성 레이블을 갱신한다.
 * 테마 상태 변경 시 화면 스타일과 접근성 메타데이터를 일관되게 동기화하는 단일 진입점 역할을 한다.
 * 
 * @param {string} theme - 적용할 테마 ('light' | 'dark')
 */
function applyTheme(theme) {
  const root = document.documentElement; // <html> 태그
  const toggleBtn = document.getElementById('theme-toggle');
  const iconSpan = toggleBtn ? toggleBtn.querySelector('.theme-icon') : null;

  root.setAttribute('data-theme', theme);

  if (toggleBtn && iconSpan) {
    const isDark = (theme === THEMES.DARK);
    iconSpan.textContent = isDark ? '☀️' : '🌙';
    toggleBtn.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환'); // screen reader
    // title 속성으로 2초 마우스오버 시 나타나는 툴팁을 만들 순 있는데, 브라우저 기본은 구리고 직접 만들긴 귀찮아 제외.
  }
}

/**
 * 현재 활성화된 테마를 반전(토글)하고, 변경 사항을 로컬 스토리지에 저장한 뒤 화면에 반영한다.
 * 사용자가 헤더의 테마 토글 버튼을 클릭했을 때 호출되는 이벤트 핸들러이다.
 */
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || THEMES.LIGHT;
  const nextTheme = (currentTheme === THEMES.DARK) ? THEMES.LIGHT : THEMES.DARK;

  setStoredTheme(nextTheme);
  applyTheme(nextTheme);
}

/**
 * 테마 관리 모듈의 초기화 함수.
 * 초기 테마를 판별하여 적용하고, 토글 버튼 클릭 이벤트를 바인딩한다.
 * 중복 호출 시에도 이벤트 리스너가 중복 등록되지 않도록 멱등성을 보장한다.
 */
let isThemeInitialized = false;

// script 로드 후 바로 실행 후 클릭 리스너 등록. 
function initTheme() {
  if (isThemeInitialized) {
    return;
  }
  isThemeInitialized = true;

  // 로컬 스토리지에 저장된 값이 없으면 기본 테마(라이트 모드)를 사용
  const initialTheme = getStoredTheme() || THEMES.LIGHT;
  applyTheme(initialTheme);

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleTheme);
  }
}

/** 스크립트 로드 시 바로 초기 테마를 판별하여 적용
 * 브라우저는 defer 스크립트를 모두 실행하기 전에는 화면 paint를 하지 않음. 
 * 따라서 paint 이전에 테마 정보를 적용해야 함.
 * 
 * 브라우저 렌더링 주기가 DOMContentLoaded 이벤트 콜백 실행보다 먼저 와버리면 flickering 발생 가능.
 * 
 * defer 끌어오는게 느려지면 브라우저가 렌더를 먼저 해서 의도치 않게 깜빡임이 발생해서
 * 아예 html head 상단에 inline script를 박는 방법도 있다 하는데. 지금은 이른 최적화 같아서 그냥 이대로 함.
*/
if (typeof document !== 'undefined' && document.documentElement) {
  const currentSaved = getStoredTheme() || THEMES.LIGHT;
  document.documentElement.setAttribute('data-theme', currentSaved);
}

// DOM 파싱 완료 시 버튼 이벤트 리스너 바인딩 수행
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    // onclick을 js에서 집어넣는 것도 가능은 하나, 역할분리 및 다중 리스너 등록을 위해 addEventListener 사용. 
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }
}

/**
 * @file projects.js
 * @description GitHub REST API를 비동기 호출하여 최신 저장소 목록을 조회하고,
 * 4가지 UI 상태(Loading, Success, Error, Empty)에 따라 카드를 동적으로 렌더링하는 모듈.
 */

// GitHub 사용자 식별자 및 API 엔드포인트 상수 정의
const GITHUB_USERNAME = 'vact19';
const GITHUB_API_URL = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=6`;

/**
 * XSS(Cross-Site Scripting) 공격 방지를 위해 특수문자를 HTML 엔티티로 치환하는 헬퍼 함수.
 * 
 * [역할 및 존재 이유]
 * 외부 API(GitHub)로부터 수신한 사용자 데이터(저장소 이름, 설명 등)를 DOM에 직접 주입할 때
 * 악의적인 스크립트 태그(<script>, <img> onError 등)가 실행되는 취약점을 사전에 무력화한다.
 * 
 * @param {string} str - 이스케이프할 원본 문자열
 * @returns {string} 안전하게 엔티티 변환된 문자열
 */
function escapeHtml(str) {
  if (typeof str !== 'string') {
    return '';
  }
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 단일 GitHub 저장소 객체를 받아 ES6 템플릿 리터럴 기반의 프로젝트 카드 HTML 문자열을 반환하는 함수.
 * 
 * [역할 및 존재 이유]
 * Java 8 Stream의 .map(repo -> toCardHtml(repo))과 같이,
 * DTO 성격의 저장소 객체에서 필요한 프로퍼티(이름, 링크, 설명, 언어, 스타 수)를 구조분해 할당으로 추출하고
 * 마크업 템플릿으로 가공하여 반환한다.
 * 
 * @param {Object} repo - GitHub REST API 저장소 응답 단건 객체
 * @returns {string} 완성된 프로젝트 카드 HTML 문자열
 */
function createProjectCard(repo) {
  // ES6 구조분해 할당(Destructuring Assignment)을 통한 필드 추출
  const {
    name,
    html_url: htmlUrl,
    description,
    stargazers_count: starsCount,
    language
  } = repo;

  // 필드 누락에 대비한 안전한 Fallback 텍스트 처리
  const safeName = escapeHtml(name);
  const safeDesc = description ? escapeHtml(description) : '등록된 프로젝트 설명이 없습니다.';
  const safeLang = language ? escapeHtml(language) : '기타';
  const displayStars = typeof starsCount === 'number' ? starsCount : 0;

  // ES6 템플릿 리터럴(Template Literal)로 HTML 문자열 조립
  return `
    <article class="project-card">
      <h3 class="project-card-title">
        <a href="${htmlUrl}" target="_blank" rel="noopener noreferrer">${safeName}</a>
      </h3>
      <p class="project-card-desc">${safeDesc}</p>
      <div class="project-card-meta">
        <span class="project-card-lang">${safeLang}</span>
        <span class="project-card-stars" aria-label="스타 ${displayStars}개">★ ${displayStars}</span>
      </div>
    </article>
  `;
}

/**
 * 1. 로딩(Loading) 상태 UI를 렌더링하는 함수.
 * 
 * [역할 및 존재 이유]
 * 네트워크 비동기 요청이 완료되기 전까지 사용자에게 진행 상태를 시각적 스피너와 안내문으로 제공하여
 * 화면 멈춤(Freezing)으로 인한 이탈을 방지하고 작업 진행 중임을 인지시킨다.
 * 
 * @param {HTMLElement} container - 렌더링 대상 컨테이너 요소
 */
function renderLoadingState(container) {
  container.innerHTML = `
    <div class="project-state-message" role="status">
      <div class="spinner" aria-hidden="true"></div>
      <p>GitHub 프로젝트 목록을 불러오는 중입니다...</p>
    </div>
  `;
}

/**
 * 2. 성공(Success) 상태 UI를 렌더링하는 함수.
 * 
 * [역할 및 존재 이유]
 * 비동기 API 통신으로 수신한 저장소 배열을 Array.prototype.map() 메서드를 통해
 * 순수 카드 마크업 리스트로 변환하고 DOM에 일괄 주입한다.
 * 
 * @param {HTMLElement} container - 렌더링 대상 컨테이너 요소
 * @param {Array<Object>} repos - GitHub 저장소 객체 배열
 */
function renderSuccessState(container, repos) {
  // map으로 각 요소를 카드 HTML로 변환 후 join('')으로 단일 문자열로 병합
  const cardsHtml = repos.map((repo) => createProjectCard(repo)).join('');
  container.innerHTML = cardsHtml;
}

/**
 * 3. 빈 데이터(Empty) 상태 UI를 렌더링하는 함수.
 * 
 * [역할 및 존재 이유]
 * API 응답은 정상이지만 계정에 공개 저장소가 없거나 필터 결과가 0건일 때,
 * 텅 빈 화면 대신 직관적인 안내문을 렌더링하여 사용자 혼선을 방지한다.
 * 
 * @param {HTMLElement} container - 렌더링 대상 컨테이너 요소
 */
function renderEmptyState(container) {
  container.innerHTML = `
    <div class="project-state-message">
      <p>표시할 프로젝트가 없습니다.</p>
    </div>
  `;
}

/**
 * 4. 에러(Error) 상태 UI를 렌더링하고 [다시 시도] 이벤트를 바인딩하는 함수.
 * 
 * [역할 및 존재 이유]
 * 403 Rate Limit 초과, 500 서버 장애, 네트워크 단절 등 예외 상황 발생 시
 * 상세 원인을 사용자에게 안내하고 재시도(Retry) 버튼을 제공하여 복구 경로를 마련한다.
 * 
 * @param {HTMLElement} container - 렌더링 대상 컨테이너 요소
 * @param {string} errorMessage - 사용자에게 안내할 에러 사유 문구
 * @param {Function} onRetry - [다시 시도] 버튼 클릭 시 재실행할 콜백 함수
 */
function renderErrorState(container, errorMessage, onRetry) {
  container.innerHTML = `
    <div class="project-state-message error" role="alert">
      <p><strong>프로젝트를 불러올 수 없습니다.</strong></p>
      <p class="error-detail">${escapeHtml(errorMessage)}</p>
      <button type="button" id="projects-retry-btn" class="btn btn-secondary retry-btn">
        다시 시도
      </button>
    </div>
  `;

  // 다시 시도 버튼 클릭 이벤트 리스너 바인딩
  const retryBtn = document.getElementById('projects-retry-btn');
  if (retryBtn && typeof onRetry === 'function') {
    retryBtn.addEventListener('click', () => {
      onRetry();
    });
  }
}

/**
 * GitHub REST API를 비동기로 호출하고 상태 머신에 따라 적절한 UI 렌더링 함수를 분기 실행하는 함수.
 * 
 * [역할 및 존재 이유]
 * Java의 WebClient 비동기 통신 및 예외 처리 흐름과 동일하게,
 * fetch()와 async/await 구문으로 Non-blocking I/O 통신을 수행한다.
 * HTTP 응답 상태 코드(403 Rate Limit, 4xx, 5xx) 및 데이터 건수에 따라
 * Loading -> Success / Empty / Error의 4가지 상태 전이를 총괄한다.
 * 
 * @param {HTMLElement} container - 프로젝트 목록이 렌더링될 부모 DOM 컨테이너
 */
async function fetchProjects(container) {
  // 1단계: 로딩 상태 렌더링
  renderLoadingState(container);

  try {
    // 로딩 스피너 UI 시각적 확인을 위한 1초 인위적 지연 (테스트 후 필요시 제거 가능)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2단계: 외부 GitHub REST API 비동기 호출
    const response = await fetch(GITHUB_API_URL);

    // 403 Rate Limit(시간당 60회 제한) 감지 및 명시적 에러 처리
    if (response.status === 403) {
      throw new Error('GitHub API 호출 한도(시간당 60회)가 초과되었습니다. 잠시 후 다시 시도해 주세요.');
    }

    // 기타 HTTP 비정상 응답 처리 (404, 500 등)
    if (!response.ok) {
      throw new Error(`GitHub 서버 응답 오류가 발생했습니다. (상태 코드: ${response.status})`);
    }

    // JSON 파싱 비동기 대기
    const repos = await response.json();

    // 3단계: 빈 배열 여부 검사 후 Empty 또는 Success 상태 분기
    if (!Array.isArray(repos) || repos.length === 0) {
      renderEmptyState(container);
    } else {
      renderSuccessState(container, repos);
    }
  } catch (error) {
    // 4단계: 통신 장애 및 예외 발생 시 에러 상태 렌더링 (재시도 콜백 전달)
    const displayMessage = error.message || '네트워크 연결 상태를 확인해 주세요.';
    renderErrorState(container, displayMessage, () => {
      fetchProjects(container);
    });
  }
}

/**
 * Projects 섹션의 비동기 연동을 총괄 시작하는 진입 초기화 함수.
 * 
 * [역할 및 존재 이유]
 * DOM에서 `#projects-container` 요소를 탐색하고 유효한 경우 최초 1회 저장소 조회를 트리거한다.
 */
function initProjects() {
  const container = document.getElementById('projects-container');
  if (!container) {
    return;
  }

  fetchProjects(container);
}

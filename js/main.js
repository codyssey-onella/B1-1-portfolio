/**
 * @file main.js
 * @description 애플리케이션 메인 진입점 및 사용자 인터랙션 관리 모듈.
 * 햄버거 메뉴, 부드러운 스크롤, 스크롤 기반 UI 전환(헤더/상단 이동 버튼),
 * IntersectionObserver를 활용한 진입 애니메이션을 초기화하고 제어한다.
 */

/**
 * 모바일 화면에서 내비게이션 메뉴의 열림/닫힘 상태를 제어하는 햄버거 메뉴 초기화 함수.
 * 
 * [역할 및 존재 이유]
 * 화면 폭이 좁은 모바일 환경(768px 미만)에서는 공간 제약으로 메뉴가 숨겨진다.
 * 사용자가 햄버거 버튼을 클릭했을 때 메뉴 드롭다운을 토글하고,
 * 웹 접근성(ARIA) 상태를 동기화하여 스크린 리더 사용자에게도 현재 UI 상태를 전달한다.
 * 메뉴 링크 클릭, 메뉴 외부 클릭, ESC 키 입력 시 메뉴를 자동으로 닫아 사용자 경험을 개선한다.
 */
function initHamburgerMenu() {
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (!menuToggle || !navMenu) {
    return;
  }

  // 메뉴 열림/닫힘 상태 변경 및 접근성 속성 동기화 헬퍼 함수
  const setMenuState = (isOpen) => {
    navMenu.classList.toggle('active', isOpen); // force true -> 무조건 추가(set.add(true)), false-> 무조건 삭제(set.remove(false))
    menuToggle.classList.toggle('active', isOpen);
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
  };

  // 1. 햄버거 토글 버튼 클릭 이벤트
  menuToggle.addEventListener('click', (event) => {
    event.stopPropagation();
    const willOpen = !navMenu.classList.contains('active');
    setMenuState(willOpen); // 화살표 함수로 선언해둔 함수 호출.
  });

  // 아래는 클릭, 외부클릭, ESC키를 감지하여 메뉴를 닫는 이벤트 리스너들.
  // 햄버거 메뉴가 열렸을 때 사용자가 다른 곳을 클릭 / 메뉴 외부를 클릭 / ESC 키를 누르면 메뉴가 닫힌다.

  // 2. 내비게이션 링크 클릭 시 모바일 메뉴 자동 닫기
  const navLinks = navMenu.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      if (navMenu.classList.contains('active')) {
        setMenuState(false);
      }
    });
  });

  // 3. 메뉴 외부 영역 클릭 시 닫기
  document.addEventListener('click', (event) => {
    if (navMenu.classList.contains('active') && !navMenu.contains(event.target) && !menuToggle.contains(event.target)) {
      setMenuState(false);
    }
  });

  // 4. ESC 키 입력 시 메뉴 닫기 및 포커스 복원 (키보드 접근성 준수)
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navMenu.classList.contains('active')) {
      setMenuState(false);
      menuToggle.focus();
    }
  });
}

/**
 * 페이지 내 앵커(#) 링크 클릭 시 목표 섹션으로 부드럽게 스크롤 이동시키는 초기화 함수.
 * 
 * [역할 및 존재 이유]
 * 기본 브라우저 해시 이동(순간 점프) 대신 부드러운 스크롤 애니메이션(smooth scroll)을 제공하여
 * 사용자가 현재 읽고 있는 페이지의 맥락과 위치 변화를 자연스럽게 인지하도록 돕는다.
 * 브라우저 히스토리(history.pushState)에 목표 해시를 반영하여 뒤로가기 탐색도 온전히 지원한다.
 */
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') {
        return;
      }

      const targetElement = document.querySelector(targetId);
      if (!targetElement) {
        return;
      }

      event.preventDefault();
      targetElement.scrollIntoView({
        behavior: 'smooth'
      });

      // 주소창 URL 해시 동기화 (preventdefault()로 인해 URL 갱신까지 같이 차단되므로 주소창 url 스택에 추가. url 공유 및 뒤로가기 지원.)
      if (window.history.pushState) {
        window.history.pushState(null, '', targetId);
      }
    });
  });
}

/**
 * 윈도우 스크롤 위치에 따라 헤더 스타일과 최상단 이동(Scroll-to-top) 버튼 노출을 제어하는 초기화 함수.
 * 
 * [역할 및 존재 이유]
 * 1. 스크롤 60px 초과 시 헤더에 .scrolled 클래스를 추가하여 배경색과 하단 그림자를 변경함으로써,
 *    본문 콘텐츠와 고정 헤더 간의 시각적 분리도를 향상시킨다.
 * 2. 스크롤 300px 초과 시 최상단 이동 플로팅 버튼을 노출시켜, 긴 본문을 탐색한 사용자가
 *    손쉽게 페이지 처음으로 복귀할 수 있는 내비게이션 편의를 제공한다.
 * 브라우저 렌더링 성능을 위해 passive 옵션의 이벤트 리스너를 활용한다.
 */
function initScrollEffects() {
  const header = document.getElementById('header');
  const scrollTopBtn = document.getElementById('scroll-top-btn');

  // 스크롤 임계값 상수 정의
  const HEADER_SCROLL_THRESHOLD = 60;
  const TOP_BUTTON_SCROLL_THRESHOLD = 300;

  const handleScroll = () => {
    const currentScrollY = window.scrollY || window.pageYOffset;

    // 1. 헤더 스타일 전환 (60px 초과 시)
    if (header) {
      if (currentScrollY > HEADER_SCROLL_THRESHOLD) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }

    // 2. 상단 이동 버튼 노출/숨김 (300px 초과 시)
    if (scrollTopBtn) {
      if (currentScrollY > TOP_BUTTON_SCROLL_THRESHOLD) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    }
  };

  // passive: true 옵션으로 스크롤 스레드가 메인 스레드 끝날 때까지 블락되는 것을 방지
  window.addEventListener('scroll', handleScroll, { passive: true });

  // 상단 이동 버튼 클릭 시 맨 위로 부드럽게 스크롤
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  // 새로고침 시 이미 스크롤된 상태인 경우 초기 스타일 즉각 반영
  handleScroll();
}

/**
 * IntersectionObserver API를 사용하여 스크롤다운 시 각 section 요소가 천천히 올라오도록
 * 각 섹션이 뷰포트에 20% 이상 진입할 때 페이드인 애니메이션을 적용하는 초기화 함수.
 * 
 * [역할 및 존재 이유]
 * 전통적인 scroll 이벤트 기반 위치 계산(getBoundingClientRect)은 메인 스레드에서
 * 잦은 리플로우(Reflow)를 유발하여 성능 저하를 초래한다.
 * 브라우저 내장 관찰자 패턴인 IntersectionObserver를 활용하여 뷰포트 교차 비율이 0.2(20%)에
 * 도달했을 때 비동기적으로 .is-visible 클래스를 추가하고, 1회 노출 후 관찰을 해제(unobserve)하여
 * 불필요한 연산 낭비를 방지한다.
 */
function initScrollObserver() {
  const sections = document.querySelectorAll('.section');

  if (sections.length === 0) {
    return;
  }

  // IntersectionObserver 미지원 구형 브라우저 대비 폴백(Fallback)
  if (!('IntersectionObserver' in window)) {
    sections.forEach((section) => section.classList.add('is-visible'));
    return;
  }

  // 콜백 및 콜백 실행할 옵션을 등록하여 section class를 가진 DOM에 등록

  // 옵션: 요소가 화면에 20% 이상 노출되었을 때 콜백 트리거
  const observerOptions = {
    root: null, // 브라우저 뷰포트 기준
    rootMargin: '0px',
    threshold: 0.2 // 20% 임계값
  };

  const observerCallback = (entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        // 애니메이션은 최초 1회만 실행되도록 관찰 해제
        observer.unobserve(entry.target);
      }
    });
  };

  const observer = new IntersectionObserver(observerCallback, observerOptions);

  sections.forEach((section) => {
    observer.observe(section);
  });
}

/**
 * Step 5에서 정의된 모든 사용자 인터랙션 모듈을 묶어 초기화하는 진입 함수.
 * 개별 인터랙션 로직 간의 결합도를 낮추고 순차적으로 바인딩한다.
 */
function initInteractions() {
  initHamburgerMenu();
  initSmoothScroll();
  initScrollEffects();
  initScrollObserver();
}

/**
 * 단일 입력 필드의 유효성을 검증하여 검증 결과와 에러 메시지를 반환하는 함수.
 * 
 * [역할 및 존재 이유]
 * 백엔드의 Bean Validation(JSR-380, @NotBlank, @Email)과 동일하게,
 * 각 입력 필드의 비즈니스 규칙(필수값 여부, 공백 제거, 이메일 정규식 포맷 등)을 평가한다.
 * 검증 로직을 단일 함수로 캡슐화하여 폼 제출(submit) 시점과 실시간 입력(input) 시점에
 * 동일한 규칙을 재사용할 수 있도록 보장한다.
 * 
 * @param {HTMLInputElement | HTMLTextAreaElement} field - 검증 대상 폼 입력 요소
 * @returns {{ isValid: boolean, message: string }} 검증 통과 여부 및 실패 시 안내 메시지 객체
 */
function validateField(field) {
  const value = field.value.trim();
  const fieldName = field.getAttribute('name');

  // 1. 이름 필드 검증: 빈 값(공백 포함) 불가
  if (fieldName === 'name') {
    if (value === '') {
      return { isValid: false, message: '성함 / 담당자명을 입력해 주세요.' };
    }
    return { isValid: true, message: '' };
  }

  // 2. 이메일 필드 검증: 빈 값 불가 및 RFC 표준 정규표현식 포맷 검증
  if (fieldName === 'email') {
    if (value === '') {
      return { isValid: false, message: '이메일 주소를 입력해 주세요.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { isValid: false, message: '올바른 이메일 형식을 입력해 주세요. (예: user@example.com)' };
    }
    return { isValid: true, message: '' };
  }

  // 3. 메시지 필드 검증: 빈 값(공백 포함) 불가
  if (fieldName === 'message') {
    if (value === '') {
      return { isValid: false, message: '문의 내용을 입력해 주세요.' };
    }
    return { isValid: true, message: '' };
  }

  return { isValid: true, message: '' };
}

/**
 * 특정 입력 필드에 에러 상태를 시각적/접근성 속성으로 반영하고 에러 문구를 표시하는 함수.
 * 
 * [역할 및 존재 이유]
 * Spring의 BindingResult에 담긴 FieldError를 화면 템플릿에 출력하듯,
 * 입력 요소에 에러 CSS 클래스(.is-invalid)와 접근성 속성(aria-invalid="true")을 부여하고,
 * 대응되는 에러 메시지 컨테이너(.field-error)에 안내 텍스트를 주입한다.
 * 
 * @param {HTMLInputElement | HTMLTextAreaElement} field - 에러를 표시할 입력 요소
 * @param {string} message - 사용자에게 노출할 에러 안내 문구
 */
function setFieldError(field, message) {
  const fieldName = field.getAttribute('name');
  const errorContainer = document.getElementById(`error-${fieldName}`);

  field.classList.add('is-invalid');
  field.setAttribute('aria-invalid', 'true');

  if (errorContainer) {
    errorContainer.textContent = message;
  }
}

/**
 * 특정 입력 필드의 에러 상태를 제거하고 에러 메시지를 초기화하는 함수.
 * 
 * [역할 및 존재 이유]
 * 사용자가 올바른 값을 입력했을 때 시각적 경고(.is-invalid 테두리)와 에러 텍스트를 즉시 해제하여
 * 피드백 루프를 완성하고 정상적인 폼 전송이 가능함을 시각적으로 안내한다.
 * 
 * @param {HTMLInputElement | HTMLTextAreaElement} field - 에러를 초기화할 입력 요소
 */
function clearFieldError(field) {
  const fieldName = field.getAttribute('name');
  const errorContainer = document.getElementById(`error-${fieldName}`);

  field.classList.remove('is-invalid');
  field.setAttribute('aria-invalid', 'false');

  if (errorContainer) {
    errorContainer.textContent = '';
  }
}

/**
 * Contact 문의 폼의 이벤트 바인딩 및 제출/입력 유효성 검사를 총괄하는 초기화 함수.
 * 
 * [역할 및 존재 이유]
 * 1. submit 이벤트: 브라우저 기본 전송 동작을 가로채고(event.preventDefault()),
 *    전체 필드를 일괄 검증한 후 성공/에러 상태에 따른 UI 피드백을 동적으로 렌더링한다.
 * 2. input 이벤트: 실시간 사용자 타이핑 시점에 에러 상태를 점진적으로 해소하여
 *    사용자 경험(UX)을 향상시킨다.
 * 3. 폼 상태 머신: 전송 성공 시 폼 초기화(form.reset()) 및 성공 알림창 노출을 관장한다.
 */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) {
    return;
  }

  const fields = Array.from(form.querySelectorAll('.form-input, .form-textarea'));
  const statusContainer = document.getElementById('form-status');

  // 상태 메시지 표시 헬퍼 함수 (인라인 스타일 없이 CSS 클래스로 제어)
  const showFormStatus = (type, message) => {
    if (!statusContainer) return;
    statusContainer.className = `form-status ${type}`;
    statusContainer.textContent = message;
  };

  // 상태 메시지 초기화 헬퍼 함수
  const clearFormStatus = () => {
    if (!statusContainer) return;
    statusContainer.className = 'form-status';
    statusContainer.textContent = '';
  };

  // 1. 실시간 입력(input) 이벤트 리스너 등록: 사용자가 수정 중일 때 실시간 에러 피드백
  fields.forEach((field) => {
    field.addEventListener('input', () => {
      // 폼 전체 상태 메시지가 있다면 수정 시작 시 제거
      clearFormStatus();

      // 필드가 현재 에러 상태인 경우, 유효한 값 입력 시 실시간으로 에러 해제
      if (field.classList.contains('is-invalid')) {
        const { isValid, message } = validateField(field);
        if (isValid) {
          clearFieldError(field);
        } else {
          setFieldError(field, message);
        }
      }
    });
  });

  // 2. 폼 제출(submit) 이벤트 리스너 등록
  form.addEventListener('submit', (event) => {
    // 서블릿 컨테이너의 기본 폼 전송 파이프라인 가로채기 (페이지 새로고침 방지)
    event.preventDefault();
    clearFormStatus();

    let isFormValid = true;
    let firstInvalidField = null;

    // 모든 필드 순회하며 유효성 검증
    fields.forEach((field) => {
      const { isValid, message } = validateField(field);

      if (!isValid) {
        setFieldError(field, message);
        isFormValid = false;
        if (!firstInvalidField) {
          firstInvalidField = field;
        }
      } else {
        clearFieldError(field);
      }
    });

    // 유효성 검증 실패 시: 첫 번째 에러 필드로 포커스 이동
    if (!isFormValid) {
      if (firstInvalidField) {
        firstInvalidField.focus();
      }
      return;
    }

    // 모든 검증 통과 시: 성공 상태 반영 및 폼 초기화
    showFormStatus('success', '소중한 메시지가 성공적으로 전송되었습니다. 빠른 시일 내에 회신드리겠습니다.');
    form.reset();

    // 폼 초기화 후 모든 필드의 에러/접근성 상태 완전 초기화
    fields.forEach((field) => clearFieldError(field));
  });
}

// DOM 파싱이 완료된 시점에 인터랙션 및 폼 모듈 구동
document.addEventListener('DOMContentLoaded', () => {
  console.log('Portfolio application initialized.');

  // Step 5: 사용자 인터랙션 초기화
  initInteractions();

  // Step 6: Contact 폼 유효성 검사 초기화
  initContactForm();

  // Step 7: GitHub REST API 연동 및 상태 머신 초기화 예정
});

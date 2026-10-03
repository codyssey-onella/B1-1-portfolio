/**
 * @file contact.js
 * @description Contact 섹션의 사용자 문의 폼 유효성 검사 및 피드백 제어 모듈.
 * 폼 제출(submit) 가로채기(preventDefault), 이름/이메일(정규식)/메시지 제약조건 검증,
 * 실시간 입력(input) 에러 해제, 성공 알림 및 폼 초기화(reset)를 담당한다.
 */

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
